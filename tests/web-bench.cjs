// WebRTC DataChannel throughput between two real Chromium pages (Electron), over loopback.
//   npm run bench:web                  (BRQ_BENCH_MB=512 for a bigger file)
// The receiver uses a disk-like writer stub so the number reflects the transfer protocol,
// not the browser download prompt.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
// BRQ_BENCH_WEB_ROOT lets you benchmark another checkout (e.g. the previous protocol) with the same script.
const { createWebServer } = require(process.env.BRQ_BENCH_WEB_ROOT ? path.join(path.resolve(process.env.BRQ_BENCH_WEB_ROOT), 'web-server.js') : '../web-server');

const megabytes = Math.max(8, Number(process.env.BRQ_BENCH_MB) || 256);
const output = path.resolve(__dirname, '../.validation/web-bench');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'profile-' + process.pid));
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
setTimeout(() => { console.error('Benchmark exceeded 5 minutes'); app.exit(1); }, 300000).unref();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(win, expression, timeout = 20000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await win.webContents.executeJavaScript(expression)) return;
        await sleep(50);
    }
    throw new Error('Timed out: ' + expression);
}

app.whenReady().then(async () => {
    const service = createWebServer();
    await new Promise(resolve => service.server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${service.server.address().port}`;
    const create = partition => new BrowserWindow({ show: false, webPreferences: { partition, backgroundThrottling: false } });
    const a = create('bench-host'), b = create('bench-guest');
    try {
        await a.loadURL(base);
        await until(a, 'typeof pair !== "undefined" && socket?.readyState === WebSocket.OPEN');
        await b.loadURL(base + '/#pair=' + await a.webContents.executeJavaScript('pair.room'));
        await until(a, '!document.getElementById("pair-request").hidden');
        await until(b, '!document.getElementById("pair-request").hidden');
        await a.webContents.executeJavaScript('document.getElementById("approve").click()');
        await b.webContents.executeJavaScript('document.getElementById("approve").click()');
        await until(a, 'channel?.readyState === "open"');
        await b.webContents.executeJavaScript(`window.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async () => {}, close: async () => {}, abort: async () => {} }) }); void 0;`);
        await a.webContents.executeJavaScript(`enqueueFiles([new File([new Uint8Array(${megabytes} * 1024 * 1024)], 'bench.bin')])`);
        await until(b, '!!document.querySelector("[data-action=accept]")');
        const started = Date.now();
        await b.webContents.executeJavaScript('document.querySelector("[data-action=accept]").click()');
        await until(a, 'records.some(record => record.name === "bench.bin" && record.status === "delivered")', 280000);
        const seconds = (Date.now() - started) / 1000;
        console.log(`BRQ web benchmark · ${megabytes} MiB · ${(megabytes / seconds).toFixed(1)} MiB/s (WebRTC, loopback, Electron ${process.versions.electron})`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await service.close();
        app.exit(process.exitCode || 0);
    }
});
