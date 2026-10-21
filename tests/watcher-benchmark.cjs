const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const parent = path.resolve(__dirname, '../.validation');
fs.mkdirSync(parent, { recursive: true });
const root = fs.mkdtempSync(path.join(parent, 'watcher-benchmark-'));
const directory = path.join(root, 'files'); fs.mkdirSync(directory);
async function main() {
    for (let n = 0; n < 10000; n++) fs.writeFileSync(path.join(directory, 'fixture-' + n + '.txt'), 'fixture');
    const results = [];
    for (const usePolling of [true, false]) {
        const watcher = require('chokidar').watch(directory, { ignoreInitial: true, usePolling, interval: 600,
            awaitWriteFinish: { stabilityThreshold: 1200, pollInterval: 300 } });
        try {
            await once(watcher, 'ready');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const cpu = process.cpuUsage(); const start = performance.now();
            await new Promise(resolve => setTimeout(resolve, 3000));
            const usage = process.cpuUsage(cpu); const idleMs = performance.now() - start;
            const added = once(watcher, 'add'); const written = performance.now();
            const file = path.join(directory, usePolling ? 'polling.apk' : 'native.apk'); fs.writeFileSync(file, 'fixture'); await added;
            results.push({ usePolling, files: 10000, idleMs, cpuMs: (usage.user + usage.system) / 1000, detectionMs: performance.now() - written });
        } finally { await watcher.close(); }
    }
    fs.writeFileSync(path.join(parent, 'watcher-benchmark.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    assert.equal(path.dirname(root), parent); assert.ok(path.basename(root).startsWith('watcher-benchmark-'));
    fs.rmSync(root, { recursive: true, force: true });
});
