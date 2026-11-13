const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const net = require('node:net');
const { EventEmitter } = require('node:events');

// Run the actual server handlers with a fake ADB process, without opening a
// listening server, changing real config, or touching attached Android devices.
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
function section(start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from);
    assert.ok(from >= 0 && to > from, `Missing server section: ${start}`);
    return source.slice(from, to);
}

function createHarness(options = {}) {
    const routes = new Map();
    const commands = [];
    const events = [];
    const connected = new Set(options.connected || []);
    const state = { mdns: options.mdns || '', discoveryError: false, saves: [] };
    const config = { selectedAdbDevice: '', knownWirelessDevices: [], ...options.config };
    const context = vm.createContext({
        net, Buffer, crypto: require('node:crypto'), console, config, ADB_BIN: 'fake-adb', commands,
        requestContext: { getStore: () => undefined },
        setTimeout: callback => { queueMicrotask(callback); },
        QRCode: { toDataURL: async () => 'data:image/png;base64,fake' },
        broadcast: event => events.push(JSON.parse(JSON.stringify(event))),
        saveConfig: () => state.saves.push(JSON.stringify(config)),
        getAdbDevices: async () => [...connected].map(id => ({ id, state: options.deviceStates?.[id] || 'device' })),
        activeClipboardDevice: null, lastDetectedConnectedIp: '', adbDeviceMutationVersion: 0, setClipboardMode() {},
        app: {
            get: (route, handler) => routes.set(`GET ${route}`, handler),
            post: (route, handler) => routes.set(`POST ${route}`, handler)
        },
        execFile: (binary, args, settings, callback) => {
            commands.push([...args]);
            assert.ok(settings.timeout > 0);
            queueMicrotask(() => {
                if (args[0] === 'mdns') {
                    if (state.discoveryError) return callback(new Error('ADB not found'), '', '');
                    return callback(null, state.mdns, '');
                }
                if (args[0] === 'devices') return callback(null,
                    'List of devices attached\n' + [...connected].map(id => `${id}\tdevice`).join('\n'), '');
                if (args[0] === 'pair') {
                    if (options.pairError) return callback(null, 'Failed: wrong password', '');
                    return callback(null, `Successfully paired to ${args[1]} [guid=phone]`, '');
                }
                if (args[0] === 'connect') {
                    if (options.connectError) return callback(null, typeof options.connectError === 'string' ? options.connectError : 'failed to authenticate', '');
                    connected.add(options.connectedId || args[1]);
                    return callback(null, `connected to ${args[1]}`, '');
                }
                if (args[0] === 'disconnect') {
                    if (options.disconnectError) return callback(new Error('ADB disconnect failed'), '', 'ADB disconnect failed');
                    if (!options.disconnectNoop) connected.delete(args[1]);
                    return callback(null, `disconnected ${args[1]}`, '');
                }
                if (args[0] === '-s' && args[3]?.startsWith('echo BRQ_DEVICE_IDENTITY')) {
                    if (options.identityError) return callback(new Error('Identity unavailable'), '', '');
                    return callback(null, options.identity || 'BRQ_DEVICE_IDENTITY\n\n\nnull', '');
                }
                if (args[0] === '-s' && options.deviceStates?.[args[1]] && options.deviceStates[args[1]] !== 'device') {
                    return callback(new Error('device ' + options.deviceStates[args[1]]), '', '');
                }
                if (args[0] === '-s') return callback(null, options.serialByDevice?.[args[1]] || options.serial || 'PHONE', '');
                callback(new Error(`Unexpected command: ${args.join(' ')}`), '', '');
            });
        },
        exec() { throw new Error('Unexpected shell command'); },
        spawn: (binary, args) => {
            const process = new EventEmitter();
            queueMicrotask(() => {
                if (args[0] === 'disconnect') connected.delete(args[1]);
                process.emit('close', 0);
            });
            return process;
        }
    });
    vm.runInContext([
        section('function sendApiError(', '// Directories'),
        section('function runAdbCommand(', 'async function launchAppViaAdb('),
        section('// ADB wireless discovery, pairing and reconnection', 'function broadcast('),
        section("app.get('/api/adb/pairing-services'", "app.post('/api/adb/install'")
    ].join('\n'), context);
    context.discoverNetworkAdbServices = async () => options.networkServices || [];
    return {
        context, commands, events, connected, config, state,
        async request(method, route, body = {}) {
            let finish;
            const completed = new Promise(resolve => { finish = resolve; });
            const response = {
                statusCode: 200,
                status(code) { this.statusCode = code; return this; },
                json(data) { this.body = JSON.parse(JSON.stringify(data)); finish(this); return this; }
            };
            await routes.get(`${method} ${route}`)({ body }, response);
            return completed;
        }
    };
}

const pairing = 'adb-code-phone _adb-tls-pairing._tcp 192.168.1.20:37001';
const connection = 'adb-PHONE-random _adb-tls-connect._tcp 192.168.1.20:59876';

function loadUiRequestHelpers(context, uiSource) {
    Object.assign(context, { AbortController, setTimeout, clearTimeout });
    vm.runInContext(uiSource.slice(uiSource.indexOf('async function requestResponse('), uiSource.indexOf('async function saveSettings(')), context);
}

function createSavedPhonesUiHarness(options = {}) {
    const uiSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'pc.js'), 'utf8');
    const makeElement = () => ({ children: [], disabled: false, style: {},
        replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); } });
    const elements = { 'saved-phones-list': makeElement(), 'forget-all-phones-btn': makeElement() };
    const requests = [];
    const messages = [];
    const context = vm.createContext({
        document: { getElementById: id => elements[id], createElement: makeElement },
        window: { confirm: () => options.confirm !== false },
        savedPhones: [{ serviceName: 'adb-PHONE-old', model: '<Galaxy>', deviceName: 'My Phone', ip: '192.168.1.20' }],
        forgettingPhones: false, codePairingInProgress: false, devicesRequestVersion: 0, pairingDiscoveryVersion: 0,
        currentDevices: [{ id: 'phone' }], selectedDevice: 'phone', currentPairingSession: {}, lastPairedIp: '192.168.1.20',
        quickPortBox: { style: {} }, currentLang: 'tr',
        i18n: { tr: { no_saved_phones: 'Kayıt yok', forget_phone: 'Sil', phones_forgotten: 'Silindi' } },
        maskIdentifier: value => options.privacy ? '***' : value,
        renderDevices() {}, updatePairStatusBadge() {}, showToast: message => messages.push(message),
        fetch: async (url, request) => {
            requests.push({ url, body: JSON.parse(request.body) });
            return { ok: !options.error, json: async () => options.error ? { error: options.error } :
                { success: true, knownDevices: [], devices: [], selectedAdbDevice: '' } };
        }
    });
    loadUiRequestHelpers(context, uiSource);
    vm.runInContext(uiSource.slice(uiSource.indexOf('function renderSavedPhones()'),
        uiSource.indexOf('// --- ADB QR & Pairing ---')), context);
    return { context, elements, requests, messages };
}

