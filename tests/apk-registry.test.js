const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');

function fixture() {
    const h = createHarness();
    const archive = Buffer.alloc(123);
    archive.writeUInt32LE(0x06054b50, 101);
    archive.writeUInt16LE(1, 109); archive.writeUInt16LE(1, 111);
    archive.writeUInt32LE(46, 113); archive.writeUInt32LE(55, 117);
    for (const name of ['one.apk', 'two.apk']) h.files.set('/build/outputs/' + name, archive);
    h.eval('extractApkMetadata = async () => ({label:"Fixture", packageName:""})');
    return h;
}
test('sameDirectoryDifferentApksHaveDifferentIds', async () => {
    const h = fixture();
    const a = await h.eval('registerApk("/build/outputs/one.apk")');
    const b = await h.eval('registerApk("/build/outputs/two.apk")');
    assert.notEqual(a.id, b.id);
});
test('concurrentSameApkRegistersOnce', async () => {
    const h = fixture();
    await h.eval('Promise.all([registerApk("/build/outputs/one.apk"), registerApk("/build/outputs/one.apk")])');
    assert.equal(h.eval('apkList.length'), 1);
    assert.equal(h.events.filter(e => e.type === 'NEW_APK').length, 1);
});
test('startupScanNeverAutoInstalls', async () => {
    const h = fixture();
    h.eval('config.autoInstallOnAdb = true; config.selectedAdbDevice = "USB"; installApkViaAdb = () => { throw new Error("startup install"); }');
    assert.ok(await h.eval('registerApk("/build/outputs/one.apk", "startup")'));
});
test('changedRevisionIsNeverInstalled', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : '' });
    await assert.rejects(h.eval('installApkViaAdb("USB", "/build/fixture.apk", {revision:"old"})'), /değişti/);
    assert.equal(h.commands.some(args => args.includes('install')), false);
});
test('partialBuildIsNotRegistered', async () => {
    const h = fixture();
    h.files.set('/build/outputs/one.apk', Buffer.from('PK incomplete archive'));
    assert.equal(await h.eval('registerApk("/build/outputs/one.apk", "folder-watcher")'), null);
    assert.equal(h.events.length, 0);
});
test('malformedArchiveAtOffsetZeroCannotHangParser', () => {
    const h = fixture();
    const bytes = Buffer.alloc(50); bytes.writeUInt32LE(0x06054b50, 0);
    h.files.set('/build/outputs/one.apk', bytes);
    const result = require('node:vm').runInContext('isCompleteApk("/build/outputs/one.apk",50)', h.context, { timeout: 50 });
    assert.equal(result, false);
});

test('installTargetFailurePublishesOneTerminalEventWithSameOperationId', async () => {
    const h = createHarness();
    let failure;
    try { await h.eval('installApkViaAdb("MISSING","fixture.apk")'); } catch (error) { failure = error; }
    const events = h.events.filter(event => event.type === 'ADB_INSTALL_ERROR');
    assert.equal(events.length, 1);
    assert.equal(events[0].operationId, failure.operationId);
    assert.equal(typeof failure.operationId, 'string');
});
