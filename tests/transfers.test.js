const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');
const file = { path: '/uploads/fixture.txt', originalname: 'fixture.txt', size: 3 };

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
