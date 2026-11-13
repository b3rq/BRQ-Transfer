const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');
const file = { path: '/uploads/fixture.txt', originalname: 'fixture.txt', size: 3 };

test('folderActionsLaunchVisibleExplorerWithSeparateSelectionArgument', async () => {
    const launches = [];
    const h = createHarness({ spawn: (binary, args, settings) => {
        launches.push({ binary, args: Array.from(args), settings });
        const proc = new (require('node:events').EventEmitter)();
        queueMicrotask(() => proc.emit('spawn'));
        return proc;
    } });
    const receivedDir = h.eval('RECEIVED_DIR');
    const localPath = h.eval('path.join(RECEIVED_DIR, "tatil fotoğrafı.png")');
    h.files.set(localPath, 'image');
    h.context.fixturePath = localPath;
    h.eval('transfersList=[{id:"photo",localPath:fixturePath}]');
    assert.equal((await h.request('POST', '/api/transfers/open-folder')).body.success, true);
    assert.equal((await h.request('POST', '/api/transfers/open-folder', { id: 'photo' })).body.success, true);
    assert.deepEqual(launches.map(item => item.args), [[receivedDir], ['/select,', localPath]]);
    assert.ok(launches.every(item => item.binary === 'explorer.exe' && item.settings.windowsHide === false));
});

test('apkPushStartsWhileMetadataIsStillBeingRead', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : '' });
    h.eval('registerApk = () => new Promise(resolve => { globalThis.finishMetadata = resolve; })');
    const upload = h.request('POST', '/api/upload', { deviceId: 'USB', requestId: 'slow-apk' },
        { file: { ...file, originalname: 'game.apk' } });
    await new Promise(resolve => setImmediate(resolve));
    try {
        assert.equal(h.commands.filter(args => args.includes('push')).length, 1);
    } finally {
        h.eval('finishMetadata(null)');
        await upload;
    }
    assert.equal(h.commands.filter(args => args.includes('push')).length, 1);
});

test('phoneProgressUsesRemoteBytesAndOnlyCompletesAfterPushSucceeds', async () => {
    let finish;
    let remoteBytes = '50';
    const h = createHarness({ command: args => {
        if (args[0] === 'devices') return 'List of devices attached\nUSB\tdevice';
        if (args.includes('push')) return new Promise(resolve => { finish = resolve; });
        if (args[2] === 'shell' && args[3]?.startsWith('stat ')) return remoteBytes;
        return '';
    } });
    const intervalCount = h.intervals.length;
    await h.request('POST', '/api/upload', { deviceId: 'USB' }, { file: { ...file, size: 100 } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('transfersList[0].progress'), 0);
    assert.equal(h.intervals.length, intervalCount + 1);
    const poll = h.intervals.at(-1);
    const writes = h.writes.length;
    await poll();
    assert.equal(h.eval('transfersList[0].progress'), 50);
    assert.equal(h.events.at(-1).type, 'TRANSFER_PROGRESS');
    assert.equal(h.writes.length, writes);
    remoteBytes = '100';
    await poll();
    assert.equal(h.eval('transfersList[0].progress'), 99);
    assert.equal(h.eval('transfersList[0].status'), 'transferring');
    finish('ok');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('transfersList[0].progress'), 100);
    assert.equal(h.eval('transfersList[0].status'), 'transferred');
    const commands = h.commands.length;
    await poll();
    assert.equal(h.commands.length, commands);
});

test('unavailableRemoteSizeDoesNotFailPushOrInventProgress', async () => {
    let fail;
    const h = createHarness({ command: args => {
        if (args[0] === 'devices') return 'List of devices attached\nUSB\tdevice';
        if (args.includes('push')) return new Promise((_, reject) => { fail = reject; });
        if (args[2] === 'shell' && args[3]?.startsWith('stat ')) throw new Error('stat unavailable');
        return '';
    } });
    const intervalCount = h.intervals.length;
    await h.request('POST', '/api/upload', { deviceId: 'USB' }, { file });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.intervals.length, intervalCount + 1);
    await h.intervals.at(-1)();
    assert.equal(h.eval('transfersList[0].progress'), 0);
    assert.equal(h.eval('transfersList[0].status'), 'transferring');
    fail(new Error('offline'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('transfersList[0].status'), 'error');
    assert.equal(h.events.some(event => event.type === 'TRANSFER_COMPLETED'), false);
});