test('saved phone UI uses safe text nodes and masks names and addresses in privacy mode', () => {
    const ui = createSavedPhonesUiHarness();
    ui.context.renderSavedPhones();
    const card = ui.elements['saved-phones-list'].children[0];
    assert.equal(card.children[0].children[0].textContent, 'My Phone · <Galaxy>');
    assert.equal(card.children[1].textContent, 'Sil');
    const privateUi = createSavedPhonesUiHarness({ privacy: true });
    privateUi.context.renderSavedPhones();
    const info = privateUi.elements['saved-phones-list'].children[0].children[0];
    assert.equal(info.children[0].textContent, '*** · ***');
    assert.equal(info.children[1].textContent, '***');
});

test('saved phone UI sends the selected record, applies confirmed state and disables delete-all when empty', async () => {
    const ui = createSavedPhonesUiHarness();
    ui.context.renderSavedPhones();
    await ui.elements['saved-phones-list'].children[0].children[1].onclick();
    assert.deepEqual(ui.requests, [{ url: '/api/adb/forget', body: { serviceName: 'adb-PHONE-old' } }]);
    assert.equal(ui.context.savedPhones.length, 0);
    assert.equal(ui.context.currentDevices.length, 0);
    assert.equal(ui.context.selectedDevice, '');
    assert.equal(ui.elements['forget-all-phones-btn'].disabled, true);
});

test('saved phone UI supports delete-all, honors cancel and keeps records on server failure', async () => {
    const bulk = createSavedPhonesUiHarness();
    await bulk.elements['forget-all-phones-btn'].onclick();
    assert.deepEqual(bulk.requests[0].body, { all: true });
    const cancelled = createSavedPhonesUiHarness({ confirm: false });
    await cancelled.context.forgetSavedPhones();
    assert.equal(cancelled.requests.length, 0);
    assert.equal(cancelled.context.savedPhones.length, 1);
    const failed = createSavedPhonesUiHarness({ error: 'ADB failed' });
    await failed.context.forgetSavedPhones();
    assert.equal(failed.context.savedPhones.length, 1);
    assert.equal(failed.context.currentDevices.length, 1);
    assert.equal(failed.elements['forget-all-phones-btn'].disabled, false);
    assert.deepEqual(failed.messages, ['ADB failed']);
});

test('saved phones are listed even when offline', async () => {
    const known = { serviceName: 'adb-PHONE-old', serial: 'PHONE', model: 'Galaxy' };
    const harness = createHarness({ config: { knownWirelessDevices: [known] } });
    const response = await harness.request('GET', '/api/adb/known-devices');
    assert.deepEqual(response.body.devices, [known]);
});

test('forgetting one phone disconnects its aliases, preserves others and requires pairing after restart and address change', async () => {
    const known = { serviceName: 'adb-PHONE-old', serial: 'PHONE', deviceId: '192.168.1.20:59876' };
    const other = { serviceName: 'adb-OTHER-old', serial: 'OTHER' };
    const harness = createHarness({ mdns: connection, connected: [known.deviceId],
        config: { selectedAdbDevice: known.deviceId, knownWirelessDevices: [known, other] } });
    const response = await harness.request('POST', '/api/adb/forget', { serviceName: known.serviceName });
    assert.equal(response.body.success, true);
    assert.deepEqual(harness.config.knownWirelessDevices, [other]);
    assert.equal(harness.connected.size, 0);
    assert.equal(harness.config.selectedAdbDevice, '');
    const restarted = createHarness({ mdns: 'adb-PHONE-new _adb-tls-connect._tcp 192.168.1.25:59999', config: harness.config });
    const blocked = await restarted.request('POST', '/api/adb/connect', { serviceName: 'adb-PHONE-new' });
    assert.equal(blocked.body.needsPairing, true);
    assert.equal(restarted.commands.some(args => args[0] === 'connect'), false);
    const manual = await restarted.request('POST', '/api/adb/connect', { ip: '192.168.1.25', port: 59999 });
    assert.equal(manual.body.needsPairing, true);
});

test('forget all includes offline records and does not disconnect USB or unrelated phones', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876', 'USB_SERIAL', '192.168.1.30:5555'],
        serialByDevice: { '192.168.1.30:5555': 'OTHER' },
        config: { knownWirelessDevices: [
            { serviceName: 'adb-PHONE-old', serial: 'PHONE', deviceId: '192.168.1.20:59876' },
            { serviceName: 'adb-OFFLINE-old', serial: 'OFFLINE', deviceId: '192.168.1.21:55555' }
        ] } });
    const response = await harness.request('POST', '/api/adb/forget', { all: true });
    assert.equal(response.body.success, true);
    assert.equal(harness.config.knownWirelessDevices.length, 0);
    assert.equal(harness.config.forgottenWirelessDevices.length, 2);
    assert.deepEqual([...harness.connected], ['USB_SERIAL', '192.168.1.30:5555']);
});

test('failed disconnect retains saved records and allows retry instead of claiming deletion succeeded', async () => {
    const known = { serviceName: 'adb-PHONE-old', serial: 'PHONE', deviceId: '192.168.1.20:59876' };
    const harness = createHarness({ mdns: connection, connected: [known.deviceId], disconnectNoop: true,
        config: { knownWirelessDevices: [known] } });
    const response = await harness.request('POST', '/api/adb/forget', { all: true });
    assert.equal(response.statusCode, 502);
    assert.equal(harness.config.knownWirelessDevices.length, 1);
});

test('only successful code pairing clears a forgotten phone requirement', async () => {
    const forgotten = { serviceName: 'adb-PHONE-old', serial: 'PHONE', ip: '192.168.1.20' };
    const harness = createHarness({ mdns: `${connection}\n${pairing}`, config: { forgottenWirelessDevices: [forgotten] } });
    const response = await harness.request('POST', '/api/adb/pair', { serviceName: 'adb-PHONE-random', code: '123456' });
    assert.equal(response.body.session.status, 'connected');
    assert.equal(harness.config.forgottenWirelessDevices.length, 0);
    assert.equal(harness.config.knownWirelessDevices.length, 1);
    const failed = createHarness({ mdns: `${connection}\n${pairing}`, pairError: true,
        config: { forgottenWirelessDevices: [forgotten] } });
    await failed.request('POST', '/api/adb/pair', { code: '123456' });
    assert.equal(failed.config.forgottenWirelessDevices.length, 1);
});

