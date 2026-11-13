// Render the production pages against isolated HTTP/WS fixtures; never touch a phone.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../.validation/ux');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'profile'));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
    const h = require('./helpers/server-harness')({ http: true, wsReal: true, env: { PORT: '4516' } });
    await new Promise(resolve => h.server.listenForTest(4516, '127.0.0.1', resolve));
    const origin = `http://localhost:${h.server.address().port}`;
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({
        cancel: !details.url.startsWith(origin + '/') && !details.url.startsWith(origin.replace('http:', 'ws:') + '/')
    }));
    const win = new BrowserWindow({ show: false, width: 1440, height: 1000,
        webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
    const run = code => win.webContents.executeJavaScript(code);
    const failures = [], metrics = [], errors = [];
    win.webContents.on('console-message', ({ level, message }) => {
        if (level === 3 && !message.includes('ERR_BLOCKED_BY_CLIENT')) errors.push(message);
    });
    const check = (condition, message) => { if (!condition) failures.push(message); };
    async function until(expression, timeout = 3000) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) { if (await run(expression)) return; await new Promise(resolve => setTimeout(resolve, 25)); }
        failures.push('Timed out waiting for: ' + expression);
    }
    async function capture(name, width, height = 1000) {
        win.setContentSize(width, height);
        // Hidden Chromium windows can pause compositor transitions between frames.
        // Freeze motion only for static snapshots; interaction checks use production CSS.
        const snapshotStyles = await win.webContents.insertCSS('*,*::before,*::after{transition:none!important;animation:none!important}');
        await run('window.scrollTo(0,0)');
        await new Promise(resolve => setTimeout(resolve, 220));
        fs.writeFileSync(path.join(output, name + '.png'), (await win.capturePage()).toPNG());
        await win.webContents.removeInsertedCSS(snapshotStyles);
        const metric = await run(`(() => {
            const viewport = document.documentElement.clientWidth;
            const overflow = [...document.querySelectorAll('button, input:not([type=file]), select, .panel, .card, .apk-card, .transfer-card')]
                .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
                .filter(el => { const r=el.getBoundingClientRect(); return r.right>viewport+1 || r.left< -1; })
                .map(el=>el.id || el.className);
            return {width:innerWidth, viewport, scrollWidth:document.body.scrollWidth, overflow};
        })()`);
        metrics.push({ name, ...metric });
        // At fractional zoom Chromium rounds scrollWidth up and clientWidth down.
        check(metric.scrollWidth <= metric.viewport + 1 && !metric.overflow.length, name + ': horizontal overflow ' + JSON.stringify(metric));
    }
    try {
        await win.loadURL(origin + new URL(h.eval('getDashboardUrl()')).pathname + new URL(h.eval('getDashboardUrl()')).search);
        await run('pageClosing=true;ws.close()');
        await run("setLanguage('tr');applyTheme('dark')");
        await new Promise(resolve => setTimeout(resolve, 100));
        const qr = await require('qrcode').toDataURL(origin + '/mobile');
        await run(`document.getElementById('mobile-transfer-qr').src=${JSON.stringify(qr)};
            document.getElementById('mobile-ip-select').innerHTML='<option>192.168.1.20 - Ethernet</option>';
            currentTransfers=[];currentDevices=[];renderTransfers();renderDevices();`);
        await capture('desktop-empty', 1440);
        check(await run(`!document.getElementById('watch-folder-input') && !document.getElementById('save-watch-btn')`), 'Transfer page must not show the build watcher');
        await run(`currentTransfers=Array.from({length:100},(_,n)=>({id:'scroll-'+n,filename:'Photo '+n+'.png',direction:'mobile-to-pc',status:'transferred',size:'8 MiB',localPath:'received/photo-'+n+'.png',timestamp:'12:30'}));renderTransfers()`);
        for (const [width, height] of [[1440,1000], [1313,828], [1080,680], [375,812]]) {
            win.setContentSize(width, height);
            await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
            const bounds = await run(`(() => {
                const list=document.getElementById('transfers-list-container');
                const panel=list.closest('.panel');
                const header=panel.querySelector('.panel-header-between');
                const before=header.getBoundingClientRect().top;
                list.scrollTop=list.scrollHeight;
                const sidebar=document.querySelector('#tab-deploy .sidebar-panel');
                const upload=document.getElementById('dropzone');
                return {height:panel.getBoundingClientRect().height,scrollable:list.scrollHeight>list.clientHeight,scrolled:list.scrollTop>0,headerStable:before===header.getBoundingClientRect().top,
                    panelBottom:panel.getBoundingClientRect().bottom,sidebarBottom:sidebar.getBoundingClientRect().bottom,
                    uploadBottom:upload.getBoundingClientRect().bottom,pageHeight:document.documentElement.scrollHeight,viewport:innerHeight};
            })()`);
            check(bounds.scrollable && bounds.scrolled && bounds.headerStable, 'Transfer history must scroll inside bounded panel at '+width+': '+JSON.stringify(bounds));
            if (width > 980) {
                check(bounds.pageHeight <= bounds.viewport + 1 && bounds.uploadBottom < bounds.viewport &&
                    bounds.panelBottom < bounds.viewport && Math.abs(bounds.panelBottom-bounds.sidebarBottom) <= 1,
                    'Transfer columns and upload must fit the viewport at '+width+'x'+height+': '+JSON.stringify(bounds));
            }
            await capture('bounded-history-'+width, width, height);
        }
        await run(`currentDevices=[{id:'USB_FIXTURE',model:'Pixel 9 Pro',state:'device',battery:{level:82,isCharging:false}}];
            selectedDevice='USB_FIXTURE';renderDevices();
            currentTransfers=[{id:'progress',filename:'Gameplay-recording.mp4',direction:'pc-to-phone',status:'transferring',progress:42,size:'256 MiB',remotePath:'/sdcard/Movies/Gameplay-recording.mp4',timestamp:'12:34'},
            {id:'long',filename:'Uzun dosya '+ 'a'.repeat(180)+'.png',direction:'mobile-to-pc',status:'transferred',size:'8 MiB',localPath:'received/'+ 'b'.repeat(150),timestamp:'12:32'},
            {id:'retry',filename:'Build.zip',direction:'pc-to-phone',status:'interrupted',phoneSerial:'USB_FIXTURE',size:'96 MiB',timestamp:'12:30'}];renderTransfers();`);
        for (const theme of ['dark', 'light']) {
            await run(`applyTheme('${theme}')`);
            for (const width of [375, 768, 1024, 1440]) {
                for (const [view, action] of [['transfers',`document.querySelector('[data-tab="tab-deploy"]').click();`],
                    ['devices',`document.querySelector('[data-tab="tab-adb"]').click()`],
                    ['mirror',`document.querySelector('[data-tab="tab-screen"]').click()`]]) {
                    await run(action);
                    await capture(`${theme}-${view}-${width}`, width);
                }
            }
            const contrast = await run(`(() => {
                const root=getComputedStyle(document.documentElement);
                const luminance = hex => {const c=hex.trim().slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
                const bg=luminance(root.getPropertyValue('--bg-surface-elevated'));
                return ['--text-primary','--text-secondary','--text-tertiary'].map(token=>{const fg=luminance(root.getPropertyValue(token));return {token,ratio:(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)};});
            })()`);
            check(contrast.filter(item=>item.token!=='--text-tertiary').every(item=>item.ratio>=4.5), theme + ': primary/secondary text contrast ' + JSON.stringify(contrast));
            // The original muted colors are explicitly retained at the user's request.
            const originalPalette = theme === 'dark'
                ? { '--bg-app':'#09090b', '--bg-surface':'#121215', '--text-tertiary':'#71717a', '--accent':'#3b82f6' }
                : { '--bg-app':'#ffffff', '--bg-surface':'#fafafa', '--text-tertiary':'#a1a1aa', '--accent':'#2563eb' };
            check(await run(`Object.entries(${JSON.stringify(originalPalette)}).every(([name,value])=>getComputedStyle(document.documentElement).getPropertyValue(name).trim()===value)`), theme + ': original palette must be preserved');
        }
        await run(`document.querySelector('[data-tab="tab-deploy"]').click();window.picked=0;fileInput.click=()=>window.picked++;dropzone.focus()`);
        win.webContents.sendInputEvent({ type:'keyDown', keyCode:'Return' });
        win.webContents.sendInputEvent({ type:'keyUp', keyCode:'Return' });
        await new Promise(resolve => setTimeout(resolve, 80));
        check(await run('window.picked===1'), 'Desktop upload picker must support Enter');
        check(await run(`document.querySelector('.nav-item.active').getAttribute('aria-pressed')==='true'`), 'Selected navigation must be announced');
        await run(`document.querySelector('[data-tab="tab-screen"]').click();capturedScreenshots=[{id:'capture',dataUrl:${JSON.stringify(qr)},time:'12:34',resolution:'1080 × 2400'}];renderCapturesList();document.querySelector('.capture-thumb-box').focus();document.querySelector('.capture-thumb-box').click()`);
        check(await run(`document.activeElement===modalCloseBtn && imageModal.getAttribute('aria-modal')==='true'`), 'Preview dialog must receive focus');
        await capture('preview-dialog-375', 375);
        win.webContents.sendInputEvent({ type:'keyDown', keyCode:'Escape' });
        win.webContents.sendInputEvent({ type:'keyUp', keyCode:'Escape' });
        await new Promise(resolve => setTimeout(resolve, 80));
        check(await run(`imageModal.style.display==='none' && document.activeElement.classList.contains('capture-thumb-box')`), 'Escape must close preview and restore focus');
        await run(`setLanguage('en');document.querySelector('[data-tab="tab-adb"]').click();
            pairingCodeFields.hidden=false;manualPairingDetails.hidden=false;connectPhoneBtn.hidden=true;pairingCodeBtn.hidden=false;`);
        await capture('english-pairing-375', 375);
        await run(`document.querySelector('[data-tab="tab-deploy"]').click();`);
        await capture('english-transfers-768', 768);
        win.webContents.setZoomFactor(2);
        await capture('desktop-zoom-200', 1440);
        win.webContents.setZoomFactor(1);
        // Use Chromium's media override without OS changes.
        win.webContents.debugger.attach('1.3');
        await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name:'prefers-reduced-motion', value:'reduce' }] });
        check(await run(`getComputedStyle(document.querySelector('.nav-item')).transitionDuration==='1e-05s' || parseFloat(getComputedStyle(document.querySelector('.nav-item')).transitionDuration)<0.01`), 'Reduced motion must disable decorative transitions');
        win.webContents.debugger.detach();
        await win.loadURL(origin + '/mobile');
        await new Promise(resolve => setTimeout(resolve, 120));
        await run("applyLang('tr')");
        check(await run(`!document.querySelector('meta[name=viewport]').content.includes('user-scalable=no')`), 'Mobile pinch zoom must remain enabled');
        await run(`selectedFiles=[{name:'Landscape screenshot '+ 'a'.repeat(150)+'.png',size:1340000},{name:'Gameplay.mp4',size:48000000}];renderQueue();`);
        check(await run('!sendBtn.disabled'), 'Selected mobile files must enable the send action');
        check(await run(`!sendBtnLabel.textContent.includes('&bull;')`), 'Mobile count must display a bullet, not HTML text');
        await run(`window.picked=0;fileInput.click=()=>window.picked++;dropTrigger.focus()`);
        win.webContents.sendInputEvent({ type:'keyDown', keyCode:'Space' });
        win.webContents.sendInputEvent({ type:'keyUp', keyCode:'Space' });
        await new Promise(resolve => setTimeout(resolve, 80));
        check(await run('window.picked===1'), 'Mobile upload picker must support Space');
        for (const width of [375, 768, 1024, 1440]) {
            await run('tabSendBtn.click()');
            await capture('mobile-send-' + width, width);
            const targets = await run(`[...document.querySelectorAll('.lang-btn,.tab-btn,.picker-btn,.file-item-remove')].filter(el=>el.getClientRects().length).every(el=>{const r=el.getBoundingClientRect();return r.width>=44 && r.height>=44;})`);
            check(targets, 'Mobile touch targets must be 44px at ' + width);
            await run(`tabApksBtn.click();apks=[{id:'fixture',name:'Build-'+ 'a'.repeat(140)+'.apk',label:'Truck Simulator '+ 'Long title '.repeat(10),packageName:'com.studio.truck',size:'128 MB',versionName:'2.4.1',updatedAt:Date.now()}];renderApks()`);
            await capture('mobile-apks-' + width, width);
            // Let the tab's own fetch settle first so the fixture is not overwritten by the empty server list.
            await run('tabSharedBtn.click()');
            await new Promise(resolve => setTimeout(resolve, 120));
            await run(`setSharedFiles([{id:'pc1',filename:'Sözleşme taslağı '+ 'uzun '.repeat(30)+'.pdf',size:'2.4 MB',timestamp:'12:40'}],false)`);
            await capture('mobile-shared-' + width, width);
        }
        // Phones without the QR key or approval see only the access request card.
        await run(`setAuthorized(false);accessText.textContent=i18n.tr.access_pending`);
        await capture('mobile-access-375', 375);
        check(await run(`!viewAccess.classList.contains('hidden') && viewSend.classList.contains('hidden') && segmentTabs.classList.contains('hidden')`), 'Unauthorized phones must only see the access card');
        await run('setAuthorized(true)');
        await run(`showToast('Aktarım tamamlanamadı. '+ 'Uzun hata açıklaması '.repeat(20),true)`);
        await capture('mobile-error-375', 375);
        await run('tabSendBtn.click()');
        await capture('mobile-landscape', 812, 375);
        // Resumable flow: a session request, then one chunk request per 4 MiB.
        await run(`applyLang('en');window.fixtureUpload=null;window.XMLHttpRequest=class {constructor(){this.upload={};window.fixtureUpload=this;}open(){}send(){}abort(){}setRequestHeader(){}};
            window.fetch=async url=>({ok:true,status:200,json:async()=>url.endsWith('/sessions')?{success:true,id:'fx',received:0}:{success:true}});
            selectedFiles=[new File(['fixture'],'Screenshot.png',{type:'image/png'})];renderQueue();sendBtn.click();void 0`);
        await until('!!window.fixtureUpload');
        await run('fixtureUpload.upload.onprogress({lengthComputable:true,loaded:3,total:7})');
        check(await run(`sendBtn.disabled && sendBtn.getAttribute('aria-busy')==='true'`), 'Mobile upload must announce busy and prevent duplicate submission');
        await capture('mobile-uploading-375', 375);
        await run(`fixtureUpload.status=400;fixtureUpload.responseText=JSON.stringify({success:false,error:{message:'Disk full. Free space on your computer and retry.'}});fixtureUpload.onload()`);
        await until('!isUploading');
        check(await run(`!sendBtn.disabled && sendBtn.getAttribute('aria-busy')==='false' && selectedFiles.length===1 && progressText.textContent.includes('Disk full')`), 'Mobile upload error must retain files and show a persistent retry explanation');
        await capture('mobile-upload-error-375', 375);
        await run('window.fixtureUpload=null;sendBtn.click()');
        await until('!!window.fixtureUpload');
        await run(`fixtureUpload.status=200;fixtureUpload.responseText='{"success":true,"received":7}';fixtureUpload.onload()`);
        await until('!isUploading');
        check(await run(`selectedFiles.length===0 && sendBtn.disabled`), 'Successful retry must clear the sent queue');
        win.webContents.setZoomFactor(1.5);
        await capture('mobile-zoom-150', 375);
        win.webContents.setZoomFactor(1);
        check(!errors.length, 'Browser console errors: ' + errors.join('; '));
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ metrics, failures, errors }, null, 2));
        assert.equal(failures.length, 0, failures.join('\n'));
        console.log(`${metrics.length} rendered screen checks passed; keyboard, dialog, contrast and mobile targets passed.`);
    } finally {
        win.destroy();
        for (const client of h.wss.clients) client.terminate();
        await new Promise(resolve => h.wss.close(resolve));
        h.server.closeAllConnections();
        await new Promise(resolve => h.server.close(resolve));
        app.quit();
    }
}).catch(error => { console.error(error); app.exit(1); });
