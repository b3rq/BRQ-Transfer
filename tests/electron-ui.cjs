const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, '.validation');
fs.mkdirSync(outputDir, {recursive:true});
app.setPath('userData', path.join(outputDir, 'electron-profile'));
app.setPath('crashDumps', path.join(outputDir, 'crashes'));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
    const h = require('./helpers/server-harness')({ http: true, wsReal: true, env: { PORT: '4515' } });
    await new Promise(resolve => h.server.listenForTest(4515, '127.0.0.1', resolve));
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith('http://localhost:4515/') && !details.url.startsWith('ws://localhost:4515/') }));
    const win = new BrowserWindow({ width: 980, height: 900, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    try {
        await win.loadURL(h.eval('getDashboardUrl()'));
        await win.webContents.executeJavaScript('pageClosing=true; ws.close()');
        await new Promise(resolve => setTimeout(resolve, 200));
        await win.webContents.executeJavaScript("currentDevices=[{id:'USB_FIXTURE',model:'Telefon <img src=x>',state:'device',battery:{level:80,isCharging:true}}];selectedDevice='USB_FIXTURE';renderDevices();");
        const transfersOnly = await win.webContents.executeJavaScript("!document.getElementById('tab-btn-apks') && !document.getElementById('apk-list-container') && getComputedStyle(transfersListContainer).display !== 'none' && getComputedStyle(document.getElementById('transfers-quick-actions')).display !== 'none'");
        if (!transfersOnly) throw new Error('Only the transfer list and its actions should be visible');
        const metrics = [];
        for (const width of [980, 650]) {
            win.setContentSize(width, 900);
            await new Promise(resolve => setTimeout(resolve, 250));
            const screenshot = await win.capturePage();
            fs.writeFileSync(path.join(outputDir, 'ui-' + width + '.png'), screenshot.toPNG());
            metrics.push(await win.webContents.executeJavaScript('({width:innerWidth,bodyWidth:document.body.scrollWidth,clientWidth:document.documentElement.clientWidth,scriptElements:document.querySelectorAll(".device-card img").length,deviceCards:document.querySelectorAll(".device-card").length})'));
        }
        await win.webContents.executeJavaScript("currentTransfers=[{id:'safe-id',operationId:'fixture',filename:'Uzun Türkçe '+ 'a'.repeat(300) + '<img src=x>',size:'2000 MiB',direction:'pc-to-phone',status:'interrupted',phoneSerial:'FIXTURE',remotePath:'/sdcard/Download/'+ 'b'.repeat(300),timestamp:'12:34:56'}];renderTransfers();showToast('Hata: '+ 'uzun açıklama '.repeat(40));");
        await win.webContents.executeJavaScript("currentTransfers.push({id:'received',filename:'Türkçe '+ 'a'.repeat(300),size:'2000 MiB',direction:'mobile-to-pc',status:'transferred',localPath:'received/'+ 'b'.repeat(300),timestamp:'12:34:56'});renderTransfers()");
        await win.webContents.executeJavaScript("currentTransfers.push({id:'progress',operationId:'progress-op',filename:'Video.mp4',size:'500 MiB',direction:'pc-to-phone',status:'transferring',progress:42,remotePath:'/sdcard/Movies/Video.mp4',timestamp:'12:34:56'});renderTransfers()");
        const progress = await win.webContents.executeJavaScript("({value:document.querySelector('.transfer-progress').value,text:document.querySelector('.transfer-progress').getAttribute('aria-label')})");
        if (progress.value !== 42 || !progress.text.includes('42%')) throw new Error('Transfer progress rendering failed');
        for (const width of [980, 650]) {
            win.setContentSize(width, 900);
            await new Promise(resolve => setTimeout(resolve, 150));
            await win.webContents.executeJavaScript("document.querySelector('.transfer-progress').scrollIntoView({block:'center'})");
            fs.writeFileSync(path.join(outputDir, 'transfers-' + width + '.png'), (await win.capturePage()).toPNG());
            metrics.push(await win.webContents.executeJavaScript('({view:"transfers",width:innerWidth,bodyWidth:document.body.scrollWidth,clientWidth:document.documentElement.clientWidth,scriptElements:document.querySelectorAll(".transfer-card img").length,deviceCards:document.querySelectorAll(".device-card").length})'));
        }
        const safeDom = await win.webContents.executeJavaScript("document.querySelector('.btn-transfer-retry').dataset.id === 'safe-id' && document.querySelectorAll('.transfer-card img,.transfer-card script').length===0");
        if (!safeDom) throw new Error('Unsafe render or broken retry dataset');
        const captureActions = await win.webContents.executeJavaScript("capturedScreenshots=[{id:'capture-fixture',capturedAt:1,dataUrl:'blob:fixture',blob:new Blob(['fixture']),time:'12:00',resolution:'1x1'}];renderCapturesList();const inlineCaptureHandlers=capturesList.querySelectorAll('[onclick]').length;capturesList.querySelector('.capture-thumb-box').click();const opened=imageModal.style.display==='flex';capturesList.querySelector('.danger').click();({inlineCaptureHandlers,opened,remaining:capturedScreenshots.length})");
        if (captureActions.inlineCaptureHandlers || !captureActions.opened || captureActions.remaining) throw new Error('Capture delegation or cleanup failed');
        if (metrics.some(m => m.bodyWidth > m.clientWidth || m.scriptElements !== 0 || m.deviceCards !== 1)) throw new Error('Render overflow or unsafe device markup');
        await win.webContents.executeJavaScript('isPrivacyMode=true;updatePrivacyUI();renderDevices()');
        const privacy = await win.webContents.executeJavaScript(`(async () => {
            const originalFetch = fetch;
            const url = 'http://192.168.1.20:3000/mobile';
            fetch = async () => ({ok:true,json:async()=>({url,ip:'192.168.1.20',qrDataUrl:'data:image/png;base64,',availableIps:[{ip:'192.168.1.20',friendlyName:'Ethernet'}]})});
            try {
                await loadMobileTransferQr();
                handleAdbPairStatus({pairedIp:'192.168.1.20',status:'paired'});
                const ids = ['mobile-transfer-url-link','mobile-transfer-url-text','mobile-ip-select','paired-ip-label','pairing-device-select','adb-ip-input','pairing-address-input'];
                const visible = ids.every(id => getComputedStyle(document.getElementById(id)).visibility === 'visible');
                const masked = !document.getElementById('mobile-transfer-url-text').textContent.includes('192.168.1.20') &&
                    document.getElementById('mobile-ip-select').selectedOptions[0].textContent.includes('*') &&
                    document.getElementById('adb-ip-input').type === 'password';
                const qrHidden = getComputedStyle(document.getElementById('mobile-transfer-qr')).visibility === 'hidden';
                const deviceMasked = !document.getElementById('header-device-pill').title.includes('USB_FIXTURE');
                isPrivacyMode=false;updatePrivacyUI();
                const restored = document.getElementById('mobile-transfer-url-text').textContent === url &&
                    document.getElementById('mobile-ip-select').selectedOptions[0].textContent === '192.168.1.20 - Ethernet' &&
                    document.getElementById('adb-ip-input').value === '192.168.1.20:' && document.getElementById('adb-ip-input').type === 'text';
                return visible && masked && qrHidden && deviceMasked && restored;
            } finally { fetch=originalFetch; }
        })()`);
        if (!privacy) throw new Error('Privacy rendering failed');
        await win.webContents.executeJavaScript("imageModal.style.display='none'");
        await win.webContents.executeJavaScript(`document.querySelector('[data-tab="tab-adb"]').click()`);
        await new Promise(resolve => setTimeout(resolve, 200));
        const deviceFlow = await win.webContents.executeJavaScript(`(async () => {
            const originalFetch = fetch;
            const phone = {name:'adb-fixture',type:'_adb-tls-connect._tcp',ip:'192.168.1.20',port:61000,model:'Galaxy',deviceName:'Test Telefonu',reconnectable:true};
            const other = {id:'USB_FIXTURE',model:'USB Telefon',state:'device'};
            let available = true;
            const calls = [];
            fetch = async (url, options) => {
                const body = options?.body ? JSON.parse(options.body) : {};
                calls.push({url,body});
                const data = url.includes('wireless-phones') ? {success:true,services:available ? [{...phone}] : []} :
                    url.includes('disconnect') ? {success:true,devices:[other],selectedAdbDevice:other.id} :
                    {success:true,devices:[other,{id:'192.168.1.20:61000',model:'Galaxy',state:'device',isWifi:true}]};
                return {ok:true,json:async()=>data};
            };
            try {
                isPrivacyMode=false;updatePrivacyUI();currentDevices=[other];pairingServices=[{...phone}];renderPairingDiscovery();renderDevices();
                const methodsRemoved = document.querySelectorAll('[data-pairing-method]').length===0 &&
                    document.getElementById('qr-pairing-details').hidden && document.getElementById('ip-connection-fields').hidden;
                await devicesList.querySelector('button').onclick();
                const reconnected = !pairingCodeFields.hidden ? false : currentDevices.length===2 &&
                    calls.some(call=>call.url==='/api/adb/connect' && call.body.serviceName==='adb-fixture') &&
                    !calls.some(call=>call.url==='/api/adb/pair');
                await [...devicesList.querySelectorAll('button')].find(button=>button.textContent===i18n[currentLang].disconnect).onclick();
                const disconnected = currentDevices.length===1 && selectedDevice==='USB_FIXTURE' &&
                    !calls.some(call=>call.url==='/api/adb/wireless-phones');
                await discoverPairingBtn.onclick();
                const manuallyFound = devicesList.querySelector('button')?.textContent===i18n[currentLang].reconnect;
                available=false;await discoverPairingPhones();
                const disappeared = devicesList.querySelectorAll('.device-card').length===1 && !devicesList.textContent.includes('Test Telefonu');
                pairingServices=[{...phone}];pairingDiscoveryState='pairing_found';renderPairingDiscovery();renderDevices();
                return {methodsRemoved,reconnected,disconnected,manuallyFound,disappeared};
            } finally { fetch=originalFetch; }
        })()`);
        if (Object.values(deviceFlow).some(value => !value)) throw new Error('Device connection flow failed: ' + JSON.stringify(deviceFlow));
        await win.webContents.executeJavaScript(`(async () => {
            const originalFetch = fetch;
            fetch = async () => ({ok:true,json:async()=>({needsPairing:true})});
            try { await connectPhoneBtn.onclick(); } finally { fetch=originalFetch; }
            pairingUseAddress.checked=true;pairingUseAddress.onchange();
        })()`);
        for (const width of [980, 650]) {
            win.setContentSize(width, 900);
            await new Promise(resolve => setTimeout(resolve, 150));
            const overflow = await win.webContents.executeJavaScript('document.body.scrollWidth > document.documentElement.clientWidth');
            if (overflow) throw new Error('Device panel overflow at width ' + width);
            const pairingForm = await win.webContents.executeJavaScript(`(() => {
                const fields = [pairingCodeInput,pairingAddressInput];
                const button = pairingCodeBtn.getBoundingClientRect();
                return !pairingCodeFields.hidden && connectPhoneBtn.hidden && !pairingCodeBtn.hidden &&
                    fields.every(field => field.required && !field.disabled && !field.checkValidity() &&
                        getComputedStyle(field).visibility === 'visible' &&
                        field.getBoundingClientRect().bottom <= button.top);
            })()`);
            if (!pairingForm) throw new Error('Required pairing fields or bottom action failed at width ' + width);
            fs.writeFileSync(path.join(outputDir, 'devices-' + width + '.png'), (await win.capturePage()).toPNG());
        }
        await win.webContents.executeJavaScript(`
            document.querySelector('[data-tab="tab-deploy"]').click();
            toast.style.display='none';
            isPrivacyMode=false;
            currentDevices=[{id:'adb-RF8NA228PJB-fixture._adb-tls-connect._tcp',model:'Galaxy S23',state:'device',battery:{level:80}}];
            selectedDevice=currentDevices[0].id;renderDevices();
            currentTransfers=[
                {id:'sent',filename:'siege_flow_v1.0.5.apk',size:'131.89 MB',timestamp:'15:31:22',direction:'pc-to-phone',status:'transferred',deviceId:selectedDevice,remotePath:'/sdcard/Download/siege_flow_v1.0.5.apk'},
                {id:'received',filename:'.gitkeep',size:'2 Bytes',timestamp:'13:17:13',direction:'mobile-to-pc',status:'transferred',localPath:'D:/MOOD_GAMES/UNITY_PROJECTS/github_projects/BRQ-Transfer/received/.gitkeep'},
                {id:'sending',filename:'defence_loop_v1.0.115.apk',size:'186.54 MB',timestamp:'11:52:35',direction:'pc-to-phone',status:'transferring',progress:42,remotePath:'/sdcard/Download/defence_loop_v1.0.115.apk'}
            ];renderTransfers();window.scrollTo(0,0);
        `);
        for (const width of [1440, 980, 390]) {
            win.setContentSize(width, 1000);
            await new Promise(resolve => setTimeout(resolve, 150));
            const layout = await win.webContents.executeJavaScript(`(() => {
                const target=document.getElementById('active-device-indicator');
                const card=document.querySelector('.transfer-card');
                const footer=card.querySelector('.transfer-footer');
                const details=card.querySelector('details');
                details.open=true;
                const pathVisible=details.querySelector('.transfer-path').getBoundingClientRect().height>0;
                details.open=false;
                return !target.hidden && target.textContent==='Hedef: Galaxy S23' &&
                    !card.textContent.includes('adb-RF8') && pathVisible &&
                    footer.getBoundingClientRect().top>=card.querySelector('.transfer-left').getBoundingClientRect().bottom &&
                    document.body.scrollWidth<=document.documentElement.clientWidth;
            })()`);
            if (!layout) throw new Error('Transfer card hierarchy, device name or location disclosure failed at width ' + width);
            fs.writeFileSync(path.join(outputDir, 'transfer-layout-' + width + '.png'), (await win.capturePage()).toPNG());
        }
        fs.writeFileSync(path.join(outputDir, 'render-results.json'), JSON.stringify({metrics,privacy,deviceFlow}));
        console.log(JSON.stringify(metrics));
    } finally {
        win.destroy();
        for (const client of h.wss.clients) client.terminate();
        await new Promise(resolve => h.wss.close(resolve));
        h.server.closeAllConnections();
        await new Promise(resolve => h.server.close(resolve));
        app.quit();
    }
}).catch(error => { console.error(error.message); app.exit(1); });