test('deletion rejects overlapping code pairing, QR creation and connection attempts', async () => {
    const harness = createHarness({ mdns: `${connection}\n${pairing}`,
        config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE' }] } });
    let finishRead;
    harness.context.getAdbDevices = () => new Promise(resolve => { finishRead = resolve; });
    const pending = harness.request('POST', '/api/adb/forget', { all: true });
    while (!finishRead) await Promise.resolve();
    const codeRequest = harness.request('POST', '/api/adb/pair', { code: '123456' });
    const qrRequest = harness.request('GET', '/api/adb/pairing-qr');
    const connectRequest = harness.request('POST', '/api/adb/connect', { ip: '192.168.1.20', port: 59876 });
    harness.context.getAdbDevices = async () => [];
    finishRead([]);
    await pending;
    const [code, qr, connect] = await Promise.all([codeRequest, qrRequest, connectRequest]);
    assert.equal(code.statusCode, 409);
    assert.equal(qr.statusCode, 409);
    assert.equal(connect.statusCode, 409);
    assert.equal(harness.commands.some(args => ['connect', 'pair'].includes(args[0])), false);
});

test('forget disconnects a changed connection port without discovery and preserves other IPs', async () => {
    const harness = createHarness({ connected: ['192.168.1.20:59999', '192.168.1.200:59999'],
        serialByDevice: { '192.168.1.200:59999': 'OTHER' },
        config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE', deviceId: '192.168.1.20:59876' }] } });
    const response = await harness.request('POST', '/api/adb/forget', { all: true });
    assert.equal(response.body.success, true);
    assert.deepEqual([...harness.connected], ['192.168.1.200:59999']);
});

test('manual connect cannot bypass re-pairing after an address change when discovery is unavailable', async () => {
    const harness = createHarness({ config: { forgottenWirelessDevices: [
        { serviceName: 'adb-PHONE-old', serial: 'PHONE', ip: '192.168.1.20', deviceId: '192.168.1.20:59876' }
    ] } });
    const response = await harness.request('POST', '/api/adb/connect', { ip: '192.168.1.25', port: 59999 });
    assert.equal(response.body.needsPairing, true);
    assert.equal(harness.connected.size, 0);
    assert.equal(harness.config.selectedAdbDevice, '');
});

test('manual pairing at a new address clears its old serial record after entering the connection port', async () => {
    const harness = createHarness({ config: { forgottenWirelessDevices: [
        { serviceName: 'adb-PHONE-old', serial: 'PHONE', ip: '192.168.1.20' }
    ] } });
    const pair = await harness.request('POST', '/api/adb/pair', { ip: '192.168.1.25', port: 37001, code: '123456' });
    assert.equal(pair.body.session.status, 'paired_need_port');
    const connect = await harness.request('POST', '/api/adb/connect', { ip: '192.168.1.25', port: 59999 });
    assert.equal(connect.body.success, true);
    assert.equal(harness.config.forgottenWirelessDevices.length, 0);
});

test('deleting an offline phone never disconnects another phone that inherited its IP', async () => {
    for (const mdns of ['', 'adb-OTHER-random _adb-tls-connect._tcp 192.168.1.20:60000']) {
        const harness = createHarness({ mdns, serial: 'OTHER', connected: ['192.168.1.20:60000'],
            config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE',
                ip: '192.168.1.20', deviceId: '192.168.1.20:59876' }] } });
        const response = await harness.request('POST', '/api/adb/forget', { all: true });
        assert.equal(response.body.success, true);
        assert.equal(harness.connected.has('192.168.1.20:60000'), true);
        assert.equal(harness.commands.some(args => args[0] === 'disconnect'), false);
    }
});

test('pairing another phone at a reused IP never clears a forgotten phone identity', async () => {
    const harness = createHarness({ serial: 'OTHER', config: { forgottenWirelessDevices: [
        { serviceName: 'adb-PHONE-old', serial: 'PHONE', ip: '192.168.1.20' }
    ] } });
    const pair = await harness.request('POST', '/api/adb/pair', { ip: '192.168.1.20', port: 37001, code: '123456' });
    assert.equal(pair.body.session.status, 'paired_need_port');
    assert.equal(harness.config.forgottenWirelessDevices.length, 1);
    const connect = await harness.request('POST', '/api/adb/connect', { ip: '192.168.1.20', port: 60000 });
    assert.equal(connect.body.success, true);
    assert.equal(harness.config.forgottenWirelessDevices.length, 1);
});

test('unrelated offline or unauthorized transports do not prevent deleting a saved offline phone', async () => {
    for (const state of ['offline', 'unauthorized']) {
        const harness = createHarness({ connected: ['192.168.1.30:5555'], deviceStates: { '192.168.1.30:5555': state },
            config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE', deviceId: '192.168.1.20:59876' }] } });
        const response = await harness.request('POST', '/api/adb/forget', { all: true });
        assert.equal(response.body.success, true);
        assert.equal(harness.config.knownWirelessDevices.length, 0);
        assert.equal(harness.connected.has('192.168.1.30:5555'), true);
    }
});

test('discovery parses valid endpoints and excludes QR, unrelated and malformed services', async () => {
    const harness = createHarness({ mdns: [pairing, pairing,
        'studio-other _adb-tls-pairing._tcp 192.168.1.21:37001',
        'adb-code-phone _adb-tls-pairing._tcp [2001:db8::20]:37001',
        'adb-bad _adb-tls-pairing._tcp 192.168.1.22:99999',
        'adb-bad _adb-tls-pairing._tcp invalid:1234', connection].join('\n') });
    const response = await harness.request('GET', '/api/adb/pairing-services');
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.services, [{ name: 'adb-code-phone', type: '_adb-tls-pairing._tcp', ip: '192.168.1.20', port: 37001 }]);
});

test('only a 6-digit code is needed and the separate connection port can exceed 45000', async () => {
    const harness = createHarness({ mdns: `${pairing}\n${connection}` });
    const response = await harness.request('POST', '/api/adb/pair', { code: '012345' });
    assert.equal(response.body.session.status, 'connected');
    assert.deepEqual(harness.commands.find(args => args[0] === 'pair'), ['pair', '192.168.1.20:37001', '012345']);
    assert.deepEqual(harness.commands.find(args => args[0] === 'connect'), ['connect', '192.168.1.20:59876']);
    assert.equal(harness.config.selectedAdbDevice, '192.168.1.20:59876');
    assert.equal(harness.config.knownWirelessDevices[0].serial, 'PHONE');
    assert.ok(harness.state.saves.every(saved => !saved.includes('012345')));
    assert.ok(harness.events.every(event => !JSON.stringify(event).includes('012345')));
});

test('multiple phones require selection and only the selected phone receives the code', async () => {
    const harness = createHarness({ mdns: `${pairing}\nadb-other _adb-tls-pairing._tcp 192.168.1.21:38001` });
    const ambiguous = await harness.request('POST', '/api/adb/pair', { code: '123456' });
    assert.equal(ambiguous.statusCode, 409);
    assert.equal(harness.commands.filter(args => args[0] === 'pair').length, 0);
    const selected = await harness.request('POST', '/api/adb/pair', { code: '123456', serviceName: 'adb-other' });
    assert.equal(selected.body.session.status, 'paired_need_port');
    assert.equal(harness.commands.find(args => args[0] === 'pair')[1], '192.168.1.21:38001');
});

test('missing or stale selected services do not trigger pairing', async () => {
    const harness = createHarness({ mdns: pairing });
    const response = await harness.request('POST', '/api/adb/pair', { code: '123456', serviceName: 'adb-gone' });
    assert.equal(response.statusCode, 409);
    assert.equal(harness.commands.some(args => args[0] === 'pair'), false);
});

test('invalid codes and out-of-range ports never reach ADB', async () => {
    const harness = createHarness();
    for (const code of ['12345', 'abcdef', '1234567']) {
        assert.equal((await harness.request('POST', '/api/adb/pair', { code })).statusCode, 400);
    }
    await harness.request('POST', '/api/adb/pair', { code: '123456', ip: '192.168.1.20', port: 65536 });
    assert.equal(harness.commands.length, 0);
});

test('ADB failure text with exit code zero is not reported as successful pairing', async () => {
    const harness = createHarness({ mdns: pairing, pairError: true });
    const response = await harness.request('POST', '/api/adb/pair', { code: '123456' });
    assert.equal(response.statusCode, 502);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'PAIRING_FAILED');
    assert.equal(harness.config.knownWirelessDevices.length, 0);
});

test('manual pairing works without mDNS and requests only the connection port afterwards', async () => {
    const harness = createHarness();
    harness.state.discoveryError = true;
    const response = await harness.request('POST', '/api/adb/pair', { code: '123456', ip: '192.168.1.20', port: 37001 });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.session.status, 'paired_need_port');
    assert.equal(harness.commands.some(args => args[0] === 'connect'), false);
    assert.equal((await harness.request('GET', '/api/adb/pairing-services')).statusCode, 503);
});

