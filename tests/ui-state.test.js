const test = require('node:test');
const assert = require('node:assert/strict');
const uiHarness = require('./helpers/ui-harness');
test('wholeScriptEscapesQuotesAndMarkup', () => {
    const h = uiHarness();
    assert.equal(h.context.escapeHtml(String.fromCharCode(34, 39) + '<>&'), '&quot;&#39;&lt;&gt;&amp;');
});
test('missingSelectionNeverFallsBackToAnotherPhone', () => {
    const h = uiHarness();
    h.eval('selectedDevice="MISSING"; currentDevices=[{id:"OTHER",state:"device",model:"Phone"}]; renderDevices()');
    assert.notEqual(h.eval('selectedDevice'), 'OTHER');
});
test('deviceSelectionDoesNotSaveFolderDraft', () => {
    const h = uiHarness();
    h.elements.get('watch-folder-input').value = 'unsaved';
    h.context.window.changeSelectedDevice('PHONE');
    const body = JSON.parse(h.requests.find(r => r.url === '/api/config').opts.body);
    assert.equal('watchFolder' in body, false);
});
test('captureDeleteRevokesUrl', () => {
    const h = uiHarness();
    const revoked = [];
    h.context.URL = { revokeObjectURL: url => revoked.push(url) };
    h.eval('capturedScreenshots=[{id:1,dataUrl:"blob:one"}]; window.deleteCapture(1)');
    assert.deepEqual(revoked, ['blob:one']);
});
test('oneHundredApkUpdatesKeepOneCurrentCard', () => {
    const h = uiHarness();
    h.eval('for(let n=0;n<100;n++) ws.onmessage({data:JSON.stringify({type:"NEW_APK",apk:{id:"one",name:"fixture.apk",label:"Fixture",versionName:String(n)}})})');
    assert.equal(h.eval('currentApks.length'), 1);
    assert.equal(h.eval('currentApks[0].versionName'), '99');
});
test('lateConfigResponseCannotReplaceNewerServerSelection', async () => {
    const h = uiHarness();
    let finish;
    h.context.fetch = () => new Promise(resolve => { finish = resolve; });
    h.eval('applyServerConfig({revision:1,selectedAdbDevice:"A"});window.changeSelectedDevice("B")');
    h.eval('applyServerConfig({revision:3,selectedAdbDevice:"C"})');
    finish({ ok: true, json: async () => ({ success: true, config: { revision: 2, selectedAdbDevice: 'B' } }) });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.eval('selectedDevice'), 'C');
});
test('letterboxTouchDoesNotGenerateCoordinates', () => {
    const h = uiHarness();
    const video = h.elements.get('screen-video');
    video.videoWidth = 200; video.videoHeight = 400;
    video.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });
    assert.equal(h.context.getScaledTouchCoords({ clientX: 50, clientY: 200 }), null);
});

test('oversizeUploadIsRejectedBeforeNetworkAndNormalUploadHasLongDeadline', async () => {
    const h = uiHarness();
    h.context.uploadFile({ name: 'too-large.bin', size: 2000 * 1024 * 1024 + 1 });
    assert.equal(h.requests.filter(r => r.url === '/api/upload').length, 0);
    const deadlines = [];
    h.context.setTimeout = (_, delay) => { deadlines.push(delay); return 0; };
    h.context.uploadFile({ name: 'normal.bin', size: 1 });
    assert.equal(h.requests.filter(r => r.url === '/api/upload').length, 1);
    assert.ok(deadlines.includes(15 * 60 * 1000));
});

test('backgroundFailuresAreVisibleToUser', () => {
    const h = uiHarness();
    const messages = [];
    h.context.showToast = message => messages.push(message);
    for (const type of ['WATCHER_ERROR', 'PERSISTENCE_ERROR', 'CLIPBOARD_ERROR']) {
        h.eval(`ws.onmessage({data:JSON.stringify({type:${JSON.stringify(type)},error:'fixture failure'})})`);
    }
    assert.deepEqual(messages, ['fixture failure', 'fixture failure', 'fixture failure']);
});

test('launchFailureShowsStructuredMessageInsteadOfUndefined', async () => {
    const h = uiHarness();
    const messages = [];
    h.context.showToast = message => messages.push(message);
    h.context.fetch = async () => ({ ok: false, json: async () => ({ success: false, error: { message: 'Telefon bağlı değil. Yeniden bağlayın.' } }) });
    h.eval('selectedDevice="PHONE"');
    await h.context.window.launchApp('com.fixture.app');
    assert.deepEqual(messages, ['Telefon bağlı değil. Yeniden bağlayın.']);
});

test('retryButtonUsesRecordIdWithoutCurrentPhoneSelection', async () => {
    const h = uiHarness();
    h.eval('selectedDevice="OTHER"');
    h.context.fetch = async (url, opts) => { h.requests.push({ url, opts }); return { ok: true, json: async () => ({ success: true }) }; };
    assert.equal(typeof h.context.window.retryTransfer, 'function');
    await h.context.window.retryTransfer('one');
    const request = h.requests.find(item => item.url === '/api/transfers/retry');
    assert.deepEqual(JSON.parse(request.opts.body), { id: 'one' });
});