test('slowPushRemainsInProgressAndReloadKeepsInFlightTransfer', async () => {
    let finish;
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : args.includes('push') ? new Promise(resolve => { finish = resolve; }) : '' });
    const response = await h.request('POST', '/api/upload', { deviceId: 'USB' }, { file });
    assert.equal(response.statusCode, 202);
    const list = await h.request('GET', '/api/transfers');
    assert.equal(list.body.length, 1);
    assert.ok(['queued', 'transferring'].includes(list.body[0].status));
    while (!finish) await new Promise(resolve => setImmediate(resolve));
    finish('ok');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('transfersList[0].status'), 'transferred');
});
test('failedPushNeverReportsSuccess', async () => {
    const h = createHarness({ command: args => { if (args.includes('push')) throw new Error('offline'); return 'List of devices attached\nUSB\tdevice'; } });
    await h.request('POST', '/api/upload', { deviceId: 'USB' }, { file });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('transfersList[0].status'), 'error');
    assert.equal(h.events.some(e => e.type === 'TRANSFER_COMPLETED'), false);
});
test('noPhoneMeansSavedOnPc', async () => {
    const h = createHarness();
    const response = await h.request('POST', '/api/upload', {}, { file });
    assert.equal(response.body.transfer.status, 'saved');
    assert.equal(h.commands.some(args => args.includes('push')), false);
});
test('failedDeleteKeepsRecord', async () => {
    const h = createHarness({ deleteError: true });
    h.files.set('/received/file', 'data');
    h.eval('transfersList=[{id:"one",direction:"mobile-to-pc",localPath:"/received/file"}]');
    const response = await h.request('POST', '/api/transfers/delete', { id: 'one' });
    assert.equal(response.body.success, false);
    assert.equal(h.eval('transfersList.length'), 1);
});
test('mobileUploadPreservesOriginalDisplayName', async () => {
    const h = createHarness();
    const response = await h.request('POST', '/api/upload/mobile-to-pc', {}, { files: [{ ...file, filename: 'storage-id.txt' }] });
    assert.equal(response.body.success, true);
    assert.equal(response.body.files[0].filename, file.originalname);
});
test('sameRequestIdDoesNotPushTwice', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : '' });
    await Promise.all([1, 2].map(n => h.request('POST', '/api/upload', { deviceId: 'USB', requestId: 'one-request' }, { file: { ...file, path: '/uploads/file' + n } })));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.commands.filter(args => args.includes('push')).length, 1);
});
test('targetLostBeforeQueueStartsBecomesError', async () => {
    let reads = 0;
    const h = createHarness({ command: args => args[0] === 'devices' ? (++reads === 1 ? 'List of devices attached\nUSB\tdevice' : 'List of devices attached') : '' });
    await h.request('POST', '/api/upload', { deviceId: 'USB' }, { file });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('transfersList[0].status'), 'error');
});

test('retryUsesStoredFileAndTargetOnceWithoutCreatingAnotherRecord', async () => {
    let finish;
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice' : args.includes('push') ? new Promise(resolve => { finish = resolve; }) : 'SERIAL' });
    const retryPath = h.eval('path.join(UPLOADS_DIR,"retry.txt")');
    h.files.set(retryPath, 'data');
    h.eval(`transfersList=[{id:"one",operationId:"old",direction:"pc-to-phone",status:"interrupted",deviceId:"USB",phoneSerial:"SERIAL",localPath:${JSON.stringify(retryPath)},remotePath:"/sdcard/Download/one-retry.txt"}]`);
    const responses = await Promise.all([1, 2].map(() => h.request('POST', '/api/transfers/retry', { id: 'one' })));
    assert.ok(responses.every(response => response.statusCode === 202));
    while (!finish) await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.commands.filter(args => args.includes('push')).length, 1);
    finish('ok');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('transfersList.length'), 1);
    assert.equal(h.eval('transfersList[0].status'), 'transferred');
});

