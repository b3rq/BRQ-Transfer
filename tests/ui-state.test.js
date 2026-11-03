const test = require('node:test');
const assert = require('node:assert/strict');
const uiHarness = require('./helpers/ui-harness');

test('receivedFolderActionSendsTheTransferIdToSelectTheCorrectFile', async () => {
    const h = uiHarness();
    h.eval('currentTransfers=[{id:"photo",filename:"tatil fotoğrafı.png",localPath:"C:\\u005creceived\\u005cphoto.png"}]');
    let request;
    h.context.fetch = async (url, opts) => {
        request = { url, body: JSON.parse(opts.body) };
        return { ok: true, json: async () => ({ success: true }) };
    };
    await h.context.window.openReceivedFolder('tatil fotoğrafı.png', h.eval('currentTransfers[0].localPath'));
    assert.deepEqual(request, { url: '/api/transfers/open-folder', body: { id: 'photo' } });
});

test('openingPhoneDiscoveryDoesNotSearchUntilTheButtonIsClicked', async () => {
    const h = uiHarness();
    h.eval("pairingDiscoveryState='pairing_found';renderPairingDiscovery()");
    const button = h.elements.get('discover-pairing-btn');
    const status = h.elements.get('pairing-discovery-status').textContent;
    h.context.fetch = async url => {
        h.requests.push({ url });
        return { ok: true, json: async () => ({ success: true, services: [] }) };
    };
    await h.context.selectPairingMethod('discover');
    assert.equal(h.requests.some(request => request.url === '/api/adb/wireless-phones'), false);
    assert.equal(button.disabled, false);
    assert.equal(h.elements.get('discover-pairing-label').textContent, 'Telefon Bul');
    assert.equal(h.elements.get('pairing-discovery-status').textContent, status);
    await button.onclick();
    assert.equal(h.requests.filter(request => request.url === '/api/adb/wireless-phones').length, 1);
});

for (const background of [false, true]) {
    for (const success of [false, true]) {
        test(`manualPhoneDiscoveryShowsFillAndCleansUp: background=${background}, success=${success}`, async () => {
            const h = uiHarness();
            const button = h.elements.get('discover-pairing-btn');
            let finish;
            let calls = 0;
            h.context.fetch = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
            const pendingBackground = background ? h.context.discoverPairingPhones() : null;
            const pendingClick = button.onclick();
            assert.equal(button.dataset.discoveryState, 'loading');
            assert.equal(button.disabled, true);
            assert.equal(h.elements.get('discover-pairing-label').textContent, 'Telefon Bul');
            await button.onclick();
            assert.equal(calls, 1);
            finish({ ok: success, json: async () => ({ success, services: [] }) });
            await Promise.all([pendingBackground, pendingClick]);
            assert.equal(button.dataset.discoveryState, 'complete');
            assert.equal(button.disabled, false);
        });
    }
}

test('privacyMasksConnectionTextWithoutHidingControlsAndRestoresOriginalValues', () => {
    const h = uiHarness();
    const urlText = h.elements.get('mobile-transfer-url-text');
    const ipLabel = h.elements.get('paired-ip-label');
    const adapter = { value: '192.168.1.20', textContent: '192.168.1.20 - Ethernet', dataset: { privacyText: '192.168.1.20 - Ethernet' } };
    h.elements.get('mobile-ip-select').options = [adapter];
    urlText.textContent = urlText.dataset.privacyText = 'http://192.168.1.20:3000/mobile';
    ipLabel.textContent = ipLabel.dataset.privacyText = '192.168.1.20:';
    for (const id of ['adb-ip-input', 'pairing-address-input', 'pairing-code-input']) {
        h.elements.get(id).value = '192.168.1.20:5555';
    }
    h.eval('isPrivacyMode=true;updatePrivacyUI()');
    for (const id of ['mobile-transfer-url-link', 'mobile-transfer-url-text', 'mobile-ip-select', 'paired-ip-label', 'pairing-device-select', 'adb-ip-input', 'pairing-address-input']) {
        assert.notEqual(h.elements.get(id).style.visibility, 'hidden', id);
    }
    for (const text of [urlText.textContent, ipLabel.textContent, adapter.textContent]) {
        assert.ok(text.length > 0);
        assert.ok(text.includes('*'));
        assert.ok(!text.includes('192.168.1.20'));
    }
    for (const id of ['adb-ip-input', 'pairing-address-input', 'pairing-code-input']) {
        assert.equal(h.elements.get(id).type, 'password');
        assert.equal(h.elements.get(id).value, '192.168.1.20:5555');
    }
    assert.equal(adapter.value, '192.168.1.20');
    assert.equal(h.elements.get('mobile-transfer-qr').style.visibility, 'hidden');
    h.eval('isPrivacyMode=false;updatePrivacyUI()');
    assert.equal(urlText.textContent, 'http://192.168.1.20:3000/mobile');
    assert.equal(ipLabel.textContent, '192.168.1.20:');
    assert.equal(adapter.textContent, '192.168.1.20 - Ethernet');
    assert.equal(h.elements.get('adb-ip-input').type, 'text');
});