test('IPv6 pairing uses bracketed endpoints', async () => {
    const harness = createHarness();
    await harness.request('POST', '/api/adb/pair', { code: '123456', ip: '2001:db8::20', port: 37001 });
    assert.equal(harness.commands.find(args => args[0] === 'pair')[1], '[2001:db8::20]:37001');
});

test('mDNS transport names count as a connected device', async () => {
    const harness = createHarness({ mdns: `${pairing}\n${connection}`,
        connected: ['adb-PHONE-random._adb-tls-connect._tcp'] });
    const response = await harness.request('POST', '/api/adb/pair', { code: '123456' });
    assert.equal(response.body.session.status, 'connected');
    assert.equal(harness.commands.some(args => args[0] === 'connect'), false);
    assert.equal(harness.config.knownWirelessDevices.length, 1);
});

test('a similar IP address is not mistaken for the intended device', async () => {
    const harness = createHarness({ mdns: pairing, connected: ['192.168.1.200:5555'] });
    const response = await harness.request('POST', '/api/adb/pair', { code: '123456' });
    assert.equal(response.body.session.status, 'paired_need_port');
});

test('known devices reconnect at their new IP and port; unknown devices are ignored', async () => {
    const harness = createHarness({ mdns:
        'adb-PHONE-new _adb-tls-connect._tcp 192.168.1.50:61000\nadb-STRANGER-other _adb-tls-connect._tcp 192.168.1.20:59876',
    config: { selectedAdbDevice: '192.168.1.20:59876', knownWirelessDevices: [
        { serviceName: 'adb-PHONE-old', serial: 'PHONE', deviceId: '192.168.1.20:59876' }
    ] } });
    await vm.runInContext('reconnectKnownWirelessDevices()', harness.context);
    assert.deepEqual(harness.commands.filter(args => args[0] === 'connect'), [['connect', '192.168.1.50:61000']]);
    assert.equal(harness.config.selectedAdbDevice, '192.168.1.50:61000');
});

test('disconnected phone offers direct reconnection only while its connection service is discovered', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876'], config: {
        knownWirelessDevices: [{ serviceName: 'adb-PHONE-random', serial: 'PHONE', deviceId: '192.168.1.20:59876' }]
    } });
    await harness.request('POST', '/api/adb/disconnect', { deviceId: '192.168.1.20:59876' });
    let response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services[0].reconnectable, true);
    harness.context.discoverAdbServices = async () => [];
    response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.deepEqual(response.body.services, []);
    assert.equal(harness.config.knownWirelessDevices.length, 1);
    harness.context.discoverAdbServices = async () => [{ name: 'adb-PHONE-new', type: '_adb-tls-connect._tcp', ip: '192.168.1.20', port: 61000 }];
    response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services[0].reconnectable, true);
    await harness.request('POST', '/api/adb/connect', { serviceName: 'adb-PHONE-new' });
    response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services[0].reconnectable, false);
    assert.equal(harness.commands.some(args => args[0] === 'pair'), false);
    assert.ok(harness.commands.some(args => args[0] === 'connect' && args[1] === '192.168.1.20:61000'));
});

test('explicit disconnect suppresses background reconnection; manual connect resumes it', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876'], config: {
        selectedAdbDevice: '192.168.1.20:59876', knownWirelessDevices: [
            { serviceName: 'adb-PHONE-random', serial: 'PHONE', deviceId: '192.168.1.20:59876' }
        ]
    } });
    await harness.request('POST', '/api/adb/disconnect', { deviceId: '192.168.1.20:59876' });
    await vm.runInContext('reconnectKnownWirelessDevices()', harness.context);
    assert.equal(harness.commands.some(args => args[0] === 'connect'), false);
    await harness.request('POST', '/api/adb/connect', { ip: '192.168.1.20', port: 59876 });
    assert.equal(vm.runInContext('pausedWirelessDevices.size', harness.context), 0);
});

