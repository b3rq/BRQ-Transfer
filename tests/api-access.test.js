const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');
function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const request = require('node:http').request(url, options, response => {
            const chunks = []; response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => { let body; try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch (_) {}
                resolve({ status: response.statusCode, body,
                headers: { get: name => Array.isArray(response.headers[name]) ? response.headers[name][0] : response.headers[name] } }); });
        }).on('error', reject);
        request.end(options.body);
    });
}
test('lanClientCannotExecuteAdminOperation', () => {
    const h = createHarness();
    assert.equal(h.eval("isAdminRequest({headers:{host:'localhost:4500'},socket:{remoteAddress:'192.168.1.4'}})"), false);
});
test('untrustedOriginCannotUpgradeAdminWs', () => {
    const h = createHarness();
    assert.equal(h.eval("isAdminRequest({headers:{host:'localhost:4500',origin:'https://evil.example',cookie:'brq_admin='+adminSession},socket:{remoteAddress:'127.0.0.1'}})"), false);
});
test('loopbackMobileDoesNotInheritAdminRights', () => {
    const h = createHarness();
    assert.equal(h.eval("isAdminRequest({headers:{host:'localhost:4500',origin:'http://localhost:4500'},socket:{remoteAddress:'127.0.0.1'}})"), false);
});
test('realHttpMiddlewareRequiresDashboardSessionAndRejectsForeignOrigin', async t => {
    const h = createHarness({ http: true });
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => h.server.close(resolve)));
    const base = `http://127.0.0.1:${h.server.address().port}`;
    const headers = { host: 'localhost:4500' };
    const forbidden = await fetch(base + '/api/status', { headers });
    assert.equal(forbidden.status, 403);
    assert.equal(typeof forbidden.body?.error?.message, 'string');
    assert.equal((await fetch(base + '/', { headers })).status, 403);
    const dashboard = await fetch(base + '/?session=' + h.eval('dashboardBootstrap'), { headers });
    const cookie = dashboard.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(base + '/api/status', { headers: { ...headers, cookie } })).status, 200);
    assert.equal((await fetch(base + '/api/status', { headers: { ...headers, cookie, origin: 'https://evil.example' } })).status, 403);
    const mobile = await fetch(base + '/mobile', { headers });
    const mobileCookie = mobile.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(base + '/api/status', { headers: { ...headers, cookie: mobileCookie } })).status, 403);
    const unity = { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{"apkPath":"missing.apk"}' };
    assert.equal((await fetch(base + '/api/unity-build-done', unity)).status, 403);
    assert.equal((await fetch(base + '/api/unity-build-done', { ...unity, headers: { ...unity.headers, 'x-brq-local-session': h.eval('unitySession') } })).status, 404);
    const previous = h.eval('dashboardBootstrap');
    h.eval('fs.renameSync=()=>{throw new Error("fixture rename denied")}');
    assert.equal((await fetch(base + '/?session=' + previous, { headers })).status, 500);
    assert.equal(h.eval('dashboardBootstrap') === previous, true);
});
test('mobileSessionReceivesOnlyPublicApkData', async () => {
    const h = createHarness();
    const ws = new (require('node:events').EventEmitter)();
    const messages = []; ws.send = text => messages.push(JSON.parse(text));
    h.eval('apkList=[{id:"one",name:"Fixture",filePath:"private-path"}]');
    h.wss.emit('connection', ws, { headers: { host: 'localhost:4500', cookie: 'brq_mobile=' + h.eval('mobileSession') }, socket: { remoteAddress: '192.168.1.5' } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(messages[0].config, undefined);
    assert.equal(messages[0].apks[0].filePath, undefined);
    assert.equal(messages[0].devices, undefined);
});