test('callerAbortAndTimeoutBothCancelJsonRequest', async () => {
    const h = uiHarness();
    let timeout;
    let requestSignal;
    h.context.setTimeout = fn => { timeout = fn; return 1; };
    h.context.fetch = async (_, options) => new Promise((resolve, reject) => {
        requestSignal = options.signal;
        options.signal.addEventListener('abort', () => reject(new Error('cancelled')));
    });
    const caller = new AbortController();
    const request = h.context.requestJson('/fixture', { signal: caller.signal });
    timeout();
    const timedOut = requestSignal.aborted;
    caller.abort();
    await assert.rejects(request);
    assert.equal(timedOut, true);
    assert.equal(caller.signal.aborted, true);
});

test('remoteKeyDisplaysHttpFailure', async () => {
    const h = uiHarness();
    const messages = [];
    h.context.showToast = message => messages.push(message);
    h.eval('selectedDevice="PHONE"');
    h.context.fetch = async () => ({ ok: false, json: async () => ({ error: { message: 'Cihaz çevrimdışı' } }) });
    await h.context.window.sendRemoteKey(3);
    assert.deepEqual(messages, ['Cihaz çevrimdışı']);
});

test('twentyFileDropRunsAtMostTwoUploadsAndQueueIsBounded', () => {
    const h = uiHarness();
    h.eval('for(let n=0;n<20;n++)uploadFile({name:"file"+n,size:1})');
    assert.equal(h.requests.filter(item => item.url === '/api/upload').length, 2);
    h.eval('for(let n=0;n<200;n++)uploadFile({name:"extra"+n,size:1})');
    assert.ok(h.eval('uploadQueue.length') <= 100);
});

test('oneHundredSameMillisecondCapturesReleaseEveryObjectUrl', async () => {
    const h = uiHarness();
    const urls = new Set(); let sequence = 0;
    h.context.Date = class extends Date { static now() { return 1000; } };
    h.context.URL = { createObjectURL() { const value = 'blob:' + ++sequence; urls.add(value); return value; }, revokeObjectURL: value => urls.delete(value) };
    h.context.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
    h.context.fetch = async () => ({ ok: true, headers: { get: () => 'image/png' }, blob: async () => new Blob([Buffer.alloc(24)]) });
    h.eval('selectedDevice="PHONE"');
    for (let n = 0; n < 100; n++) await h.elements.get('snap-screenshot-btn').onclick();
    assert.equal(h.eval('capturedScreenshots.length'), 50);
    h.eval('while(capturedScreenshots.length)window.deleteCapture(capturedScreenshots[0].id)');
    assert.equal(urls.size, 0);
});

test('oneHundredChimesCloseTheirAudioContexts', () => {
    const h = uiHarness(); let open = 0;
    h.context.window.AudioContext = class {
        constructor() { open++; this.currentTime = 0; }
        createOscillator() { const osc = { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() { osc.onended(); } }; return osc; }
        createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
        close() { open--; return Promise.resolve(); }
    };
    h.eval('isSoundEnabled=true;for(let n=0;n<100;n++)playChime()');
    assert.equal(open, 0);
});

test('installHttpAndWebsocketFailureProduceOneTerminalToast', async () => {
    const h = uiHarness(); const messages = [];
    h.context.showToast = message => messages.push(message);
    h.eval('selectedDevice="PHONE"');
    h.context.fetch = async () => ({ ok: false, json: async () => ({ success: false, operationId: 'one', error: { message: 'Fixture failure' } }) });
    await h.context.window.installViaAdb('apk', 'fixture.apk');
    h.eval('ws.onmessage({data:JSON.stringify({type:"ADB_INSTALL_ERROR",operationId:"one",error:"Fixture failure"})})');
    assert.equal(messages.filter(message => message.includes('Fixture failure')).length, 1);
});

test('landscapeVideoRotatesTouchBoundsWithDisplayedFrame', () => {
    const h = uiHarness();
    h.eval('phonePhysicalWidth=1000;phonePhysicalHeight=2000');
    const video = h.elements.get('screen-video');
    video.videoWidth = 2000; video.videoHeight = 1000;
    video.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500 });
    const point = h.context.getScaledTouchCoords({ clientX: 750, clientY: 250 });
    assert.equal(point.x, 1500); assert.equal(point.y, 500);
});

test('jsonNullIsReportedAsProtocolErrorWithoutTypeErrorDetails', async () => {
    const h = uiHarness();
    h.context.fetch = async () => ({ ok: true, json: async () => null });
    await assert.rejects(h.context.requestJson('/fixture'), error => /geçerli/.test(error.message));
});

test('offlineRequestExplainsHowToRecoverHubConnection', async () => {
    const h = uiHarness();
    h.context.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(h.context.requestJson('/fixture'), error => /Hub/.test(error.message) && !error.message.includes('Failed to fetch'));
});

test('privateQuickConnectNeverShowsRawAddressInStatusBadge', async () => {
    const h = uiHarness();
    h.context.fetch = async url => ({ ok: true, json: async () => url.includes('/devices') ? [] : { success: true } });
    await h.eval('isPrivacyMode=true;lastPairedIp="192.168.1.4";quickPortInput.value="5555";quickPortBtn.onclick()');
    assert.equal(h.eval('adbPairStatusBadge.textContent.includes("192.168.1.4")'), false);
});