test('disconnect removes IP and mDNS aliases for the same phone and preserves other phones', async () => {
    const ipId = '192.168.1.20:59876';
    const mdnsId = 'adb-PHONE-random._adb-tls-connect._tcp';
    const otherId = '192.168.1.21:5555';
    const harness = createHarness({ mdns: connection, connected: [ipId, mdnsId, otherId], config: {
        selectedAdbDevice: mdnsId, knownWirelessDevices: [{ serviceName: 'adb-PHONE-random', serial: 'PHONE', deviceId: ipId }]
    } });
    const response = await harness.request('POST', '/api/adb/disconnect', { deviceId: ipId });
    assert.equal(response.statusCode, 200);
    assert.deepEqual([...harness.connected], [otherId]);
    assert.equal(response.body.selectedAdbDevice, '');
    assert.equal(harness.config.knownWirelessDevices[0].autoReconnect, false);
    assert.ok(harness.events.some(event => event.type === 'CONFIG_UPDATED'));
    const restarted = createHarness({ mdns: connection, config: JSON.parse(JSON.stringify(harness.config)) });
    await vm.runInContext('reconnectKnownWirelessDevices()', restarted.context);
    assert.equal(restarted.commands.some(args => args[0] === 'connect'), false);
});

test('disconnect refuses to report success when ADB leaves the device connected', async () => {
    const id = '192.168.1.20:59876';
    const harness = createHarness({ mdns: connection, connected: [id], disconnectNoop: true });
    const response = await harness.request('POST', '/api/adb/disconnect', { deviceId: id });
    assert.equal(response.statusCode, 502);
    assert.equal(response.body.success, false);
    assert.equal(response.body.devices[0].id, id);
});

test('disconnect reports an ADB process failure without an unhandled process event', async () => {
    const id = '192.168.1.20:59876';
    const harness = createHarness({ mdns: connection, connected: [id], disconnectError: true });
    const response = await harness.request('POST', '/api/adb/disconnect', { deviceId: id });
    assert.equal(response.statusCode, 502);
    assert.match(response.body.error, /Cihaz işlemi tamamlanamadı/);
});

test('a physical USB device is not falsely reported as disconnected', async () => {
    const harness = createHarness({ connected: ['USB_SERIAL'] });
    const response = await harness.request('POST', '/api/adb/disconnect', { deviceId: 'USB_SERIAL' });
    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, /USB/);
    assert.equal(harness.commands.some(args => args[0] === 'disconnect'), false);
});

test('disconnect accepts bracketed IPv6 endpoints', async () => {
    const id = '[2001:db8::20]:59876';
    const harness = createHarness({ connected: [id] });
    const response = await harness.request('POST', '/api/adb/disconnect', { deviceId: id });
    assert.equal(response.statusCode, 200);
    assert.equal(harness.connected.size, 0);
});

test('disconnecting an already absent wireless phone clears a stale selection without issuing ADB disconnect', async () => {
    const id = '192.168.1.20:59876';
    const harness = createHarness({ config: { selectedAdbDevice: id } });
    const response = await harness.request('POST', '/api/adb/disconnect', { deviceId: id });
    assert.equal(response.body.success, true);
    assert.equal(harness.config.selectedAdbDevice, '');
    assert.equal(harness.commands.some(args => args[0] === 'disconnect'), false);
});

test('concurrent pairing requests cannot pair two devices or replace an active session', async () => {
    const harness = createHarness({ mdns: `${pairing}\n${connection}` });
    const first = harness.request('POST', '/api/adb/pair', { code: '123456' });
    const second = await harness.request('POST', '/api/adb/pair', { code: '654321' });
    assert.equal(second.statusCode, 409);
    assert.equal((await first).body.session.status, 'connected');
    assert.equal(harness.commands.filter(args => args[0] === 'pair').length, 1);
});

test('QR pairing ignores other pairing services and matches its own service name', async () => {
    const harness = createHarness({ mdns: `${pairing}\nADB_WIFI_ours _adb-tls-pairing._tcp 192.168.1.21:38001` });
    await vm.runInContext(`runPairingLoop({ mode: 'qr', serviceName: 'ADB_WIFI_ours', password: 'qr-secret',
        startedAt: Date.now(), cancelled: false })`, harness.context);
    assert.deepEqual(harness.commands.find(args => args[0] === 'pair'), ['pair', '192.168.1.21:38001', 'qr-secret']);
    assert.ok(harness.events.every(event => !JSON.stringify(event).includes('qr-secret')));
});

test('cancelling QR creation prevents a late QR session from becoming active', async () => {
    const harness = createHarness();
    const pending = vm.runInContext('startAdbQrPairing()', harness.context);
    const rejected = assert.rejects(pending, /iptal edildi/);
    await harness.request('POST', '/api/adb/pairing-cancel');
    await rejected;
    assert.equal(harness.commands.some(args => args[0] === 'pair'), false);
});

test('a QR session cancelled during discovery never sends a pairing request', async () => {
    const harness = createHarness({ mdns: 'ADB_WIFI_ours _adb-tls-pairing._tcp 192.168.1.21:38001' });
    harness.context.testSession = { mode: 'qr', serviceName: 'ADB_WIFI_ours', password: 'qr-secret', startedAt: Date.now(), cancelled: false };
    const pending = vm.runInContext('runPairingLoop(testSession)', harness.context);
    harness.context.testSession.cancelled = true;
    await pending;
    assert.equal(harness.commands.some(args => args[0] === 'pair'), false);
});

test('wireless phone list includes connect services without a pairing dialog and merges the same IP', async () => {
    const harness = createHarness({ mdns: `${connection}\n${pairing}\nadb-OTHER-new _adb-tls-connect._tcp 192.168.1.21:55501`,
        config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE' }] } });
    const response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services.length, 2);
    assert.equal(response.body.services[0].type, '_adb-tls-connect._tcp');
    assert.equal(response.body.services[0].known, true);
    assert.equal(response.body.services[1].known, false);
    assert.equal(harness.commands.some(args => ['pair', 'connect'].includes(args[0])), false);
});

test('discovered phone identity is read once, saved and reused after its address changes', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876'],
        identity: 'BRQ_DEVICE_IDENTITY\nGalaxy Note10+\nSM-N975F\nAli’nin telefonu',
        config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE' }] } });
    const first = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(first.body.services[0].model, 'Galaxy Note10+');
    assert.equal(first.body.services[0].deviceName, 'Ali’nin telefonu');
    await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(harness.commands.filter(args => args[3]?.startsWith('echo BRQ_DEVICE_IDENTITY')).length, 1);
    assert.equal(harness.state.saves.length, 1);
    harness.connected.clear();
    harness.context.discoverAdbServices = async () => [{ name: 'adb-PHONE-new', type: '_adb-tls-connect._tcp',
        ip: '192.168.1.50', port: 61000 }];
    const moved = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(moved.body.services[0].model, 'Galaxy Note10+');
    assert.equal(moved.body.services[0].deviceName, 'Ali’nin telefonu');
    assert.equal(harness.commands.some(args => ['connect', 'pair'].includes(args[0])), false);
});

