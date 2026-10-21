const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');

test('writeFailureIsNotReportedSaved', () => {
    const h = createHarness({ writeError: true });
    assert.throws(() => h.eval('saveConfig()'), /kaydedilemedi/);
});
test('invalidConfigTypesAreRejected', () => {
    const h = createHarness({ configText: '{"knownWirelessDevices":{},"autoInstallOnAdb":"yes"}' });
    assert.equal(h.eval('Array.isArray(config.knownWirelessDevices)'), true);
    assert.equal(h.eval('config.autoInstallOnAdb'), false);
});
test('atomicReplacePreservesLastGoodState', () => {
    const h = createHarness({ configText: '{"language":"en"}', renameError: true });
    const file = [...h.files.keys()][0];
    assert.throws(() => h.eval('saveConfig()'));
    assert.equal(h.files.get(file), '{"language":"en"}');
});
test('transferGetDoesNotWriteToDisk', async () => {
    const h = createHarness();
    await h.request('GET', '/api/transfers');
    assert.equal(h.writes.length, 0);
});
test('configFailureRestoresConfirmedState', async () => {
    const h = createHarness({ writeError: true });
    const response = await h.request('POST', '/api/config', { language: 'en' });
    assert.equal(response.statusCode, 500);
    assert.equal(h.eval('config.language'), 'tr');
});
test('migrationMergesOnlyVerifiedSerialsAndIsIdempotent', () => {
    const h = createHarness({ configText: JSON.stringify({ knownWirelessDevices: [
        { serviceName: 'old', serial: 'ONE', autoReconnect: false }, { serviceName: 'new', serial: 'ONE' },
        { serviceName: 'other', serial: 'TWO' }, { serviceName: 'pending', serial: '' }
    ] }) });
    h.eval('migratePhoneRegistry()');
    assert.equal(h.eval('config.knownWirelessDevices.length'), 3);
    assert.equal(h.eval('config.knownWirelessDevices[0].autoReconnect'), false);
    const count = h.writes.length;
    h.eval('migratePhoneRegistry()');
    assert.equal(h.writes.length, count);
});
test('corruptJsonPreservesOriginalFileAndConfirmedState', async () => {
    const h = createHarness({ configText: '{broken' });
    const file = [...h.files.keys()][0];
    const response = await h.request('POST', '/api/config', { language: 'en' });
    assert.equal(response.body.success, false);
    assert.equal(h.files.get(file), '{broken');
    assert.equal(h.eval('config.language'), 'tr');
});

test('dashboardSessionReplaceFailureKeepsLastCompleteFile', () => {
    const h = createHarness({ renameError: true });
    const file = h.eval('DASHBOARD_SESSION_FILE');
    h.files.set(file, 'previous complete file');
    assert.throws(() => h.eval('writeDashboardSession()'));
    assert.equal(h.files.get(file), 'previous complete file');
});

test('malformedTransferHistoryIsPreservedAndStartupDoesNotThrow', () => {
    const h = createHarness();
    const file = h.eval('TRANSFERS_FILE');
    const invalid = JSON.stringify([{ id: 'one', direction: 'mobile-to-pc', filename: 42 }]);
    h.files.set(file, invalid);
    assert.doesNotThrow(() => h.eval('syncTransfersWithDisk()'));
    assert.equal(h.files.get(file), invalid);
    assert.equal(h.eval('transfersReadFailed'), true);
});

test('restartRecoversInterruptedTransferWithoutPushingAndKeepsScreenshotId', () => {
    const h = createHarness();
    h.files.set('/received/capture.png', 'data');
    h.files.set(h.eval('TRANSFERS_FILE'), '\ufeff' + JSON.stringify([
        { id: 'shot', filename: 'capture.png', localPath: '/received/capture.png', direction: 'mobile-to-pc', status: 'transferred' },
        { id: 'upload', filename: 'fixture.txt', direction: 'pc-to-phone', status: 'transferring' }
    ]));
    h.eval('syncTransfersWithDisk()');
    assert.equal(h.eval('transfersList.find(item=>item.id==="upload").status'), 'interrupted');
    assert.equal(h.eval('transfersList.find(item=>item.id==="shot").id'), 'shot');
    assert.equal(h.commands.length, 0);
});

test('corruptTransferHistoryLoadsBackupWithoutOverwritingOriginal', () => {
    const h = createHarness();
    const file = h.eval('TRANSFERS_FILE');
    h.files.set(file, '{broken');
    h.files.set(file + '.bak', JSON.stringify([{ id: 'retained', filename: 'file', direction: 'pc-to-phone', status: 'saved' }]));
    h.eval('syncTransfersWithDisk()');
    assert.equal(h.eval('transfersList[0]?.id'), 'retained');
    assert.equal(h.files.get(file), '{broken');
    assert.throws(() => h.eval('saveTransfers()'));
});

test('emptyWatchFolderIsRejectedInsteadOfReportingSaved', async () => {
    const h = createHarness();
    assert.equal((await h.request('POST', '/api/config', { watchFolder: '' })).statusCode, 400);
});

test('unreadableWatchFolderDoesNotReplaceConfirmedSetting', async () => {
    const h = createHarness({ fsOverrides: { accessSync() { throw Object.assign(new Error('private path'), { code: 'EACCES' }); } } });
    h.files.set('/unreadable', 'fixture');
    const previous = h.eval('config.watchFolder');
    const response = await h.request('POST', '/api/config', { watchFolder: '/unreadable' });
    assert.equal(response.statusCode, 403);
    assert.equal(h.eval('config.watchFolder'), previous);
});

test('corruptConfigLoadsBackupForDisplayAndKeepsOriginalProtected', async () => {
    const h = createHarness({ configText: '{broken', configBackupText: '{"language":"en"}' });
    assert.equal(h.eval('config.language'), 'en');
    const response = await h.request('POST', '/api/config', { language: 'tr' });
    assert.equal(response.body.success, false);
    assert.equal(h.eval('config.language'), 'en');
    assert.equal(h.files.get(h.eval('CONFIG_FILE')), '{broken');
});
