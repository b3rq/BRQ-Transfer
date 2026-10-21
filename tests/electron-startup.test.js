const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
function harness(silent, components = {}) {
    const app = Object.assign(new EventEmitter(), { quit() {}, requestSingleInstanceLock: () => true, whenReady: () => new Promise(() => {}) });
    const http = { get(url, callback) {
        const request = new EventEmitter(); request.setTimeout = () => {}; request.destroy = () => request.emit('error', new Error('timeout'));
        if (!silent) queueMicrotask(() => {
            const response = new EventEmitter(); response.statusCode = 200; response.setEncoding = () => {};
            callback(response); response.emit('data', '{"app":"other"}'); response.emit('end');
        });
        return request;
    } };
    const context = vm.createContext({ require: name => name === 'electron' ? { app, ...components } : name === 'http' ? http : name === 'fs' && components.fs ? components.fs : require(name),
        __dirname: path.resolve(__dirname, '..'), console, process: { env: {}, platform: 'win32' }, setTimeout, clearTimeout });
    vm.runInContext(fs.readFileSync(process.env.BRQ_ELECTRON_TEST_SOURCE || path.join(__dirname, '../electron.js'), 'utf8'), context);
    return code => vm.runInContext(code, context);
}
test('silentHttpServerTimesOut', { timeout: 250 }, async () => {
    assert.equal(await harness(true)("waitForServer('http://localhost/api/health', 30)"), false);
});
test('differentAppOnPortIsRejected', async () => {
    await assert.rejects(harness(false)("waitForServer('http://localhost/api/health', 30)"), /başka bir uygulama/);
});

test('readyEventDuringLoadStillShowsWindowAndRetryDestroysFailedWindow', async () => {
    let notifyClosed = () => {};
    class Window extends EventEmitter {
        constructor() { super(); this.webContents = new EventEmitter(); }
        async loadURL() { this.emit('ready-to-show'); }
        show() { this.shown = true; }
        destroy() { this.destroyed = true; this.emit('closed'); notifyClosed(); }
    }
    const run = harness(false, { BrowserWindow: Window, dialog: { showMessageBox: async () => { assert.equal(run('quitCalls'), 0); return { response: 1 }; } }, fs: { existsSync: () => false, readFileSync: () => JSON.stringify({ port: 4500, token: 'a'.repeat(64) }) } });
    notifyClosed = () => run('app.emit("window-all-closed")');
    run('quitCalls=0;app.quit=()=>quitCalls++');
    await run('waitForServer=async()=>true;createWindow()');
    assert.equal(run('mainWindow.shown'), true);
    await run('oldWindow=mainWindow;showRecovery(new Error("fixture"))');
    assert.equal(run('oldWindow.destroyed'), true);
});
