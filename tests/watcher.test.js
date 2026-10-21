const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const createHarness = require('./helpers/server-harness');

test('realWatcherReportsAddChangeUnlinkForLiteralFolder', { timeout: 10000 }, async t => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { once } = require('node:events');
    const prefix = path.join(os.tmpdir(), 'brq-watcher-');
    const root = fs.mkdtempSync(prefix);
    const directory = path.join(root, 'literal{folder}');
    fs.mkdirSync(directory);
    const watcher = require('chokidar').watch(directory, {
        ignoreInitial: true, usePolling: true, interval: 25,
        awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 }
    });
    t.after(async () => {
        await watcher.close();
        assert.ok(path.resolve(root).startsWith(path.resolve(prefix)));
        fs.rmSync(root, { recursive: true, force: true });
    });
    await once(watcher, 'ready');
    const file = path.join(directory, 'fixture.apk');
    let event = once(watcher, 'add');
    fs.writeFileSync(file, 'first');
    assert.equal((await event)[0], file);
    event = once(watcher, 'change');
    fs.appendFileSync(file, '-second');
    assert.equal((await event)[0], file);
    event = once(watcher, 'unlink');
    fs.unlinkSync(file);
    assert.equal((await event)[0], file);
});
test('watchFolderSwapClosesOldWatcherAndSkipsSupersededFolder', async () => {
    let finish;
    const closed = new Promise(resolve => { finish = resolve; });
    const watched = [];
    const h = createHarness({ watch(directory) {
        watched.push(directory);
        return Object.assign(new EventEmitter(), { close: () => closed });
    } });
    await h.eval('setupWatcher("A")');
    const first = h.eval('setupWatcher("B")');
    const second = h.eval('setupWatcher("C")');
    assert.equal(watched.length, 1);
    finish();
    await Promise.all([first, second]);
    assert.equal(watched.length, 2);
    assert.ok(watched[1].endsWith('/C'));
});

test('localWatcherUsesNativeEventsAndFallsBackOnceOnError', async () => {
    const watched = [];
    const h = createHarness({ watch(directory, options) {
        const watcher = Object.assign(new EventEmitter(), { close: async () => {} });
        watched.push({ watcher, options }); return watcher;
    } });
    await h.eval('setupWatcher("local")');
    assert.equal(watched[0].options.usePolling, false);
    watched[0].watcher.emit('error', new Error('native unavailable'));
    await h.eval('watcherChange');
    assert.equal(watched.length, 2);
    assert.equal(watched[1].options.usePolling, true);
    watched[1].watcher.emit('error', new Error('polling unavailable'));
    assert.equal(watched.length, 2);
    assert.ok(h.events.some(event => event.type === 'WATCHER_ERROR'));
});
