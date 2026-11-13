const test = require('node:test');
const assert = require('node:assert/strict');
const uiHarness = require('./helpers/ui-harness');

const flush = async () => { for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve)); };
const file = (name, size) => ({ name, size, lastModified: 1, slice: (start, end) => ({ start, end }) });
// Fake PC: sessions start at `resume` bytes; every request is recorded.
function withServer(h, { resume = 0 } = {}) {
    const calls = [];
    h.context.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        const body = url.endsWith('/sessions') ? { success: true, id: 'S-' + calls.length, received: resume }
            : url.endsWith('/complete') ? { success: true, file: {} } : { success: true, received: resume };
        return { ok: true, status: 200, json: async () => body };
    };
    return calls;
}
function answer(xhr, status, body) { xhr.status = status; xhr.responseText = JSON.stringify(body); xhr.onload(); }

test('mobileQueuePreservesUnsentFilesAndRejectsSecondSubmit', async () => {
    const h = uiHarness(true);
    const calls = withServer(h);
    h.context.fixture = [file('A', 1)];
    const running = h.eval('selectedFiles=fixture; renderQueue(); sendBtn.onclick()');
    h.context.extra = file('B', 1);
    h.eval('selectedFiles.push(extra); renderQueue(); sendBtn.onclick()');
    await flush();
    assert.equal(calls.filter(call => call.url.endsWith('/sessions')).length, 1);
    assert.equal(h.xhrs.length, 1);
    assert.equal(h.eval('sendBtn.disabled'), true);
    answer(h.xhrs[0], 200, { success: true, received: 1 });
    await running;
    assert.ok(calls.some(call => call.url.endsWith('/complete')));
    assert.equal(h.eval('selectedFiles.length'), 1);
    assert.equal(h.eval('selectedFiles[0].name'), 'B');
});

test('mobileHttp200FailureKeepsQueueAndShowsServerReason', async () => {
    const h = uiHarness(true);
    withServer(h);
    h.context.fixture = [file('A', 1)];
    const running = h.eval('selectedFiles=fixture; sendBtn.onclick()');
    await flush();
    answer(h.xhrs[0], 400, { success: false, error: { message: 'Disk dolu' } });
    await running;
    assert.equal(h.eval('selectedFiles.length'), 1);
    assert.equal(h.eval('toast.textContent'), 'Disk dolu');
});

test('mobileStartsUploadForFileAbovePreviousSizeLimits', async () => {
    const h = uiHarness(true);
    withServer(h);
    h.context.fixture = [file('video.mp4', 5 * 1024 ** 3)];
    h.eval('selectedFiles=fixture; sendBtn.onclick()');
    await flush();
    assert.equal(h.xhrs.length, 1);
    // Large files go in bounded chunks, not as one request.
    assert.deepEqual(h.xhrs[0].body, { start: 0, end: 4 * 1024 * 1024 });
});

test('mobileRejectsBatchAboveFileCountLimit', async () => {
    const h = uiHarness(true);
    const calls = withServer(h);
    h.context.fixture = Array.from({ length: 51 }, () => file('A', 1));
    h.eval('selectedFiles=fixture; sendBtn.onclick()');
    await flush();
    assert.equal(calls.length, 0);
    assert.equal(h.xhrs.length, 0);
});

test('mobileResumesAtTheOffsetThePcConfirms', async () => {
    const h = uiHarness(true);
    withServer(h, { resume: 3 });
    h.context.fixture = [file('clip.mp4', 10)];
    const running = h.eval('selectedFiles=fixture; sendBtn.onclick()');
    await flush();
    assert.match(h.xhrs[0].url, /offset=3$/);
    // The PC says it already has more than we thought: continue from there, not from scratch.
    answer(h.xhrs[0], 409, { success: false, received: 7 });
    await flush();
    assert.match(h.xhrs[1].url, /offset=7$/);
    answer(h.xhrs[1], 200, { success: true, received: 10 });
    await running;
    assert.equal(h.eval('selectedFiles.length'), 0);
});

test('mobileApkDeletionUpdatesListAndPageCloseCancelsOwnedWork', async () => {
    const h = uiHarness(true);
    withServer(h);
    h.eval('startAuthorizedSession()');
    h.context.fixture = [file('A', 1)];
    h.eval('apks=[{id:"old",name:"old.apk"}]; selectedFiles=fixture; sendBtn.onclick()');
    await flush();
    h.sockets[0].onmessage({ data: JSON.stringify({ type: 'APKS_UPDATED', apks: [] }) });
    assert.equal(h.eval('apks.length'), 0);
    h.sockets[0].onmessage({ data: JSON.stringify({ type: 'SHARED_FILES_UPDATED', files: [{ id: 'p1', filename: 'rapor.pdf', size: '1 KB' }] }) });
    assert.equal(h.eval('sharedFiles.length'), 1);
    h.windowListeners.get('beforeunload')();
    assert.equal(h.xhrs[0].aborted, true);
    assert.equal(h.sockets[0].closed, true);
});

test('mobilePageStaysLockedUntilAccessIsGranted', () => {
    const h = uiHarness(true);
    // Before the access check answers, no socket is opened and no transfer data is requested.
    assert.equal(h.sockets.length, 0);
    assert.deepEqual(h.requests.map(request => request.url).filter(url => url !== '/api/health'), ['/api/mobile/access']);
});
