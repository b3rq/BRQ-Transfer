const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');

test('invalidTargetNeverOmitsSerial', async () => {
    const h = createHarness();
    const response = await h.request('POST', '/api/adb/key', { deviceId: 'bad;command', code: 4 });
    assert.equal(response.statusCode, 400);
    assert.equal(h.commands.length, 0);
});
test('ipv6TargetPreserved', async () => {
    const target = '[fe80::1234]:5555';
    const h = createHarness({ command: args => args[0] === 'devices' ? `List of devices attached\n${target}\tdevice` : '' });
    const response = await h.request('POST', '/api/adb/key', { deviceId: target, code: 4 });
    assert.equal(response.body.success, true);
    assert.ok(h.commands.some(args => args[0] === '-s' && args[1] === target && args.includes('keyevent')));
});
test('offlineTargetDoesNotFallBackToAnotherPhone', async () => {
    const h = createHarness({ command: () => 'List of devices attached\nOTHER\tdevice' });
    const response = await h.request('POST', '/api/adb/key', { deviceId: 'OFFLINE', code: 4 });
    assert.equal(response.statusCode, 409);
    assert.ok(h.commands.every(args => !args.includes('keyevent')));
});
test('missingAdbReturnsErrorWithoutCrash', async () => {
    const h = createHarness({ command: () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
    await assert.rejects(h.eval("runAdbCommand(['devices'])"), error => error.code === 'ADB_NOT_FOUND');
});

test('realHungToolIsKilledByDeadlineAndOwnedHandleIsReleased', async () => {
    const h = createHarness({ execFile: (_, args, options, callback) => require('node:child_process').execFile(process.execPath, ['-e', 'setInterval(()=>{},1000)'], options, callback) });
    await assert.rejects(h.eval('runAdbCommand(["fixture"],30)'), error => error.code === 'ADB_TIMEOUT');
    assert.equal(h.eval('ownedAdbProcesses.size'), 0);
});

test('realToolReceivesSpecialCharactersAsLiteralArguments', async () => {
    const h = createHarness({ execFile: (_, args, options, callback) => require('node:child_process').execFile(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', ...args], options, callback) });
    h.context.literalArgs = ['quote"', 'Türkçe 😀', '; & $(echo nope)', 'space name'];
    const result = await h.eval('runAdbCommand(literalArgs)');
    assert.deepEqual(JSON.parse(result), ['quote"', 'Türkçe 😀', '; & $(echo nope)', 'space name']);
});
