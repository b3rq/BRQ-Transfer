const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');

test('disconnectOwnsLifecycleUntilItFinishes', async () => {
    const h = createHarness();
    let finish;
    h.context.discoverAdbServices = () => new Promise(resolve => { finish = resolve; });
    const pending = h.request('POST', '/api/adb/disconnect', { deviceId: '192.168.1.4:5555' });
    const connect = await h.request('POST', '/api/adb/connect', { ip: '192.168.1.4', port: 5555 });
    assert.equal(connect.statusCode, 409);
    const duplicate = await h.request('POST', '/api/adb/disconnect', { deviceId: '192.168.1.4:5555' });
    assert.equal(duplicate.statusCode, 409);
    finish([]);
    await pending;
    assert.equal(h.commands.some(args => args[0] === 'connect'), false);
});

test('lateConnectCannotReplaceExplicitUserSelection', async () => {
    const h = createHarness();
    let finish;
    h.context.adbConnect = () => new Promise(resolve => { finish = resolve; });
    h.context.getAdbDevices = async () => [{ id: '192.168.1.4:5555', state: 'device' }];
    h.context.discoverAdbServices = async () => [];
    h.context.findConnectedDevice = async () => '192.168.1.4:5555';
    const pending = h.request('POST', '/api/adb/connect', { ip: '192.168.1.4', port: 5555 });
    await h.request('POST', '/api/config', { selectedAdbDevice: 'OTHER' });
    finish('connected');
    await pending;
    assert.equal(h.eval('config.selectedAdbDevice'), 'OTHER');
});