test('privacyStaysMaskedAfterQrAndPairingUpdatesAndCopiesTheRealUrl', async () => {
    const h = uiHarness();
    h.eval('isPrivacyMode=true;updatePrivacyUI()');
    const data = { url: 'http://192.168.1.20:3000/mobile', ip: '192.168.1.20', qrDataUrl: 'data:image/png;base64,fixture',
        availableIps: [{ ip: '192.168.1.20', friendlyName: 'Ethernet' }] };
    h.context.fetch = async () => ({ ok: true, json: async () => data });
    await h.context.loadMobileTransferQr();
    assert.equal(h.elements.get('mobile-transfer-url-text').textContent, 'http://192.168.***.***:*****/mobile');
    assert.ok(!h.elements.get('mobile-ip-select').innerHTML.includes('>192.168.1.20'));
    const updated = { ...data, type: 'MOBILE_QR_UPDATED', url: 'http://192.168.1.21:3000/mobile' };
    h.sockets[0].onmessage({ data: JSON.stringify(updated) });
    h.context.handleAdbPairStatus({ pairedIp: '192.168.1.21', status: 'paired' });
    assert.equal(h.elements.get('mobile-transfer-url-text').textContent, 'http://192.168.***.***:*****/mobile');
    assert.equal(h.elements.get('paired-ip-label').textContent, '192.168.***.***:*****:');
    let copied;
    h.context.navigator.clipboard = { writeText: async value => { copied = value; } };
    h.elements.get('copy-mobile-url-btn').onclick();
    assert.equal(copied, updated.url);
    h.eval('isPrivacyMode=false;updatePrivacyUI()');
    assert.equal(h.elements.get('mobile-transfer-url-text').textContent, updated.url);
    assert.equal(h.elements.get('paired-ip-label').textContent, '192.168.1.21:');
});

test('lateUploadResponseDoesNotOverwriteTerminalTransferToastWithQueued', async () => {
    const h = uiHarness();
    const toasts = [];
    h.context.showToast = message => toasts.push(message);
    for (const status of ['transferred', 'error']) {
        h.context.fetch = async () => ({ ok: true, json: async () => ({ success: true, transfer: { id: status, status } }) });
        await h.context.performUpload({ name: 'game.apk', size: 3 }, 'USB');
    }
    assert.equal(toasts.some(message => message.includes('kuyruğa')), false);
});

test('firstPairingShowsRequiredFieldsAndOnlyTheBottomPairAction', () => {
    const h = uiHarness();
    h.eval('pairingCodeFields.hidden=false;pairingUseAddress.checked=true;updatePairingFormState()');
    assert.equal(h.elements.get('pairing-code-input').required, true);
    assert.equal(h.elements.get('pairing-address-input').required, true);
    assert.equal(h.elements.get('connect-phone-btn').hidden, true);
    assert.equal(h.elements.get('pairing-code-btn').hidden, false);
    h.eval('pairingCodeFields.hidden=true;pairingUseAddress.checked=false;updatePairingFormState()');
    assert.equal(h.elements.get('pairing-code-input').required, false);
    assert.equal(h.elements.get('pairing-code-input').disabled, true);
    assert.equal(h.elements.get('pairing-address-input').required, false);
    assert.equal(h.elements.get('pairing-code-btn').hidden, true);
    assert.equal(h.elements.get('connect-phone-btn').hidden, false);
});

