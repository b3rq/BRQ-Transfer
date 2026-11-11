const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWebServer } = require('../web-server');
const output = path.resolve(__dirname, '../.validation/web');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'profile-' + process.pid));
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
setTimeout(() => { console.error('Browser test exceeded 90 seconds'); app.exit(1); }, 90000).unref();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(win, expression, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await win.webContents.executeJavaScript(expression)) return;
        await sleep(60);
    }
    throw new Error('Timed out: ' + expression);
}
app.whenReady().then(async () => {
    const service = createWebServer();
    const testHost = process.env.BRQ_WEB_TEST_HOST || '127.0.0.1';
    await new Promise(resolve => service.server.listen(0, testHost, resolve));
    const base = `http://${testHost}:${service.server.address().port}`;
    const windows = [];
    const errors = [];
    const create = partition => {
        const win = new BrowserWindow({ show: false, width: 1280, height: 920, webPreferences: { partition, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
        win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
        windows.push(win); return win;
    };
    const a = create('web-host'), b = create('web-guest');
    try {
        console.log('Web check: opening host');
        await a.loadURL(base);
        await until(a, 'typeof pair !== "undefined" && socket?.readyState === WebSocket.OPEN');
        const room = await a.webContents.executeJavaScript('pair.room');
        await b.loadURL(base + '/#pair=' + room);
        await until(a, '!document.getElementById("pair-request").hidden');
        await until(b, '!document.getElementById("pair-request").hidden');
        assert.equal(await a.webContents.executeJavaScript('channel?.readyState === "open"'), false);
        await a.webContents.executeJavaScript('document.getElementById("approve").click()');
        await b.webContents.executeJavaScript('document.getElementById("approve").click()');
        await until(a, 'channel?.readyState === "open"');
        await until(b, 'channel?.readyState === "open"');
        console.log('Web check: paired');
        for (const [from, to, count] of [[a, b, 700003], [b, a, 0]]) {
            await from.webContents.executeJavaScript(`enqueueFiles([new File([new Uint8Array(${count}).map((_, i) => i % 251)], 'Türkçe 🧪.bin')])`);
            await until(to, '!!document.querySelector("[data-action=accept]")');
            // Exercise the browser-independent download fallback without an OS save dialog.
            await to.webContents.executeJavaScript('window.showSaveFilePicker = undefined; document.querySelector("[data-action=accept]").click()');
            await until(to, '!!document.querySelector("a[download]")');
            await until(from, '!!document.querySelector("[data-direction=out][data-status=delivered]")');
            const destination = path.join(output, `received-${count}.bin`);
            const download = new Promise((resolve, reject) => to.webContents.session.once('will-download', (_, item) => {
                item.setSavePath(destination);
                item.once('done', (_, state) => state === 'completed' ? resolve() : reject(new Error('Download: ' + state)));
            }));
            await to.webContents.executeJavaScript('document.querySelector("a[download]").click()');
            await download;
            const bytes = fs.readFileSync(destination);
            assert.equal(bytes.length, count);
            assert.equal(bytes.every((value, i) => value === i % 251), true, 'Transferred bytes must match exactly');
        }
        console.log('Web check: binary downloads verified');
        // Each accepted fallback download must release the previous Blob URL.
        const previousUrl = await b.webContents.executeJavaScript('retainedDownload.url');
        await a.webContents.executeJavaScript('enqueueFiles([new File(["replacement"], "<img src=x>.txt")])');
        await until(b, '!!document.querySelector("[data-action=accept]")');
        await b.webContents.executeJavaScript('document.querySelector("[data-action=accept]").click()');
        await until(b, 'records.some(record => record.name === "<img src=x>.txt" && record.status === "received")');
        assert.equal(await b.webContents.executeJavaScript('document.querySelectorAll(".web-transfer img").length'), 0);
        assert.notEqual(await b.webContents.executeJavaScript('retainedDownload.url'), previousUrl);
        assert.equal(await b.webContents.executeJavaScript('document.querySelectorAll("a[download]").length'), 1);
        // A huge offer is rejected before accepting or allocating file bytes.
        await a.webContents.executeJavaScript('control({type:"offer",id:"f".repeat(32),name:"large.bin",size:104857601})');
        await until(b, 'records.some(record => record.name === "large.bin" && record.status === "cancelled")');
        assert.equal(await b.webContents.executeJavaScript('incoming === null'), true);
        // Disk-backed path acknowledges completion only after the writer closes.
        await b.webContents.executeJavaScript(`window.diskFixture = { chunks: [], closed: false }; window.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async bytes => { diskFixture.chunks.push(...new Uint8Array(bytes)); }, close: async () => { await new Promise(resolve => { diskFixture.finishClose = resolve; }); diskFixture.closed = true; }, abort: async () => {} }) }); void 0;`);
        await a.webContents.executeJavaScript('enqueueFiles([new File(["disk bytes"], "disk.txt")])');
        await until(b, '!!document.querySelector("[data-action=accept]")');
        await b.webContents.executeJavaScript('document.querySelector("[data-action=accept]").click()');
        await until(b, 'typeof diskFixture.finishClose === "function"');
        assert.equal(await b.webContents.executeJavaScript('incoming.actions.querySelector("[data-action=cancel]") === null'), true, 'Disk commit must not offer cancellation');
        await b.webContents.executeJavaScript('cancelRecord(incoming); diskFixture.finishClose()');
        await until(a, 'records.some(record => record.name === "disk.txt" && record.status === "delivered")');
        assert.deepEqual(await b.webContents.executeJavaScript('({closed:diskFixture.closed,text:new TextDecoder().decode(new Uint8Array(diskFixture.chunks))})'), { closed: true, text: 'disk bytes' });
        // Cancel while data is actively being written, then ensure the channel remains reusable.
        await b.webContents.executeJavaScript(`window.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async () => new Promise(resolve => setTimeout(resolve, 30)), close: async () => {}, abort: async () => {} }) }); void 0;`);
        await a.webContents.executeJavaScript('enqueueFiles([new File([new Uint8Array(4 * 1024 * 1024)], "cancel-active.bin")])');
        await until(b, '!!document.querySelector("[data-action=accept]")');
        await b.webContents.executeJavaScript('document.querySelector("[data-action=accept]").click()');
        await until(b, 'incoming?.received > 0');
        await b.webContents.executeJavaScript('cancelRecord(incoming)');
        await until(a, 'records.some(record => record.name === "cancel-active.bin" && record.status === "cancelled")');
        await a.webContents.executeJavaScript('enqueueFiles([new File(["decline"], "decline.txt")])');
        await until(b, '!!document.querySelector("[data-action=decline]")');
        await b.webContents.executeJavaScript('document.querySelector("[data-action=decline]").click()');
        await until(a, 'records.some(record => record.name === "decline.txt" && record.status === "cancelled")');
        // An approved peer still cannot flood the receiver while its disk writer is blocked.
        await b.webContents.executeJavaScript(`window.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async () => new Promise(() => {}), close: async () => {}, abort: async () => {} }) }); void 0;`);
        await a.webContents.executeJavaScript('control({type:"offer",id:"e".repeat(32),name:"flood.bin",size:10000000})');
        await until(b, '!!document.querySelector("[data-action=accept]")');
        await b.webContents.executeJavaScript('document.querySelector("[data-action=accept]").click()');
        await until(b, 'incoming?.accepted === true');
        await a.webContents.executeJavaScript('for(let i=0;i<100;i++) channel.send(new Uint8Array(16384))');
        await until(b, 'channel === null', 3000);
        console.log('Web check: receiver rejects buffer flood');
        await until(a, 'channel?.readyState === "open"');
        await until(b, 'channel?.readyState === "open"');
        console.log('Web check: reconnecting after page navigation');
        // Refresh both pages: browser storage remembers each peer; no new approval.
        await b.loadURL('about:blank'); await a.loadURL('about:blank'); await sleep(150);
        await a.loadURL(base); await b.loadURL(base);
        await until(a, 'channel?.readyState === "open"');
        await until(b, 'channel?.readyState === "open"');
        console.log('Web check: remembered reconnect verified');
        assert.equal(await a.webContents.executeJavaScript('document.getElementById("pair-request").hidden'), true);
        for (const width of [1280, 390]) {
            a.setContentSize(width, 920);
            for (const theme of ['dark', 'light']) {
                // Hidden Chromium windows can pause compositor transitions, as in the desktop UX harness.
                const freeze = await a.webContents.insertCSS('*,*::before,*::after{transition:none!important;animation:none!important}');
                await a.webContents.executeJavaScript(`document.documentElement.dataset.theme='${theme}'`);
                await sleep(120);
                assert.equal(await a.webContents.executeJavaScript('document.documentElement.scrollWidth <= innerWidth'), true, 'No horizontal overflow');
                fs.writeFileSync(path.join(output, `${width}-${theme}.png`), (await a.capturePage()).toPNG());
                await a.webContents.removeInsertedCSS(freeze);
            }
        }
        await a.webContents.executeJavaScript('document.getElementById("forget").click(); document.getElementById("forget-confirm").click()');
        await until(a, '!pair.peerId && channel === null');
        assert.notEqual(await a.webContents.executeJavaScript('pair.room'), room);
        assert.deepEqual(errors, []);
        console.log('Web browser checks passed: mutual approval, exact binary/empty downloads, Blob cleanup, safe names, size limit, disk commit, active cancel, decline, flood bound, automatic reconnect, reload, forget, 4 responsive screenshots.');
    } catch (error) {
        console.error('Browser errors:', errors);
        throw error;
    } finally {
        for (const win of windows) win.destroy();
        await service.close();
    }
}).then(() => app.exit(0), error => { console.error(error); app.exit(1); });
