// Real loopback HTTP, WebSocket, disk and watcher; ADB/UDP remain fixture-only.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { performance, monitorEventLoopDelay } = require('node:perf_hooks');
const createHarness = require('./helpers/server-harness');
const workspace = path.resolve(__dirname, '..');
const output = path.join(workspace, '.validation');
fs.mkdirSync(output, { recursive: true });
const root = fs.mkdtempSync(path.join(output, 'local-validation-'));
const result = { node: process.version, scope: 'Synthetic local fixture; no phone, real ADB or before/after device comparison', disk: [], lifecycle: [], windows: [] };
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] || 0;
async function freePort() {
    const server = net.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function start(directory) {
    fs.mkdirSync(directory, { recursive: true });
    const h = createHarness({ diskRoot: directory, http: true, live: true, wsReal: true,
        watch: (...args) => require('chokidar').watch(...args), env: { PORT: String(await freePort()) },
        command: args => args[0] === 'devices' ? 'List of devices attached' : '' });
    await h.eval('module.exports.startup'); return h;
}
async function stop(h) {
    await h.eval('shutdown()');
    assert.equal(h.server.listening, false);
    assert.equal(h.eval('ownedAdbProcesses.size'), 0);
    assert.equal(h.wss.clients.size, 0);
}
async function main() {
    for (let cycle = 0; cycle < 20; cycle++) {
        const h = await start(path.join(root, 'cycle-' + cycle));
        const health = await fetch('http://127.0.0.1:' + h.server.address().port + '/api/health').then(response => response.json());
        assert.equal(health.ready, true); await stop(h);
        result.lifecycle.push({ cycle: cycle + 1, ready: true, stopped: true });
    }
    console.log('20 isolated server/watcher/HTTP/WS lifecycle cycles passed.');
    for (const count of [100, 1000, 10000]) {
        const directory = path.join(root, 'files-' + count); const received = path.join(directory, 'received');
        fs.mkdirSync(received, { recursive: true });
        for (let n = 0; n < count; n++) fs.writeFileSync(path.join(received, 'fixture-' + n + '.txt'), 'fixture');
        fs.writeFileSync(path.join(received, '.gitkeep'), ''); fs.writeFileSync(path.join(received, 'incomplete.part'), 'partial');
        const started = performance.now(); const h = await start(directory);
        result.disk.push({ files: count, startupMs: performance.now() - started, indexed: h.eval('transfersList.length') });
        assert.equal(h.eval('transfersList.some(item=>item.filename.endsWith(".part")||item.filename===".gitkeep")'), false);
        if (count !== 10000) { await stop(h); continue; }
        const port = h.server.address().port; const base = 'http://127.0.0.1:' + port;
        const cookie = 'brq_admin=' + h.eval('adminSession');
        const history = fs.readFileSync(path.join(directory, 'transfers.json'));
        const sockets = []; const latency = []; const transferLatency = [];
        const delay = monitorEventLoopDelay({ resolution: 20 }); delay.enable();
        const cpu = process.cpuUsage(); const startedAt = performance.now();
        for (let second = 0; second < 300; second++) {
            const wanted = second < 150 ? 1 : 5;
            while (sockets.length < wanted) {
                const ws = new (require('ws'))('ws://127.0.0.1:' + port, { headers: { host: 'localhost:' + port, cookie } });
                sockets.push(ws); await once(ws, 'open');
            }
            let tick = performance.now();
            await fetch(base + '/api/health').then(response => response.json()); latency.push(performance.now() - tick);
            tick = performance.now();
            await fetch(base + '/api/transfers', { headers: { host: 'localhost:' + port, cookie } }).then(response => response.json()); transferLatency.push(performance.now() - tick);
            if ((second + 1) % 30 === 0) {
                const metric = { elapsedSeconds: second + 1, clients: wanted, rss: process.memoryUsage().rss, heap: process.memoryUsage().heapUsed,
                    adbQueries: h.commands.filter(args => args[0] === 'devices').length, activeResources: process.getActiveResourcesInfo().length,
                    maxBufferedBytes: Math.max(0, ...[...h.wss.clients].map(ws => ws.bufferedAmount)) };
                result.windows.push(metric); console.log(JSON.stringify(metric));
            }
            await new Promise(resolve => setTimeout(resolve, Math.max(0, startedAt + (second + 1) * 1000 - performance.now())));
        }
        delay.disable(); const usage = process.cpuUsage(cpu);
        result.idle = { durationSeconds: (performance.now() - startedAt) / 1000, healthP95Ms: percentile(latency, .95), healthP99Ms: percentile(latency, .99),
            transfersP95Ms: percentile(transferLatency, .95), eventLoopP95Ms: delay.percentile(95) / 1e6, eventLoopP99Ms: delay.percentile(99) / 1e6,
            cpuUserMs: usage.user / 1000, cpuSystemMs: usage.system / 1000 };
        assert.ok(fs.readFileSync(path.join(directory, 'transfers.json')).equals(history), 'GET/WS changed persisted history');
        for (const socket of sockets) socket.terminate(); await stop(h);
    }
    fs.writeFileSync(path.join(output, 'local-validation.json'), JSON.stringify(result, null, 2));
    console.log('Local validation complete; .validation/local-validation.json');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    assert.equal(path.dirname(root), output); assert.ok(path.basename(root).startsWith('local-validation-'));
    fs.rmSync(root, { recursive: true, force: true });
});