test('an empty marketing name resolves the known model and ignores null device names', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876'],
        identity: 'BRQ_DEVICE_IDENTITY\n\nSM-N975F\nnull' });
    const response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services[0].model, 'Galaxy Note10+');
    assert.equal(response.body.services[0].deviceName, '');
});

test('bluetooth name fills a missing device name and remains saved for offline discovery', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876'],
        identity: 'BRQ_DEVICE_IDENTITY\nGalaxy Note10+\nSM-N975F\nnull\nAli Bluetooth\nnull',
        config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE' }] } });
    const response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services[0].deviceName, 'Ali Bluetooth');
    harness.connected.clear();
    const offline = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(offline.body.services[0].deviceName, 'Ali Bluetooth');
});

test('custom device name takes priority over bluetooth', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876'],
        identity: 'BRQ_DEVICE_IDENTITY\nGalaxy\nSM-N975F\nAli Phone\nOther Name\nnull' });
    const response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services[0].deviceName, 'Ali Phone');
});

test('an unavailable identity keeps saved names and unknown phones do not receive shell commands', async () => {
    const harness = createHarness({ mdns: connection, connected: ['192.168.1.20:59876'], identityError: true,
        config: { knownWirelessDevices: [{ serviceName: 'adb-PHONE-old', serial: 'PHONE',
            model: 'Galaxy Note10+', deviceName: 'Ali’nin telefonu' }] } });
    const response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services[0].model, 'Galaxy Note10+');
    harness.connected.clear();
    harness.commands.length = 0;
    await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(harness.commands.some(args => args[0] === '-s'), false);
});

test('connect by discovered service uses its current endpoint without asking for a code', async () => {
    const harness = createHarness({ mdns: connection });
    const response = await harness.request('POST', '/api/adb/connect', { serviceName: 'adb-PHONE-random' });
    assert.equal(response.body.success, true);
    assert.equal(response.body.needsPairing, undefined);
    assert.deepEqual(harness.commands.find(args => args[0] === 'connect'), ['connect', '192.168.1.20:59876']);
    assert.equal(harness.commands.some(args => args[0] === 'pair'), false);
});

test('an unauthorized discovered phone asks for pairing, then resolves the pairing port for that phone', async () => {
    const harness = createHarness({ mdns: `${connection}\n${pairing}`, connectError: true });
    const response = await harness.request('POST', '/api/adb/connect', { serviceName: 'adb-PHONE-random' });
    assert.equal(response.body.needsPairing, true);
    assert.equal(harness.commands.some(args => args[0] === 'pair'), false);
    await harness.request('POST', '/api/adb/pair', { serviceName: 'adb-PHONE-random', code: '123456' });
    assert.deepEqual(harness.commands.find(args => args[0] === 'pair'), ['pair', '192.168.1.20:37001', '123456']);
});

test('a pairing-only service asks for a code without connecting to its pairing port', async () => {
    const harness = createHarness({ mdns: pairing });
    const response = await harness.request('POST', '/api/adb/connect', { serviceName: 'adb-code-phone' });
    assert.equal(response.body.needsPairing, true);
    assert.equal(harness.commands.some(args => args[0] === 'connect'), false);
});

