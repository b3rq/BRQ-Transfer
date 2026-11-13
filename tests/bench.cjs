// Throughput benchmark for the transfer paths that do not need a phone.
//
//   npm run bench                      -> phone->PC resumable upload and PC->phone download over loopback
//   BRQ_BENCH_MB=1024 npm run bench    -> bigger payload
//   BRQ_BENCH_DEVICE=<adb id> npm run bench
//                                      -> additionally times a real `adb push` to that phone
//                                         (writes and then deletes /sdcard/Download/brq-bench.bin)
//
// Loopback numbers measure the server's own overhead ceiling, not Wi-Fi speed. Compare runs on the
// same machine before/after a change; for real LAN numbers open the phone page on a phone and time it.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const createHarness = require('./helpers/server-harness');

const megabytes = Math.max(8, Number(process.env.BRQ_BENCH_MB) || 256);
const size = megabytes * 1024 * 1024;
const chunkSize = 4 * 1024 * 1024;
const mbps = (bytes, ms) => (bytes / 1024 / 1024 / (ms / 1000)).toFixed(1) + ' MiB/s';

function request(base, route, options = {}, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(base + route, { ...options, headers: { host: 'localhost:4500', ...options.headers } }, res => {
            const chunks = [];
            let bytes = 0;
            res.on('data', chunk => { bytes += chunk.length; if (!options.discard) chunks.push(chunk); });
            res.on('end', () => {
                let json; try { json = JSON.parse(Buffer.concat(chunks).toString()); } catch (_) {}
                resolve({ status: res.statusCode, headers: res.headers, json, bytes });
            });
        });
        req.on('error', reject);
        req.end(body);
    });
}

(async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brq-bench-'));
    const h = createHarness({ http: true, diskRoot: root });
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${h.server.address().port}`;
    const results = [];
    try {
        const scan = await request(base, '/mobile?k=' + h.eval('mobileAccessKey'));
        const cookie = scan.headers['set-cookie'][0].split(';')[0];
        const payload = Buffer.alloc(chunkSize, 7);

        // Phone -> PC: the resumable chunk protocol the phone page uses.
        let started = Date.now();
        const session = await request(base, '/api/upload/mobile-to-pc/sessions', { method: 'POST', headers: { cookie, 'content-type': 'application/json' } },
            JSON.stringify({ name: 'bench.bin', size, lastModified: 1 }));
        for (let offset = 0; offset < size; offset += chunkSize) {
            const response = await request(base, `/api/upload/mobile-to-pc/sessions/${session.json.id}/chunk?offset=${offset}`,
                { method: 'POST', headers: { cookie, 'content-type': 'application/octet-stream' } }, payload.subarray(0, Math.min(chunkSize, size - offset)));
            if (response.status !== 200) throw new Error('Chunk failed: ' + JSON.stringify(response.json));
        }
        const complete = await request(base, `/api/upload/mobile-to-pc/sessions/${session.json.id}/complete`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' } }, '{}');
        if (complete.status !== 200) throw new Error('Complete failed');
        results.push(['Phone -> PC (resumable upload, loopback)', mbps(size, Date.now() - started)]);

        // PC -> phone page: the ADB-free download route.
        const copy = path.join(root, 'uploads', 'bench-copy.bin');
        fs.copyFileSync(h.eval('transfersList[0].localPath'), copy);
        h.context.benchCopy = copy;
        h.eval('transfersList.unshift({id:"bench",direction:"pc-to-phone",status:"saved",filename:"bench.bin",localPath:benchCopy})');
        started = Date.now();
        const download = await request(base, '/download/file/bench', { headers: { cookie }, discard: true });
        if (download.bytes !== size) throw new Error('Download size mismatch');
        results.push(['PC -> phone page (download, loopback)', mbps(size, Date.now() - started)]);

        // Optional real phone push, only when explicitly requested.
        if (process.env.BRQ_BENCH_DEVICE) {
            const adb = process.env.BRQ_BENCH_ADB || 'adb';
            started = Date.now();
            execFileSync(adb, ['-s', process.env.BRQ_BENCH_DEVICE, 'push', copy, '/sdcard/Download/brq-bench.bin'], { stdio: 'ignore' });
            results.push([`PC -> phone (adb push, ${process.env.BRQ_BENCH_DEVICE})`, mbps(size, Date.now() - started)]);
            execFileSync(adb, ['-s', process.env.BRQ_BENCH_DEVICE, 'shell', 'rm', '-f', '/sdcard/Download/brq-bench.bin'], { stdio: 'ignore' });
        }
    } finally {
        h.server.closeAllConnections();
        await new Promise(resolve => h.server.close(resolve));
        fs.rmSync(root, { recursive: true, force: true });
    }
    console.log(`BRQ benchmark · ${megabytes} MiB · Node ${process.version} · ${os.cpus()[0]?.model || os.arch()}`);
    for (const [name, value] of results) console.log(`  ${name.padEnd(46)} ${value}`);
    console.log('  Web edition (WebRTC): npm run bench:web');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
