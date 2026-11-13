const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const createHarness = require('./helpers/server-harness');

function request(url, options = {}, body) {
    return new Promise((resolve, reject) => {
        const req = require('node:http').request(url, { ...options, headers: { host: 'localhost:4500', ...options.headers } }, res => {
            const chunks = []; res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString();
                let json; try { json = JSON.parse(text); } catch (_) {}
                resolve({ status: res.statusCode, headers: res.headers, text, json });
            });
        });
        req.on('error', reject); req.end(body);
    });
}
const cookieOf = (response, name) => (response.headers['set-cookie'] || []).map(item => item.split(';')[0]).find(item => item.startsWith(name + '='));

async function setup(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brq-mobile-'));
    const h = createHarness({ http: true, diskRoot: root });
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    t.after(async () => {
        h.server.closeAllConnections(); await new Promise(resolve => h.server.close(resolve));
        fs.rmSync(root, { recursive: true, force: true });
    });
    const base = `http://127.0.0.1:${h.server.address().port}`;
    const admin = cookieOf(await request(base + '/?session=' + h.eval('dashboardBootstrap')), 'brq_admin');
    // Every test request arrives over loopback; pretend it came from another LAN device.
    h.eval('isLoopbackRequest = () => false');
    return { h, root, base, admin };
}
const json = (cookie, body) => ({ method: 'POST', headers: { cookie, 'content-type': 'application/json' } });

test('a LAN phone without the QR key gets no transfer rights until the PC approves it', async t => {
    const { h, base, admin } = await setup(t);
    const page = await request(base + '/mobile');
    // The page itself is public (it shows the waiting screen); only the cookie is withheld.
    assert.equal(cookieOf(page, 'brq_mobile'), undefined);
    assert.equal((await request(base + '/api/shared')).status, 403);
    assert.equal((await request(base + '/api/apks')).status, 403);

    const asked = await request(base + '/api/mobile/access/request', json(''), '{}');
    assert.equal(asked.json.status, 'pending');
    const pendingCookie = cookieOf(asked, 'brq_mobile_req');
    assert.ok(h.events.some(event => event.type === 'MOBILE_ACCESS_REQUESTS' && event.requests.length === 1));
    // The phone itself cannot approve its own request.
    const id = h.eval('[...mobileAccessRequests.keys()][0]');
    assert.equal((await request(base + '/api/mobile/access/decide', json(pendingCookie), JSON.stringify({ id, approve: true }))).status, 403);
    assert.equal((await request(base + '/api/mobile/access/decide', json(admin), JSON.stringify({ id, approve: true }))).status, 200);

    const granted = await request(base + '/api/mobile/access', { headers: { cookie: pendingCookie } });
    assert.equal(granted.json.authorized, true);
    const phone = cookieOf(granted, 'brq_mobile');
    assert.equal((await request(base + '/api/shared', { headers: { cookie: phone } })).status, 200);
    // Phone rights never include admin routes.
    assert.equal((await request(base + '/api/status', { headers: { cookie: phone } })).status, 403);
});

test('the QR key is exchanged for a cookie, and resetting access revokes every phone', async t => {
    const { h, base, admin } = await setup(t);
    assert.equal(cookieOf(await request(base + '/mobile?k=wrong'), 'brq_mobile'), undefined);
    const scanned = await request(base + '/mobile?k=' + h.eval('mobileAccessKey'));
    assert.equal(scanned.status, 302);
    assert.equal(scanned.headers.location, '/mobile');
    const phone = cookieOf(scanned, 'brq_mobile');
    assert.equal((await request(base + '/api/shared', { headers: { cookie: phone } })).status, 200);
    const oldKey = h.eval('mobileAccessKey');
    const reset = await request(base + '/api/mobile/access/reset', json(admin), '{}');
    assert.equal(reset.status, 200);
    assert.ok(reset.json.url.endsWith('?k=' + h.eval('mobileAccessKey')));
    assert.notEqual(h.eval('mobileAccessKey'), oldKey);
    assert.equal((await request(base + '/api/shared', { headers: { cookie: phone } })).status, 403);
    assert.equal(cookieOf(await request(base + '/mobile?k=' + oldKey), 'brq_mobile'), undefined);
});

