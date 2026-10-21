const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const createHarness = require('./helpers/server-harness');

test('screenshotRejectsSignatureWithoutValidDimensions', async () => {
    const png = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : png });
    const result = await h.request('GET', '/api/adb/screenshot', { deviceId: 'USB' });
    assert.equal(result.statusCode, 502);
    assert.equal(result.body.error.code, 'SCREENSHOT_INVALID');
});

test('downloadStreamFailureIsControlledForApkAndCompanion', async t => {
    let streamsClosed = 0;
    const h = createHarness({ http: true, fsOverrides: { createReadStream() {
        const stream = new Readable({ read() { this.destroy(new Error('fixture read failure')); } });
        stream.on('close', () => streamsClosed++); return stream;
    } } });
    h.files.set(h.eval('path.join(PUBLIC_DIR,"UnityCompanion.apk")'), 'fixture');
    h.files.set('/fixture.apk', 'fixture');
    h.eval('apkList=[{id:"fixture",name:"fixture.apk",filePath:"/fixture.apk"}]');
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    t.after(async () => { h.server.closeAllConnections(); await new Promise(resolve => h.server.close(resolve)); });
    for (const path of ['/download/fixture', '/download-companion']) {
        await new Promise((resolve, reject) => {
            const req = require('node:http').get({ host: '127.0.0.1', port: h.server.address().port, path,
                headers: { host: 'localhost:4500', cookie: 'brq_admin=' + h.eval('adminSession') } }, res => {
                res.resume(); res.on('end', resolve); res.on('error', resolve);
            });
            req.on('error', resolve); req.setTimeout(1000, () => { req.destroy(); reject(new Error('download hung')); });
        });
    }
    assert.equal(streamsClosed, 2);
});

test('downloadAndInstallResolveExactRequestedFile', async t => {
    const installed = [];
    const h = createHarness({ http: true, command: args => {
        if (args[0] === 'devices') return 'List of devices attached\nUSB\tdevice';
        if (args.includes('install')) installed.push(Buffer.from(h.files.get(args.at(-1))));
        return '';
    }, fsOverrides: { createReadStream: file => Readable.from([h.files.get(file)]) } });
    const archives = ['A', 'B'].map(comment => {
        const bytes = Buffer.alloc(124); bytes.writeUInt32LE(0x06054b50, 101);
        bytes.writeUInt16LE(1, 109); bytes.writeUInt16LE(1, 111); bytes.writeUInt32LE(46, 113); bytes.writeUInt32LE(55, 117);
        bytes.writeUInt16LE(1, 121); bytes.write(comment, 123); return bytes;
    });
    h.files.set('/build/one.apk', archives[0]); h.files.set('/build/two.apk', archives[1]);
    const first = await h.eval('registerApk("/build/one.apk")');
    const second = await h.eval('registerApk("/build/two.apk")');
    await new Promise(resolve => h.server.listenForTest(0, '127.0.0.1', resolve));
    t.after(async () => { h.server.closeAllConnections(); await new Promise(resolve => h.server.close(resolve)); });
    for (const [index, apk] of [first, second].entries()) {
        const bytes = await new Promise((resolve, reject) => {
            require('node:http').get({ host: '127.0.0.1', port: h.server.address().port, path: '/download/' + apk.id,
                headers: { host: 'localhost:4500', cookie: 'brq_admin=' + h.eval('adminSession') } }, res => {
                const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve(Buffer.concat(chunks))); res.on('error', reject);
            }).on('error', reject);
        });
        assert.ok(bytes.equals(archives[index]));
        h.context.selectedApk = apk;
        await h.eval('installApkViaAdb("USB",selectedApk.filePath,selectedApk)');
        assert.ok(installed[index].equals(archives[index]));
    }
});
