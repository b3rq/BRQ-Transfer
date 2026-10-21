const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const createHarness = require('./helpers/server-harness');
function fixture() {
    const processes = [];
    const h = createHarness({ command: () => 'List of devices attached\nUSB\tdevice', spawn() {
        const proc = new EventEmitter(); proc.stdout = new EventEmitter(); proc.stderr = new EventEmitter();
        proc.kill = () => { proc.killed = true; };
        proc.stdout.pause = () => { proc.paused = true; }; proc.stdout.resume = () => { proc.paused = false; };
        processes.push(proc); return proc;
    } });
    const ws = { readyState: 1, bufferedAmount: 0, send() {} };
    h.context.owner = ws;
    return { h, ws, processes };
}
test('stopBeforeSpawnPreventsLateStart', async () => {
    const { h, processes } = fixture();
    const pending = h.eval('startScreenStream(owner, "USB")');
    h.eval('stopScreenStream()');
    await pending;
    assert.equal(processes.length, 0);
});
test('otherClientCannotStopOwnerStreamAndSlowClientPauses', async () => {
    const { h, ws, processes } = fixture();
    await h.eval('startScreenStream(owner, "USB")');
    h.eval('stopScreenStream({})');
    assert.equal(processes[0].killed, undefined);
    ws.bufferedAmount = 5 * 1024 * 1024;
    processes[0].stdout.emit('data', Buffer.from('frame'));
    assert.equal(processes[0].paused, true);
    h.eval('stopScreenStream()');
    assert.equal(processes[0].killed, true);
});

test('twentyStreamCyclesIgnoreOldCallbacksAndLeaveNoOwnedProcess', async () => {
    const { h, processes } = fixture();
    for (let n = 0; n < 20; n++) {
        await h.eval('startScreenStream(owner,"USB")');
        if (n) processes[n - 1].emit('close', 0);
        assert.equal(h.eval('screenSession.process !== null'), true);
        h.eval('stopScreenStream()');
    }
    assert.equal(processes.length, 20);
    assert.ok(processes.every(proc => proc.killed));
    assert.equal(h.eval('screenSession'), null);
});

test('secondViewerGetsBusyResultInsteadOfWaitingForever', async () => {
    const { h } = fixture();
    await h.eval('startScreenStream(owner,"USB")');
    const events = [];
    h.context.otherOwner = { readyState: 1, send: message => events.push(JSON.parse(message)) };
    await h.eval('startScreenStream(otherOwner,"USB")');
    assert.equal(events[0]?.running, false);
    assert.ok(events[0]?.error);
    h.eval('stopScreenStream()');
});