test('generic TLS connection failure offers pairing without asserting revoked authorization', async () => {
    const harness = createHarness({ mdns: connection,
        connectError: 'failed to connect to 192.168.1.20:59876' });
    const response = await harness.request('POST', '/api/adb/connect', { serviceName: 'adb-PHONE-random' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, false);
    assert.equal(response.body.needsPairing, true);
    assert.equal(response.body.reason, 'connection_failed');
    assert.equal(harness.commands.some(args => args[0] === 'pair'), false);
});

test('legacy TCP connection errors remain connection errors', async () => {
    const harness = createHarness({ mdns: 'adb-legacy _adb._tcp 192.168.1.20:5555',
        connectError: 'failed to connect to 192.168.1.20:5555' });
    const response = await harness.request('POST', '/api/adb/connect', { serviceName: 'adb-legacy' });
    assert.equal(response.statusCode, 500);
    assert.equal(response.body.needsPairing, undefined);
});

test('a stale phone selection cannot connect or pair with another discovered phone', async () => {
    const harness = createHarness({ mdns: `${connection}\n${pairing}` });
    const connect = await harness.request('POST', '/api/adb/connect', { serviceName: 'gone' });
    const pair = await harness.request('POST', '/api/adb/pair', { serviceName: 'gone', code: '123456' });
    assert.equal(connect.statusCode, 409);
    assert.equal(pair.statusCode, 409);
    assert.equal(harness.commands.some(args => ['pair', 'connect'].includes(args[0])), false);
});

test('direct LAN discovery supplements empty ADB discovery and deduplicates repeated services', async () => {
    const service = { name: 'adb-PHONE-random', type: '_adb-tls-connect._tcp', ip: '192.168.137.20', port: 59876 };
    const harness = createHarness({ networkServices: [service, { ...service }] });
    const response = await harness.request('GET', '/api/adb/wireless-phones');
    assert.equal(response.body.services.length, 1);
    assert.equal(response.body.services[0].ip, '192.168.137.20');
});

test('DNS parser reads compressed SRV and IPv4 records and rejects pointer loops', () => {
    const harness = createHarness();
    const name = value => Buffer.concat(value.split('.').map(label => Buffer.concat([Buffer.from([label.length]), Buffer.from(label)]))
        .concat([Buffer.from([0])]));
    const srvName = name('adb-phone._adb-tls-connect._tcp.local');
    const hostName = name('android.local');
    const header = Buffer.alloc(12);
    header.writeUInt16BE(0x8400, 2);
    header.writeUInt16BE(2, 6);
    const srvHeader = Buffer.alloc(10);
    srvHeader.writeUInt16BE(33, 0);
    srvHeader.writeUInt32BE(120, 4);
    srvHeader.writeUInt16BE(6 + hostName.length, 8);
    const srvData = Buffer.alloc(6);
    srvData.writeUInt16BE(59876, 4);
    const hostOffset = 12 + srvName.length + 10 + 6;
    const addressHeader = Buffer.alloc(10);
    addressHeader.writeUInt16BE(1, 0);
    addressHeader.writeUInt32BE(120, 4);
    addressHeader.writeUInt16BE(4, 8);
    harness.context.packet = Buffer.concat([header, srvName, srvHeader, srvData, hostName,
        Buffer.from([0xc0 | (hostOffset >> 8), hostOffset & 255]), addressHeader, Buffer.from([192, 168, 137, 20])]);
    const records = JSON.parse(JSON.stringify(vm.runInContext('parseMdnsRecords(packet)', harness.context)));
    assert.equal(records[0].target, 'android.local');
    assert.equal(records[0].port, 59876);
    assert.equal(records[1].name, 'android.local');
    assert.equal(records[1].ip, '192.168.137.20');
    assert.throws(() => vm.runInContext('readDnsName(Buffer.from([0xc0, 0]), 0)', harness.context), /loop/);
    harness.context.packet = harness.context.packet.subarray(0, -1);
    assert.throws(() => vm.runInContext('parseMdnsRecords(packet)', harness.context), /Truncated/);
});

function createPhoneUiHarness(responseData) {
    const uiSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'pc.js'), 'utf8');
    const element = () => ({ value: '', disabled: false, hidden: false, checked: false, dataset: {}, children: [],
        setAttribute(name, value) { this[name] = value; },
        focus() { this.focused = true; }, replaceChildren() { this.value = ''; this.children = []; },
        appendChild(child) { this.children.push(child); } });
    const elements = Object.fromEntries(['pairingDeviceSelect', 'pairingDiscoveryStatus', 'connectPhoneBtn',
        'pairingCodeFields', 'pairingCodeInput', 'pairingCodeBtn', 'discoverPairingBtn', 'manualPairingDetails',
        'refreshAdbQrBtn', 'pairingAddressInput', 'codePairingForm', 'qrPairingDetails', 'pairingUseAddress'].map(key => [key, element()]));
    const panels = new Map();
    elements.pairingDeviceSelect.value = '192.168.137.20';
    elements.pairingCodeFields.hidden = true;
    const requests = [];
    const context = vm.createContext({ ...elements, currentLang: 'tr', isPrivacyMode: false,
        pairingServices: [{ name: 'adb-PHONE-random', ip: '192.168.137.20' }],
        pairingDiscoveryState: 'pairing_found', pairingDiscoveryInProgress: false, pairingDiscoveryFeedbackTimer: null, codePairingInProgress: false,
        currentPairingSession: null, currentDevices: [], pairingMethod: 'discover', qrPairingRequestId: 0,
        window: {}, devicesRequestVersion: 0, pairingDiscoveryVersion: 0,
        document: { createElement: element, querySelectorAll: () => [], getElementById: id => {
            if (!panels.has(id)) panels.set(id, element());
            return panels.get(id);
        } }, maskIdentifier: value => value,
        updatePairStatusBadge() {}, handleAdbPairStatus() {}, renderDevices() {}, showToast() {},
        fetch: async (url, options) => {
            requests.push({ url, body: options?.body ? JSON.parse(options.body) : undefined });
            return { ok: true, json: async () => responseData };
        }
    });
    loadUiRequestHelpers(context, uiSource);
    vm.runInContext(uiSource.slice(uiSource.indexOf('const i18n ='), uiSource.indexOf('let currentLang')), context);
    vm.runInContext(uiSource.slice(uiSource.indexOf('function updatePairingFormState()'),
        uiSource.indexOf('function updatePairStatusBadge()')), context);
    return { elements, context, requests, panels };
}

test('phone list shows model and device name without exposing the technical service name', () => {
    const ui = createPhoneUiHarness({});
    Object.assign(ui.context.pairingServices[0], { model: 'Galaxy Note10+', deviceName: 'Ali’nin telefonu' });
    ui.context.renderPairingDiscovery();
    assert.equal(ui.elements.pairingDeviceSelect.children[1].textContent,
          'Ali’nin telefonu · Galaxy Note10+ · 192.168.137.20');
    assert.equal(ui.elements.pairingDeviceSelect.value, '192.168.137.20');
    ui.context.pairingServices[0].deviceName = 'Galaxy Note10+';
    ui.context.renderPairingDiscovery();
    assert.equal(ui.elements.pairingDeviceSelect.children[1].textContent, 'Galaxy Note10+ · 192.168.137.20');
});

test('unknown phone labels stay readable and identity labels respect privacy mode', () => {
    const ui = createPhoneUiHarness({});
    ui.context.renderPairingDiscovery();
    assert.equal(ui.elements.pairingDeviceSelect.children[1].textContent, 'Telefon 1 · 192.168.137.20');
    Object.assign(ui.context.pairingServices[0], { model: 'Galaxy Note10+', deviceName: 'Ali’nin telefonu' });
    ui.context.isPrivacyMode = true;
    ui.context.maskIdentifier = () => '***';
    ui.context.renderPairingDiscovery();
    assert.equal(ui.elements.pairingDeviceSelect.children[1].textContent, '*** · *** · ***');
});

test('phone UI connects an authorized device without showing or sending a pairing code', async () => {
    const ui = createPhoneUiHarness({ success: true, devices: [{ id: 'phone' }] });
    await ui.elements.connectPhoneBtn.onclick();
    assert.equal(ui.elements.pairingCodeFields.hidden, true);
    assert.deepEqual(ui.requests, [{ url: '/api/adb/connect', body: { serviceName: 'adb-PHONE-random' } }]);
    assert.equal(ui.elements.connectPhoneBtn.disabled, false);
});

test('phone UI shows the code field only when authorization is required', async () => {
    const ui = createPhoneUiHarness({ success: false, needsPairing: true });
    await ui.elements.connectPhoneBtn.onclick();
    assert.equal(ui.elements.pairingCodeFields.hidden, false);
    assert.equal(ui.elements.pairingCodeInput.focused, true);
    ui.elements.pairingCodeInput.value = '123456';
    ui.elements.pairingDeviceSelect.onchange();
    assert.equal(ui.elements.pairingCodeInput.value, '');
    assert.equal(ui.elements.pairingCodeFields.hidden, true);
});

