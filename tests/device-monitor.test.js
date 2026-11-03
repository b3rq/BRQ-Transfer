const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');

test('backgroundMonitorsDoNotSearchForOrReconnectWirelessPhones', async () => {
    const h = createHarness();
    let searches = 0;
    let reconnects = 0;
    h.context.discoverAdbServices = async () => { searches++; return []; };
    h.context.reconnectKnownWirelessDevices = async () => { reconnects++; };
    for (const tick of h.intervals) await tick();
    assert.equal(searches, 0);
    assert.equal(reconnects, 0);
});

test('disconnectStillRemovesOfflineWirelessTransportAliases', async () => {
    const attached = new Set(['192.168.1.20:59876', 'adb-PHONE-random._adb-tls-connect._tcp']);
    const h = createHarness({ command: args => {
        if (args[0] === 'devices') return 'List of devices attached\n' + [...attached].map(id => id + '\toffline').join('\n');
        if (args[0] === 'mdns') return 'adb-PHONE-random _adb-tls-connect._tcp 192.168.1.20:59876';
        if (args[0] === 'disconnect') { attached.delete(args[1]); return 'disconnected'; }
        return '';
    } });
    const response = await h.request('POST', '/api/adb/disconnect', { deviceId: '192.168.1.20:59876' });
    assert.equal(response.body.success, true);
    assert.deepEqual(h.commands.filter(args => args[0] === 'disconnect').map(args => args[1]).sort(),
        ['192.168.1.20:59876', 'adb-PHONE-random._adb-tls-connect._tcp']);
    assert.equal(attached.size, 0);
});
test('concurrentDeviceReadsSharePollBatteryAndReverse', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : args.includes('ro.serialno') ? 'SERIAL' : 'level: 80\nUSB powered: true' });
    await h.eval('Promise.all(Array.from({length:5},()=>getAdbDevices()))');
    await h.eval('getAdbDevices(true)');
    assert.equal(h.commands.filter(args => args[0] === 'devices').length, 2);
    assert.equal(h.commands.filter(args => args.includes('battery')).length, 1);
    assert.equal(h.commands.filter(args => args.includes('reverse')).length, 1);
});
test('chargingChangeBroadcastsWithoutQrRegeneration', async () => {
    let charging = false;
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : args.includes('ro.serialno') ? 'SERIAL' : 'level: 80\nUSB powered: ' + charging });
    const monitor = h.intervals.at(-1);
    await monitor();
    charging = true;
    h.eval('batteryCache.clear(); devicesSnapshotAt=0');
    await monitor();
    assert.equal(h.events.filter(e => e.type === 'DEVICES_UPDATED').length, 2);
    assert.equal(h.qrCalls.length, 1);
});

test('goodbyeAndNewSrvReplaceOldEndpointAndStaleAdbCache', async () => {
    const { EventEmitter } = require('node:events');
    const name = value => Buffer.concat([...value.split('.').map(part => Buffer.concat([Buffer.from([part.length]), Buffer.from(part)])), Buffer.from([0])]);
    const srv = (port, ttl) => {
        const data = Buffer.alloc(6); data.writeUInt16BE(port, 4);
        const body = Buffer.concat([data, name('android.local')]); const header = Buffer.alloc(10);
        header.writeUInt16BE(33); header.writeUInt32BE(ttl, 4); header.writeUInt16BE(body.length, 8);
        return Buffer.concat([name('adb-fixture._adb-tls-connect._tcp.local'), header, body]);
    };
    const address = Buffer.alloc(10); address.writeUInt16BE(1); address.writeUInt32BE(60, 4); address.writeUInt16BE(4, 8);
    const header = Buffer.alloc(12); header.writeUInt16BE(0x8400, 2); header.writeUInt16BE(4, 6);
    const packet = Buffer.concat([header, srv(1111, 60), srv(1111, 0), srv(2222, 60), name('android.local'), address, Buffer.from([192, 168, 1, 4])]);
    const h = createHarness({ interfaces: { fixture: [{ family: 'IPv4', address: '127.0.0.1', internal: false }] },
        command: () => 'adb-fixture _adb-tls-connect._tcp 192.168.1.4:1111',
        dgram: { createSocket() {
            const socket = new EventEmitter(); socket.send = (...args) => args.at(-1)?.(); socket.close = () => {};
            socket.setMulticastInterface = socket.setMulticastTTL = () => {};
            socket.bind = (_, __, callback) => { callback(); queueMicrotask(() => { socket.emit('message', packet); socket.emit('close'); }); };
            return socket;
        } } });
    const services = await h.eval('discoverAdbServices()');
    assert.deepEqual(Array.from(services, service => service.port), [2222]);
    assert.equal(h.eval('discoverySockets.size'), 0);
});
