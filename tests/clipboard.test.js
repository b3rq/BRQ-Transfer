const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const createHarness = require('./helpers/server-harness');
test('splitClipboardLineReassemblesAndLateExitCannotStopNewMode', async () => {
    const processes = [];
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : '', spawn() {
        const proc = new EventEmitter(); proc.stdout = new EventEmitter(); proc.stderr = new EventEmitter(); proc.kill = () => {};
        processes.push(proc); queueMicrotask(() => proc.emit('spawn')); return proc;
    } });
    h.files.set(h.eval('CLIPWATCH_BIN'), 'fixture'); h.files.set(h.eval('CLIP_JAR_PATH'), 'fixture');
    await h.eval('setClipboardMode("pc-to-phone", "USB")');
    const b64 = Buffer.from('Türkçe 😀').toString('base64');
    processes[0].stdout.emit('data', Buffer.from([0xef]));
    processes[0].stdout.emit('data', Buffer.from([0xbb, 0xbf]));
    processes[0].stdout.emit('data', Buffer.from('CLI'));
    processes[0].stdout.emit('data', Buffer.from('P:' + b64 + '\n'));
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(h.commands.some(args => args.some(arg => String(arg).includes(b64))));
    await h.eval('setClipboardMode("pc-to-phone", "USB")');
    processes[0].emit('exit', 0);
    assert.equal(h.eval('currentClipboardMode'), 'pc-to-phone');
    await h.eval('setClipboardMode("off")');
});
test('missingJarStopsBeforeSend', async () => {
    const h = createHarness({ command: () => 'List of devices attached\nUSB\tdevice' });
    const response = await h.request('POST', '/api/clipboard/send-text', { deviceId: 'USB', text: 'Hello' });
    assert.equal(response.body.success, false);
    assert.equal(h.commands.some(args => args.some(arg => String(arg).includes('set-b64'))), false);
});
test('offDuringTargetResolutionStaysOff', async () => {
    let finish;
    const h = createHarness({ command: args => args[0] === 'devices' ? new Promise(resolve => { finish = resolve; }) : '', spawn() {
        const proc = new EventEmitter(); proc.stdout = new EventEmitter(); proc.stderr = new EventEmitter(); proc.kill = () => {};
        queueMicrotask(() => proc.emit('spawn')); return proc;
    } });
    h.files.set(h.eval('CLIPWATCH_BIN'), 'fixture');
    h.files.set(h.eval('CLIP_JAR_PATH'), 'fixture');
    const pending = h.eval('setClipboardMode("pc-to-phone", "USB")');
    while (!finish) await new Promise(resolve => setImmediate(resolve));
    await h.eval('setClipboardMode("off")');
    finish('List of devices attached\nUSB\tdevice');
    const result = await pending;
    assert.equal(result.success, false);
    assert.equal(h.commands.length, 1);
});

test('largeClipboardUsesBoundedPayloadFileAndCleansBothCopies', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : args.includes('ro.serialno') ? 'SERIAL' : '' });
    h.context.payload = Buffer.from('Türkçe 😀 '.repeat(1000)).toString('base64');
    await h.eval('sendClipboardValue("USB",payload)');
    const push = h.commands.find(args => args.includes('push'));
    assert.ok(push);
    assert.ok(h.commands.every(args => args.join(' ').length < 1024));
    assert.equal(h.files.has(push[3]), false);
    assert.ok(h.commands.some(args => args.includes('shell') && args.some(arg => String(arg).includes('rm -f /data/local/tmp/brq-clip-'))));
});

test('clipboardRejectsOversizeDecodedPayloadBeforeAnyCommand', async () => {
    const h = createHarness();
    h.context.payload = Buffer.alloc(65537).toString('base64');
    await assert.rejects(h.eval('sendClipboardValue("USB",payload)'));
    assert.equal(h.commands.length, 0);
});

test('clipboardJarIsPreparedOncePerVerifiedSession', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : args.includes('ro.serialno') ? 'SERIAL' : '' });
    h.files.set(h.eval('CLIP_JAR_PATH'), 'fixture');
    for (let n = 0; n < 2; n++) await h.request('POST', '/api/clipboard/send-text', { deviceId: 'USB', text: 'fixture' });
    assert.equal(h.commands.filter(args => args.includes('push') && args.includes('/data/local/tmp/clip.jar')).length, 1);
});

test('confirmedDeviceSelectionStopsOldClipboardInsteadOfRedirectingIt', async () => {
    const h = createHarness();
    await h.request('POST', '/api/config', { selectedAdbDevice: 'USB' });
    h.eval('currentClipboardMode="pc-to-phone"; activeClipboardDevice="USB"');
    await h.request('POST', '/api/config', { selectedAdbDevice: 'OTHER' });
    assert.equal(h.eval('currentClipboardMode'), 'off');
    assert.equal(h.eval('activeClipboardDevice'), null);
    assert.equal(h.commands.length, 0);
});

test('missingNewClipboardToolStopsPreviousModeAndPublishesOff', async () => {
    const h = createHarness({ command: () => 'List of devices attached\nUSB\tdevice' });
    h.eval('currentClipboardMode="pc-to-phone";activeClipboardDevice="USB"');
    const response = await h.eval('setClipboardMode("phone-to-pc","USB")');
    assert.equal(response.success, false);
    assert.equal(h.eval('currentClipboardMode'), 'off');
    assert.ok(h.events.some(event => event.type === 'CLIPBOARD_MODE_CHANGED' && event.mode === 'off'));
});
