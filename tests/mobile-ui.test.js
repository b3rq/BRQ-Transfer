const test = require('node:test');
const assert = require('node:assert/strict');
const uiHarness = require('./helpers/ui-harness');
test('mobileQueuePreservesUnsentFilesAndRejectsSecondSubmit', async () => {
    const h = uiHarness(true);
    h.eval('selectedFiles=[{name:"A",size:1}]; renderQueue(); sendBtn.onclick()');
    h.eval('selectedFiles.push({name:"B",size:1}); renderQueue(); sendBtn.onclick()');
    assert.equal(h.xhrs.length, 1);
    assert.equal(h.eval('sendBtn.disabled'), true);
    h.xhrs[0].status = 200;
    h.xhrs[0].responseText = '{"success":true}';
    h.xhrs[0].onload();
    assert.equal(h.eval('selectedFiles.length'), 1);
    assert.equal(h.eval('selectedFiles[0].name'), 'B');
});

test('mobileHttp200FailureKeepsQueueAndShowsServerReason', () => {
    const h = uiHarness(true);
    h.eval('selectedFiles=[{name:"A",size:1}];sendBtn.onclick()');
    h.xhrs[0].status = 200;
    h.xhrs[0].responseText = '{"success":false,"error":{"message":"Disk dolu"}}';
    h.xhrs[0].onload();
    assert.equal(h.eval('selectedFiles.length'), 1);
    assert.equal(h.eval('toast.textContent'), 'Disk dolu');
});

test('mobileStartsUploadForFileAbovePreviousSizeLimits', () => {
    const h = uiHarness(true);
    h.eval('selectedFiles=[{name:"video.mp4",size:5*1024**3}];sendBtn.onclick()');
    assert.equal(h.xhrs.length, 1);
});

test('mobileRejectsBatchAboveFileCountLimit', () => {
    const h = uiHarness(true);
    h.eval('selectedFiles=Array.from({length:51},()=>({name:"A",size:1}));sendBtn.onclick()');
    assert.equal(h.xhrs.length, 0);
});

test('mobileApkDeletionUpdatesListAndPageCloseCancelsOwnedWork', () => {
    const h = uiHarness(true);
    h.eval('apks=[{id:"old",name:"old.apk"}];selectedFiles=[{name:"A",size:1}];sendBtn.onclick()');
    h.sockets[0].onmessage({ data: JSON.stringify({ type: 'APKS_UPDATED', apks: [] }) });
    assert.equal(h.eval('apks.length'), 0);
    h.windowListeners.get('beforeunload')();
    assert.equal(h.xhrs[0].aborted, true);
    assert.equal(h.sockets[0].closed, true);
});
