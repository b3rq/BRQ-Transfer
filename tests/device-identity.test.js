const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');

test('samePhoneTransportAliasesProduceOneRow', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice model:Phone\n192.168.1.2:5555\tdevice model:Phone' : args.includes('ro.serialno') ? 'SERIAL' : '' });
    const devices = await h.eval('getAdbDevices(true)');
    assert.equal(devices.length, 1);
    assert.equal(devices[0].transports.length, 2);
    assert.ok(devices[0].phoneId);
});

test('retiredServiceRecordCanBeForgottenByStablePhoneId', async () => {
    const h = createHarness({ configText: JSON.stringify({ knownWirelessDevices: [{ serviceName: '', phoneId: 'phone-old', serial: 'OLD', deviceId: '', autoReconnect: false }] }) });
    await new Promise(resolve => setImmediate(resolve));
    const response = await h.request('POST', '/api/adb/forget', { serviceName: 'phone-old' });
    assert.equal(response.body.success, true);
    assert.equal(h.eval('config.knownWirelessDevices.length'), 0);
});
test('sameModelDifferentSerialsRemainSeparate', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nONE\tdevice model:Phone\nTWO\tdevice model:Phone' : args.includes('ro.serialno') ? args[1] : '' });
    assert.equal((await h.eval('getAdbDevices(true)')).length, 2);
});
test('dualStackServiceProducesOneDiscoveryRow', () => {
    const h = createHarness();
    assert.equal(h.eval("wirelessPhoneServices([{ name:'adb-phone',type:'_adb-tls-connect._tcp',ip:'192.168.1.2',port:5555},{name:'adb-phone',type:'_adb-tls-connect._tcp',ip:'fe80::1',port:5555}]).length"), 1);
});
test('concurrentRememberPreservesBothPhones', async () => {
    const h = createHarness({ command: async args => { await new Promise(resolve => setImmediate(resolve)); return args.includes('ro.serialno') ? args[1] : ''; } });
    await h.eval("Promise.all(['1','2'].map(n => rememberWirelessDevice('192.168.1.'+n+':5555', [{name:'adb-'+n,type:'_adb-tls-connect._tcp',ip:'192.168.1.'+n,port:5555}])))");
    assert.equal(h.eval('config.knownWirelessDevices.length'), 2);
});
test('rotatedServiceWithoutSerialDoesNotCreateConfirmedDuplicate', async () => {
    const h = createHarness();
    await h.eval("rememberWirelessDevice('192.168.1.1:5555', [{name:'old',type:'_adb-tls-connect._tcp',ip:'192.168.1.1',port:5555}])");
    await h.eval("rememberWirelessDevice('192.168.1.1:5555', [{name:'new',type:'_adb-tls-connect._tcp',ip:'192.168.1.1',port:5555}])");
    assert.equal(h.eval('config.knownWirelessDevices.filter(d=>d.identityConfirmed).length'), 0);
});
test('unknownSerialNeverConfirmsOrMergesDifferentPhones', async () => {
    const h = createHarness({ command: args => args.includes('ro.serialno') ? 'unknown' : '' });
    await h.eval("Promise.all(['1','2'].map(n => rememberWirelessDevice('192.168.1.'+n+':5555', [{name:'adb-'+n,type:'_adb-tls-connect._tcp',ip:'192.168.1.'+n,port:5555}])))");
    assert.equal(h.eval('config.knownWirelessDevices.length'), 2);
    assert.equal(h.eval('config.knownWirelessDevices.some(d=>d.identityConfirmed)'), false);
});
