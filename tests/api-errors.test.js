const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');

test('adbFailuresHaveStableCodesWithoutRawCommandOrPath', async () => {
    for (const [error, code, status] of [
        [Object.assign(new Error('private-command'), { code: 'ENOENT' }), 'ADB_NOT_FOUND', 503],
        [Object.assign(new Error('private-command'), { killed: true }), 'ADB_TIMEOUT', 504],
        [new Error('device offline private-command'), 'DEVICE_OFFLINE', 409],
        [new Error('unauthorized private-command'), 'DEVICE_UNAUTHORIZED', 409],
        [new Error('INSTALL_FAILED_UPDATE_INCOMPATIBLE private-command'), 'INSTALL_SIGNATURE_MISMATCH', 502],
        [new Error('INSTALL_FAILED_OLDER_SDK private-command'), 'INSTALL_SDK_UNSUPPORTED', 502]
    ]) {
        const h = createHarness({ command: () => { throw error; } });
        await assert.rejects(h.eval('runAdbCommand(["fixture"])'), actual => {
            assert.equal(actual.code, code);
            assert.equal(actual.status, status);
            assert.equal(actual.message.includes('private-command'), false);
            return true;
        });
    }
});

test('filesystemErrorDoesNotExposePrivatePath', () => {
    const h = createHarness();
    h.context.fixtureError = Object.assign(new Error('EACCES: C:/private/secret-file'), { code: 'EACCES' });
    const result = h.eval('sendApiError({status(value){this.statusCode=value;return this},json(value){return value}},fixtureError)');
    assert.equal(result.error.message.includes('secret-file'), false);
    assert.equal(result.error.code, 'FILE_ACCESS_DENIED');
});

test('invalidConfigReturns400AndOversizeUploadReturns413', async () => {
    const h = createHarness();
    const response = await h.request('POST', '/api/config', { autoInstallOnAdb: 'yes' });
    assert.equal(response.statusCode, 400);
    const result = h.eval('sendApiError({status(value){this.statusCode=value;return this},json(value){return {status:this.statusCode,...value}}},Object.assign(new Error("fixture"),{code:"LIMIT_FILE_SIZE"}))');
    assert.equal(result.status, 413);
    assert.equal(typeof result.operationId, 'string');
});

test('httpDisconnectCancelsOwnedAdbCommand', { timeout: 3000 }, async t => {
    let started, cancelled;
    const running = new Promise(resolve => { started = resolve; });
    const stopped = new Promise(resolve => { cancelled = resolve; });
    const h = createHarness({ http: true, execFile(binary, args, options, callback) {
        if (args[0] === 'devices') { queueMicrotask(() => callback(null, 'List of devices attached\nUSB\tdevice', '')); return; }
        started();
        options.signal?.addEventListener('abort', () => { cancelled(); callback(Object.assign(new Error('cancelled'), { name: 'AbortError' }), '', ''); }, { once: true });
    } });
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    t.after(async () => { h.server.closeAllConnections(); await new Promise(resolve => h.server.close(resolve)); });
    const req = require('node:http').request({ host: '127.0.0.1', port: h.server.address().port, path: '/api/adb/launch', method: 'POST', headers: {
        host: 'localhost:4500', cookie: 'brq_admin=' + h.eval('adminSession'), 'content-type': 'application/json'
    } });
    req.on('error', () => {});
    req.end('{"deviceId":"USB","packageName":"com.fixture.app"}');
    await running;
    req.destroy();
    await stopped;
});

test('legacyPairingCatchPreservesMissingToolStatus', async () => {
    const h = createHarness({ command: () => { throw Object.assign(new Error('private tool path'), { code: 'ENOENT' }); } });
    const response = await h.request('POST', '/api/adb/pair', { ip: '192.168.1.4', port: 12345, code: '123456' });
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error.code, 'ADB_NOT_FOUND');
});

test('mobileDiskFailureUsesSanitizedErrorContract', async () => {
    const h = createHarness({ fsOverrides: { renameSync() { throw Object.assign(new Error('private filename'), { code: 'EACCES' }); } } });
    const response = await h.request('POST', '/api/upload/mobile-to-pc', {}, { files: [{ path: '/fixture.part', filename: 'fixture.part', originalname: 'fixture', size: 1 }] });
    assert.equal(response.body.error.code, 'FILE_ACCESS_DENIED');
    assert.equal(JSON.stringify(response.body).includes('private filename'), false);
});