test('reachableDisconnectedPhoneOffersReconnectWithoutPairingAndDisappearsWhenDiscoveryLosesIt', async () => {
    const h = uiHarness();
    h.eval('currentDevices=[]; pairingServices=[{name:"adb-PHONE-random",type:"_adb-tls-connect._tcp",ip:"192.168.1.20",model:"Galaxy",reconnectable:true}];renderDevices()');
    const list = h.elements.get('devices-list');
    assert.equal(list.children.length, 1);
    const card = list.children[0];
    assert.equal(card.className, 'device-card');
    const button = card.children[0].children.find(child => child.textContent === 'Tekrar Bağlan');
    assert.ok(button, 'An available disconnected phone must have a reconnect action');
    h.context.fetch = async (url, opts) => {
        h.requests.push({ url, opts });
        return { ok: true, json: async () => ({ success: true, devices: [{ id: '192.168.1.20:61000', model: 'Galaxy', state: 'device' }] }) };
    };
    await button.onclick();
    assert.deepEqual(JSON.parse(h.requests.find(request => request.url === '/api/adb/connect').opts.body), { serviceName: 'adb-PHONE-random' });
    assert.equal(h.requests.some(request => request.url === '/api/adb/pair'), false);
    assert.equal(h.elements.get('pairing-code-fields').hidden, true);
    h.eval('currentDevices=[]');
    h.context.fetch = async () => ({ ok: true, json: async () => ({ success: true, services: [] }) });
    await h.context.discoverPairingPhones();
    assert.equal(list.children.length, 1);
    assert.equal(list.children[0].className, 'loading-state');
});

test('deviceCardsShowModelWithoutTechnicalConnectionIdentifiersOrPersonalNames', () => {
    const h = uiHarness();
    h.eval(`currentDevices=[{id:'adb-PHONE._adb-tls-connect._tcp',model:'Galaxy Note10+',state:'device',isWifi:true}];
        pairingServices=[{name:'adb-OTHER',type:'_adb-tls-connect._tcp',ip:'192.168.1.21',port:61000,
            model:'Pixel 9 Pro',deviceName:'Personal Name',reconnectable:true}];renderDevices()`);
    const cards = h.elements.get('devices-list').children;
    const visibleText = element => [element.textContent || '', ...element.children.map(visibleText)].join(' ');
    assert.equal(cards[0].children[0].children[0].textContent, 'Galaxy Note10+');
    assert.equal(cards[1].children[0].children[0].textContent, 'Pixel 9 Pro');
    assert.doesNotMatch(cards.map(visibleText).join(' '), /adb-|_tcp|192\.168\.|Personal Name/);
    const radio = cards[0].children[0].children[1].children[0];
    assert.equal(radio.value, 'adb-PHONE._adb-tls-connect._tcp');
});

test('disconnectedDiscoveryEntryDoesNotDuplicateAnActiveTransport', () => {
    const h = uiHarness();
    h.eval('currentDevices=[{id:"192.168.1.20:61000",model:"Galaxy",state:"device"}];pairingServices=[{name:"adb-PHONE-random",ip:"192.168.1.20",port:61000,type:"_adb-tls-connect._tcp",reconnectable:true}];renderDevices()');
    assert.equal(h.elements.get('devices-list').children.length, 1);
});

test('offlineWirelessAliasesAreHiddenWithoutHidingUsbOrTheReconnectAction', () => {
    const h = uiHarness();
    h.eval(`currentDevices=[
        {id:'192.168.1.20:61000',model:'Gone',state:'offline',isWifi:true},
        {id:'adb-gone._adb-tls-connect._tcp',model:'Gone',state:'offline'},
        {id:'192.168.1.21:61000',model:'USB Phone',state:'offline',isWifi:true,transports:[
            {id:'192.168.1.21:61000',state:'offline',isWifi:true},{id:'USB',state:'device',isWifi:false}]}
    ];pairingServices=[{name:'adb-PHONE-random',type:'_adb-tls-connect._tcp',ip:'192.168.1.20',port:61000,reconnectable:true}];renderDevices()`);
    const list = h.elements.get('devices-list');
    assert.equal(list.children.length, 2);
    const radio = list.children[0].children[0].children[1].children[0];
    assert.equal(radio.value, 'USB');
    assert.equal(radio.disabled, false);
    assert.ok(list.children[1].children[0].children.some(child => child.textContent === 'Tekrar Bağlan'));
});

