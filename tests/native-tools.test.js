const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const createHarness = require('./helpers/server-harness');
test('scrcpyReceivesSelectedTransportAndStopsOnlyOwnedProcess', async () => {
    const proc = new EventEmitter(); proc.stderr = new EventEmitter(); proc.kill = () => { proc.killed = true; };
    const h = createHarness({ command: () => 'List of devices attached\nUSB\tdevice', spawn() { queueMicrotask(() => proc.emit('spawn')); return proc; } });
    h.files.set(h.eval('SCRCPY_BIN'), 'fixture');
    const response = await h.request('POST', '/api/adb/scrcpy/start', { deviceId: 'USB' });
    assert.equal(response.body.success, true);
    assert.ok(h.commands.some(args => args[0] === '-s' && args[1] === 'USB'));
    assert.equal((await h.request('GET', '/api/adb/scrcpy/status')).body.running, true);
    await h.request('POST', '/api/adb/scrcpy/stop');
    assert.equal(proc.killed, true);
});