test('phone uploads resume at the confirmed offset and produce the exact file', async t => {
    const { h, root, base } = await setup(t);
    const phone = cookieOf(await request(base + '/mobile?k=' + h.eval('mobileAccessKey')), 'brq_mobile');
    const content = Buffer.from('0123456789abcdefghij');
    const meta = JSON.stringify({ name: 'tatil videosu.mp4', size: content.length, lastModified: 1234 });
    const created = await request(base + '/api/upload/mobile-to-pc/sessions', json(phone), meta);
    assert.equal(created.json.received, 0);
    const chunk = (offset, bytes) => request(`${base}/api/upload/mobile-to-pc/sessions/${created.json.id}/chunk?offset=${offset}`,
        { method: 'POST', headers: { cookie: phone, 'content-type': 'application/octet-stream' } }, bytes);
    assert.equal((await chunk(0, content.subarray(0, 8))).json.received, 8);
    // A retried or stale chunk is refused and tells the phone where to continue.
    const stale = await chunk(0, content.subarray(0, 8));
    assert.equal(stale.status, 409);
    assert.equal(stale.json.received, 8);
    // Re-selecting the same file (e.g. after a reload) resumes the same session.
    const resumed = await request(base + '/api/upload/mobile-to-pc/sessions', json(phone), meta);
    assert.deepEqual([resumed.json.id, resumed.json.received], [created.json.id, 8]);
    // Another phone cannot touch this session.
    const other = cookieOf(await request(base + '/mobile?k=' + h.eval('mobileAccessKey')), 'brq_mobile');
    assert.equal((await request(`${base}/api/upload/mobile-to-pc/sessions/${created.json.id}`, { headers: { cookie: other } })).status, 404);
    assert.equal((await chunk(8, Buffer.concat([content.subarray(8), Buffer.from('extra')]))).status, 400);
    assert.equal((await request(`${base}/api/upload/mobile-to-pc/sessions/${created.json.id}/complete`, json(phone), '{}')).status, 409);
    assert.equal((await chunk(8, content.subarray(8))).json.received, content.length);
    const done = await request(`${base}/api/upload/mobile-to-pc/sessions/${created.json.id}/complete`, json(phone), '{}');
    assert.equal(done.status, 200);
    assert.equal(done.json.file.filename, 'tatil videosu.mp4');
    assert.equal(done.json.file.localPath, undefined);
    const record = h.eval('transfersList[0]');
    assert.equal(record.direction, 'mobile-to-pc');
    assert.deepEqual(fs.readFileSync(record.localPath), content);
    assert.equal(fs.readdirSync(path.join(root, 'received')).some(name => name.endsWith('.part')), false);
});

test('files sent from the PC can be downloaded on an authorized phone, including byte ranges', async t => {
    const { h, root, base } = await setup(t);
    const phone = cookieOf(await request(base + '/mobile?k=' + h.eval('mobileAccessKey')), 'brq_mobile');
    const localPath = path.join(root, 'uploads', 'copy.pdf');
    fs.writeFileSync(localPath, 'PDF-CONTENT');
    h.context.fixturePath = localPath;
    h.eval('transfersList=[{id:"pc1",direction:"pc-to-phone",status:"saved",filename:"Sözleşme.pdf",size:"11 Bytes",rawSize:11,localPath:fixturePath},{id:"in1",direction:"mobile-to-pc",status:"transferred",filename:"x",localPath:fixturePath}]');
    const list = await request(base + '/api/shared', { headers: { cookie: phone } });
    assert.deepEqual(list.json.files.map(file => file.id), ['pc1']);
    assert.equal(JSON.stringify(list.json).includes(root), false);
    const full = await request(base + '/download/file/pc1', { headers: { cookie: phone } });
    assert.equal(full.text, 'PDF-CONTENT');
    assert.match(full.headers['content-disposition'], /filename\*=UTF-8''S%C3%B6zle%C5%9Fme\.pdf/);
    const partial = await request(base + '/download/file/pc1', { headers: { cookie: phone, range: 'bytes=4-' } });
    assert.equal(partial.status, 206);
    assert.equal(partial.text, 'CONTENT');
    // Files the phone sent to the PC are not offered back through this route.
    assert.equal((await request(base + '/download/file/in1', { headers: { cookie: phone } })).status, 404);
});
