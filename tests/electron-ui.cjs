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
        await win.webContents.executeJavaScript("currentApks=[{id:'fixture',name:'Uzun Türkçe Dosya Adı - aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.apk',label:'Fixture <b>text</b>',versionName:'1.2',size:'123 MB',packageName:'com.fixture.app'}];currentDevices=[{id:'USB_FIXTURE',model:'Telefon <img src=x>',state:'device',battery:{level:80,isCharging:true}}];selectedDevice='USB_FIXTURE';renderApks();renderDevices();");
        const metrics = [];
        for (const width of [980, 650]) {
            win.setContentSize(width, 900);
            await new Promise(resolve => setTimeout(resolve, 250));
            const screenshot = await win.capturePage();
            fs.writeFileSync(path.join(outputDir, 'ui-' + width + '.png'), screenshot.toPNG());
            metrics.push(await win.webContents.executeJavaScript('({width:innerWidth,bodyWidth:document.body.scrollWidth,clientWidth:document.documentElement.clientWidth,scriptElements:document.querySelectorAll(".device-card img").length,deviceCards:document.querySelectorAll(".device-card").length})'));
        }
        await win.webContents.executeJavaScript("currentTransfers=[{id:'safe-id',operationId:'fixture',filename:'Uzun Türkçe '+ 'a'.repeat(300) + '<img src=x>',size:'2000 MiB',direction:'pc-to-phone',status:'interrupted',phoneSerial:'FIXTURE',remotePath:'/sdcard/Download/'+ 'b'.repeat(300),timestamp:'12:34:56'}];renderTransfers();tabBtnTransfers.click();showToast('Hata: '+ 'uzun açıklama '.repeat(40));");
        await win.webContents.executeJavaScript("currentTransfers.push({id:'received',filename:'Türkçe '+ 'a'.repeat(300),size:'2000 MiB',direction:'mobile-to-pc',status:'transferred',localPath:'received/'+ 'b'.repeat(300),timestamp:'12:34:56'});renderTransfers()");
        for (const width of [980, 650]) {
            win.setContentSize(width, 900);
            await new Promise(resolve => setTimeout(resolve, 150));
            metrics.push(await win.webContents.executeJavaScript('({view:"transfers",width:innerWidth,bodyWidth:document.body.scrollWidth,clientWidth:document.documentElement.clientWidth,scriptElements:document.querySelectorAll(".transfer-card img").length,deviceCards:document.querySelectorAll(".device-card").length})'));
        }
        const safeDom = await win.webContents.executeJavaScript("document.querySelector('.btn-transfer-retry').dataset.id === 'safe-id' && document.querySelectorAll('.apk-title img,.apk-card script,.transfer-card script').length===0");
        if (!safeDom) throw new Error('Unsafe render or broken retry dataset');
        const captureActions = await win.webContents.executeJavaScript("capturedScreenshots=[{id:'capture-fixture',capturedAt:1,dataUrl:'blob:fixture',blob:new Blob(['fixture']),time:'12:00',resolution:'1x1'}];renderCapturesList();const inlineCaptureHandlers=capturesList.querySelectorAll('[onclick]').length;capturesList.querySelector('.capture-thumb-box').click();const opened=imageModal.style.display==='flex';capturesList.querySelector('.danger').click();({inlineCaptureHandlers,opened,remaining:capturedScreenshots.length})");
        if (captureActions.inlineCaptureHandlers || !captureActions.opened || captureActions.remaining) throw new Error('Capture delegation or cleanup failed');
        if (metrics.some(m => m.bodyWidth > m.clientWidth || m.scriptElements !== 0 || m.deviceCards !== 1)) throw new Error('Render overflow or unsafe device markup');
        await win.webContents.executeJavaScript('isPrivacyMode=true;updatePrivacyUI();renderDevices()');
        const privacy = await win.webContents.executeJavaScript("getComputedStyle(document.getElementById('mobile-transfer-qr')).visibility === 'hidden' && !document.getElementById('header-device-pill').title.includes('USB_FIXTURE')");
        if (!privacy) throw new Error('Privacy rendering failed');
        fs.writeFileSync(path.join(outputDir, 'render-results.json'), JSON.stringify({metrics,privacy}));
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