test('phone UI keeps manual pairing available when automatic discovery finds no phones', async () => {
    const ui = createPhoneUiHarness({ success: true, session: { status: 'paired_need_port' } });
    ui.context.pairingServices = [];
    ui.context.pairingMethod = 'code';
    ui.elements.pairingCodeFields.hidden = false;
    ui.elements.pairingUseAddress.checked = true;
    ui.elements.pairingUseAddress.onchange();
    assert.equal(ui.elements.pairingCodeFields.hidden, false);
    assert.equal(ui.elements.connectPhoneBtn.disabled, true);
    ui.elements.pairingAddressInput.value = '192.168.137.20:37001';
    ui.elements.pairingCodeInput.value = '123456';
    await ui.elements.codePairingForm.onsubmit({ preventDefault() {} });
    assert.deepEqual(ui.requests, [{ url: '/api/adb/pair', body: { code: '123456', ip: '192.168.137.20', port: '37001' } }]);
    assert.equal(ui.elements.connectPhoneBtn.disabled, true);
});

test('method selection shows only the selected form and clears the previous code', async () => {
    const ui = createPhoneUiHarness({ success: true, services: [] });
    ui.elements.pairingCodeInput.value = '123456';
    await vm.runInContext("selectPairingMethod('ip')", ui.context);
    assert.equal(ui.elements.codePairingForm.hidden, true);
    assert.equal(ui.elements.qrPairingDetails.hidden, true);
    assert.equal(ui.panels.get('ip-connection-fields').hidden, false);
    assert.equal(ui.elements.pairingCodeInput.value, '');
    await vm.runInContext("selectPairingMethod('code')", ui.context);
    assert.equal(ui.elements.codePairingForm.hidden, false);
    assert.equal(ui.elements.pairingCodeFields.hidden, false);
    assert.equal(ui.elements.connectPhoneBtn.hidden, true);
    assert.equal(ui.panels.get('ip-connection-fields').hidden, true);
    assert.equal(ui.elements.manualPairingDetails.hidden, true);
});

test('leaving QR cancels the waiting session before displaying another method', async () => {
    const ui = createPhoneUiHarness({ success: true });
    ui.context.pairingMethod = 'qr';
    ui.context.currentPairingSession = { mode: 'qr', status: 'waiting_for_scan' };
    await vm.runInContext("selectPairingMethod('ip')", ui.context);
    assert.equal(ui.context.currentPairingSession, null);
    assert.deepEqual(ui.requests, [{ url: '/api/adb/pairing-cancel', body: undefined }]);
    assert.equal(ui.context.pairingMethod, 'ip');
});

test('discovery losing the selected phone keeps manual recovery and never selects another phone', () => {
    const ui = createPhoneUiHarness({ success: true });
    ui.elements.pairingCodeFields.hidden = false;
    ui.context.pairingServices = [{ name: 'adb-OTHER-new', ip: '192.168.137.21' }];
    vm.runInContext('renderPairingDiscovery()', ui.context);
    assert.equal(ui.elements.pairingDeviceSelect.value, '');
    assert.equal(ui.elements.pairingCodeFields.hidden, false);
});

function createDisconnectUiHarness(fetch) {
    const uiSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'pc.js'), 'utf8');
    const messages = [];
    const context = vm.createContext({
        window: {}, fetch, disconnectingDevices: new Set(), devicesRequestVersion: 0, pairingDiscoveryVersion: 0,
        currentDevices: [{ id: 'phone', state: 'device' }], selectedDevice: 'phone',
        currentPairingSession: { status: 'connected' }, lastPairedIp: '192.168.1.20',
        quickPortBox: { style: {} }, currentLang: 'tr',
        i18n: { tr: { toast_disconnected: 'Kesildi:', toast_device_refreshed: 'Liste güncellendi' } },
        renderDevices() {}, discoverPairingPhones: async () => {}, updatePairStatusBadge() {}, maskIdentifier: value => value, showToast: message => messages.push(message)
    });
    loadUiRequestHelpers(context, uiSource);
    vm.runInContext(uiSource.slice(uiSource.indexOf('window.disconnectDevice ='),
        uiSource.indexOf('// --- 60 FPS Video Stream & Controls ---')), context);
    vm.runInContext(uiSource.slice(uiSource.indexOf('async function refreshDevices()'),
        uiSource.indexOf('// Drag & Drop (Universal File Transfer & APK)')), context);
    return { context, messages };
}

test('disconnect UI applies the confirmed device list and ignores an older refresh result', async () => {
    let finishRefresh;
    const ui = createDisconnectUiHarness(async (url) => {
        if (url === '/api/adb/devices') return new Promise(resolve => { finishRefresh = resolve; });
        return { ok: true, json: async () => ({ success: true, devices: [], selectedAdbDevice: '' }) };
    });
    const staleRefresh = vm.runInContext('refreshDevices()', ui.context);
    await ui.context.window.disconnectDevice('phone');
    finishRefresh({ ok: true, json: async () => [{ id: 'phone', state: 'device' }] });
    await staleRefresh;
    assert.equal(ui.context.currentDevices.length, 0);
    assert.equal(ui.context.selectedDevice, '');
    assert.equal(ui.context.currentPairingSession, null);
    assert.deepEqual(ui.messages, ['Kesildi: phone']);
});

test('disconnect UI preserves the device and displays the server error on failure', async () => {
    const ui = createDisconnectUiHarness(async () => ({ ok: false,
        json: async () => ({ success: false, error: 'Cihaz hâlâ bağlı', devices: [{ id: 'phone' }] }) }));
    await ui.context.window.disconnectDevice('phone');
    assert.equal(ui.context.currentDevices[0].id, 'phone');
    assert.equal(ui.context.selectedDevice, 'phone');
    assert.equal(ui.context.disconnectingDevices.size, 0);
    assert.deepEqual(ui.messages, ['Cihaz hâlâ bağlı']);
});

test('a device poll started before disconnect cannot publish its old battery-enriched device list', async () => {
    let finishBattery;
    let reads = 0;
    const h = require('./helpers/server-harness')({ command: args => {
        if (args[0] === 'devices') return ++reads === 1 ? 'List of devices attached\n192.168.1.20:59876 device model:Phone\n' : 'List of devices attached\n';
        if (args.includes('battery')) return new Promise(resolve => { finishBattery = resolve; });
        return '';
    } });
    const pending = h.eval('getAdbDevices(true)');
    while (!finishBattery) await new Promise(resolve => setImmediate(resolve));
    h.eval('adbDeviceMutationVersion++');
    finishBattery('level: 80');
    assert.equal((await pending).length, 0);
    assert.equal(reads, 2);
});