test('transferCardShowsLivePercentageAndIgnoresLateProgressAfterCompletion', () => {
    const h = uiHarness();
    h.eval('currentTransfers=[{id:"one",operationId:"op",direction:"pc-to-phone",status:"transferring",filename:"file.txt",progress:0}];renderTransfers()');
    h.eval('ws.onmessage({data:JSON.stringify({type:"TRANSFER_PROGRESS",id:"one",operationId:"op",progress:42})})');
    assert.match(h.elements.get('transfers-list-container').innerHTML, /42%/);
    assert.match(h.elements.get('transfers-list-container').innerHTML, /value="42"/);
    h.eval('ws.onmessage({data:JSON.stringify({type:"TRANSFER_COMPLETED",operationId:"op",transfers:[{id:"one",operationId:"op",direction:"pc-to-phone",status:"transferred",filename:"file.txt",progress:100}]})})');
    h.eval('ws.onmessage({data:JSON.stringify({type:"TRANSFER_PROGRESS",id:"one",operationId:"op",progress:70})})');
    assert.match(h.elements.get('transfers-list-container').innerHTML, /100%/);
    assert.equal(h.eval('currentTransfers[0].progress'), 100);
});
test('wholeScriptEscapesQuotesAndMarkup', () => {
    const h = uiHarness();
    assert.equal(h.context.escapeHtml(String.fromCharCode(34, 39) + '<>&'), '&quot;&#39;&lt;&gt;&amp;');
});
test('missingSelectionNeverFallsBackToAnotherPhone', () => {
    const h = uiHarness();
    h.eval('selectedDevice="MISSING"; currentDevices=[{id:"OTHER",state:"device",model:"Phone"}]; renderDevices()');
    assert.notEqual(h.eval('selectedDevice'), 'OTHER');
});

test('transferTargetShowsModelAcrossTransportsAndHidesUnknownIdentifiers', () => {
    const h = uiHarness();
    h.eval(`selectedDevice='adb-PHONE-random._adb-tls-connect._tcp';
        currentDevices=[{id:'USB',model:'Galaxy S23',state:'device',transports:[
            {id:'USB',state:'device'}, {id:selectedDevice,state:'device',isWifi:true}]}];renderDevices()`);
    const indicator = h.elements.get('active-device-indicator');
    assert.equal(indicator.textContent, 'Hedef: Galaxy S23');
    assert.equal(indicator.hidden, false);
    h.eval('isPrivacyMode=true;renderDevices()');
    assert.ok(!indicator.textContent.includes('Galaxy S23'));
    h.eval('isPrivacyMode=false;currentDevices=[];renderDevices()');
    assert.equal(indicator.hidden, true);
    assert.equal(indicator.textContent, '');
    h.eval('currentDevices=[{id:selectedDevice,model:selectedDevice,state:"device"}];renderDevices()');
    assert.equal(indicator.hidden, true);
});

test('transferPathsDoNotExposeTransportIdsAndCompletedTransfersHaveNoProgressBar', () => {
    const h = uiHarness();
    h.eval(`currentTransfers=[{id:'one',direction:'pc-to-phone',status:'transferred',
        filename:'game.apk',deviceId:'adb-PHONE-random._adb-tls-connect._tcp',
        remotePath:'/sdcard/Download/game.apk',size:'10 MB',timestamp:'12:34:56'}];renderTransfers()`);
    const html = h.elements.get('transfers-list-container').innerHTML;
    assert.ok(!html.includes('adb-PHONE'));
    assert.ok(!html.includes('<progress'));
    assert.match(html, /<details[^>]*class="transfer-location"/);
    assert.ok(html.includes('/sdcard/Download/game.apk'));
    assert.ok(html.includes('100%'));
});
test('deviceSelectionDoesNotChangeWatchFolderSettings', () => {
    const h = uiHarness();
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
test('apkUpdatesDoNotReplaceTransferCountOrCards', () => {
    const h = uiHarness();
    h.eval('currentTransfers=[{id:"file",filename:"video.mp4",status:"saved",direction:"pc-to-phone"}];renderTransfers()');
    const cards = h.elements.get('transfers-list-container').innerHTML;
    h.eval('for(let n=0;n<100;n++) ws.onmessage({data:JSON.stringify({type:"NEW_APK",apk:{id:"one",name:"fixture.apk",label:"Fixture",versionName:String(n)}})})');
    assert.equal(h.elements.get('transfer-count').textContent, 1);
    assert.equal(h.elements.get('transfers-list-container').innerHTML, cards);
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