test('retryRejectsReassignedTransportAndNeverUsesCurrentSelection', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nUSB\tdevice\nOTHER\tdevice' : 'DIFFERENT' });
    const retryPath = h.eval('path.join(UPLOADS_DIR,"retry.txt")');
    h.files.set(retryPath, 'data');
    h.eval(`config.selectedAdbDevice="OTHER";transfersList=[{id:"one",direction:"pc-to-phone",status:"error",deviceId:"USB",phoneSerial:"ORIGINAL",localPath:${JSON.stringify(retryPath)},remotePath:"/sdcard/Download/one-retry.txt"}]`);
    const response = await h.request('POST', '/api/transfers/retry', { id: 'one' });
    assert.equal(response.statusCode, 409);
    assert.equal(h.commands.some(args => args.includes('push')), false);
});

test('newReceivedFilesDoNotEvictInFlightTransfersFromHistory', async () => {
    const h = createHarness();
    h.eval('transfersList=Array.from({length:100},(_,n)=>({id:String(n),filename:"queued",direction:"pc-to-phone",status:"queued"}))');
    await h.request('POST', '/api/upload/mobile-to-pc', {}, { files: [{ ...file, filename: 'storage.txt' }] });
    assert.equal(h.eval('transfersList.filter(item=>item.status==="queued").length'), 100);
    assert.equal(h.eval('transfersList.some(item=>item.direction==="mobile-to-pc")'), true);
});

test('explicitEmptyUploadTargetCannotFallBackToNewServerSelection', async () => {
    const h = createHarness({ command: args => args[0] === 'devices' ? 'List of devices attached\nOTHER\tdevice' : '' });
    h.eval('config.selectedAdbDevice="OTHER"');
    const response = await h.request('POST', '/api/upload', { deviceId: '' }, { file });
    assert.equal(response.body.transfer.status, 'saved');
    assert.equal(h.commands.length, 0);
});

test('deletingPcUploadRecordRemovesItsPrivateCopyAndApkEntry', async () => {
    const h = createHarness();
    h.context.copyPath = h.eval('path.join(UPLOADS_DIR, "copy.apk")');
    h.files.set(h.context.copyPath, 'apk');
    h.eval('transfersList=[{id:"pc",direction:"pc-to-phone",status:"transferred",localPath:copyPath}]; apkList=[{id:"a",filePath:copyPath}]');
    const response = await h.request('POST', '/api/transfers/delete', { id: 'pc' });
    assert.equal(response.body.success, true);
    assert.equal(h.files.has(h.context.copyPath), false);
    assert.equal(h.eval('apkList.length'), 0);
    assert.ok(h.events.some(event => event.type === 'APKS_UPDATED'));
});

test('historyTrimReleasesOnlyDroppedUploadCopies', () => {
    const h = createHarness();
    h.context.uploads = Array.from({ length: 102 }, (_, index) => h.eval(`path.join(UPLOADS_DIR, "file${index}.bin")`));
    for (const item of h.context.uploads) h.files.set(item, 'x');
    h.context.outside = '/elsewhere/keep.bin';
    h.files.set(h.context.outside, 'x');
    h.eval('transfersList=uploads.map((localPath,index)=>({id:String(index),direction:"pc-to-phone",status:"transferred",localPath})); transfersList.push({id:"outside",direction:"pc-to-phone",status:"transferred",localPath:outside}); saveTransfers()');
    assert.equal(h.eval('transfersList.length'), 100);
    assert.equal(h.files.has(h.context.uploads[0]), true);
    assert.equal(h.files.has(h.context.uploads[99]), true);
    assert.equal(h.files.has(h.context.uploads[100]), false);
    assert.equal(h.files.has(h.context.uploads[101]), false);
    assert.equal(h.files.has(h.context.outside), true);
});
