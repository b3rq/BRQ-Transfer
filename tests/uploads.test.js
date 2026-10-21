const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const createHarness = require('./helpers/server-harness');
function request(url, options = {}, body) {
    return new Promise((resolve, reject) => {
        const req = require('node:http').request(url, { ...options, headers: { host: 'localhost:4500', ...options.headers } }, res => {
            const chunks = []; res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() }));
        });
        req.on('error', reject); req.end(body);
    });
}

test('uploadBudgetIncludesAllFilesAndRejectsOnlyAboveBoundary', () => {
    const h = createHarness();
    h.context.uploadRequest = {};
    h.eval('accountUploadBytes(uploadRequest, 2000*1024*1024); accountUploadBytes(uploadRequest, 2000*1024*1024)');
    assert.throws(() => h.eval('accountUploadBytes(uploadRequest,1)'), error => error.code === 'LIMIT_TOTAL_SIZE' && error.status === 413);
});
test('realMultipartSameNameUploadsKeepBothHashesAndRejectUnexpectedFields', async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brq-test-'));
    const h = createHarness({ http: true, multipart: true, diskRoot: root });
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    t.after(async () => {
        h.server.closeAllConnections(); await new Promise(resolve => h.server.close(resolve));
        assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith('brq-test-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    const base = `http://127.0.0.1:${h.server.address().port}`;
    const bootstrap = await request(base + '/?session=' + h.eval('dashboardBootstrap'));
    const cookie = bootstrap.headers['set-cookie'][0].split(';')[0];
    const upload = (content, field = 'file') => {
        const body = Buffer.from(`--fixture\r\nContent-Disposition: form-data; name="${field}"; filename="Türkçe.txt"\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--fixture--\r\n`);
        return request(base + '/api/upload', { method: 'POST', headers: { cookie, 'content-type': 'multipart/form-data; boundary=fixture' } }, body);
    };
    const responses = await Promise.all([upload('ONE'), upload('TWO')]);
    for (const response of responses) {
        assert.equal(response.status, 200);
        assert.equal(JSON.parse(response.text).transfer.filename, 'Türkçe.txt');
    }
    const stored = fs.readdirSync(path.join(root, 'uploads'));
    assert.equal(stored.length, 2);
    const hash = value => crypto.createHash('sha256').update(value).digest('hex');
    assert.deepEqual(stored.map(name => hash(fs.readFileSync(path.join(root, 'uploads', name)))).sort(), [hash('ONE'), hash('TWO')].sort());
    const invalid = await upload('BAD', 'unexpected');
    assert.equal(invalid.status, 400);
    assert.equal(JSON.parse(invalid.text).error.code, 'LIMIT_UNEXPECTED_FILE');
    const cancelled = require('node:http').request(base + '/api/upload', { method: 'POST', headers: {
        host: 'localhost:4500', cookie, 'content-type': 'multipart/form-data; boundary=fixture', 'content-length': 1000000
    } });
    cancelled.on('error', () => {});
    cancelled.write('--fixture\r\nContent-Disposition: form-data; name="file"; filename="cancelled.txt"\r\nContent-Type: text/plain\r\n\r\npartial');
    const deadline = Date.now() + 1000;
    while (!fs.readdirSync(path.join(root, 'uploads')).some(name => name.endsWith('.part')) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
    cancelled.destroy();
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(fs.readdirSync(path.join(root, 'uploads')).filter(name => name.endsWith('.part')).length, 0);
});

test('exactUploadBoundaryIsAcceptedAndNextByteIsRejectedByRealParser', async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brq-boundary-'));
    const realMulter = require('multer');
    // Scale the production budget to 3 bytes while preserving its boundary offset.
    const scaledMulter = options => realMulter({ ...options, limits: { ...options.limits, fileSize: options.limits.fileSize - 2000 * 1024 * 1024 + 3 } });
    scaledMulter.diskStorage = realMulter.diskStorage;
    const h = createHarness({ http: true, diskRoot: root, multipart: true, multer: scaledMulter });
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    t.after(async () => {
        h.server.closeAllConnections(); await new Promise(resolve => h.server.close(resolve));
        assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('brq-boundary-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    const base = 'http://127.0.0.1:' + h.server.address().port;
    const cookie = 'brq_admin=' + h.eval('adminSession');
    for (const [content, status] of [['', 200], ['123', 200], ['1234', 413]]) {
        const body = Buffer.from(`--fixture\r\nContent-Disposition: form-data; name="file"; filename="CON.txt"\r\n\r\n${content}\r\n--fixture--\r\n`);
        const response = await request(base + '/api/upload', { method: 'POST', headers: { cookie, 'content-type': 'multipart/form-data; boundary=fixture' } }, body);
        assert.equal(response.status, status);
    }
    const body = Buffer.from(Array.from({ length: 51 }, (_, n) => `--fixture\r\nContent-Disposition: form-data; name="files"; filename="${n}.txt"\r\n\r\n\r\n`).join('') + '--fixture--\r\n');
    assert.equal((await request(base + '/api/upload/mobile-to-pc', { method: 'POST', headers: { cookie, 'content-type': 'multipart/form-data; boundary=fixture' } }, body)).status, 413);
    assert.equal(fs.readdirSync(path.join(root, 'received')).length, 0);
});
