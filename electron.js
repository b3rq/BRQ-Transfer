const { app, BrowserWindow, Tray, Menu, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let ownedBackend = null;
let shutdownComplete = false;
let recovering = false;
const port = Number(process.env.PORT || 4500);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 1–65535 arasında olmalıdır.');
const baseUrl = 'http://localhost:' + port;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function probeServer(url, timeout = 1500) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error, value) => {
            if (settled) return;
            settled = true; clearTimeout(deadline);
            if (error) reject(error); else resolve(value);
        };
        const deadline = setTimeout(() => { request.destroy(); finish(new Error('Sunucu yanıtı zaman aşımına uğradı.')); }, timeout);
        const request = http.get(url, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; if (body.length > 16384) request.destroy(new Error('Geçersiz sunucu yanıtı.')); });
            response.on('error', error => finish(error));
            response.on('end', () => {
                try {
                    const health = JSON.parse(body);
                    if (response.statusCode !== 200 || health.app !== 'brq-transfer') throw new Error('Port başka bir uygulama tarafından kullanılıyor. PORT ayarını değiştirin.');
                    finish(null, health.ready === true);
                } catch (error) { finish(Object.assign(error, { code: 'DIFFERENT_APP' })); }
            });
        });
        request.setTimeout(timeout, () => request.destroy(new Error('Sunucu yanıtı zaman aşımına uğradı.')));
        request.on('error', error => finish(error));
    });
}
async function startServer() {
    try { await probeServer(baseUrl + '/api/health'); }
    catch (error) {
        if (error.code !== 'ECONNREFUSED') throw error;
        ownedBackend = require('./server.js');
        await ownedBackend.startup;
    }
}
async function waitForServer(url, timeout = 10000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        try { if (await probeServer(url, Math.min(1500, deadline - Date.now()))) return true; }
        catch (error) { if (error.code === 'DIFFERENT_APP') throw error; }
        if (Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, Math.min(200, deadline - Date.now())));
    }
    return false;
}

async function createWindow() {
    const icoPath = path.join(__dirname, 'public', 'icon.ico');
    const iconPath = path.join(__dirname, 'public', 'icon.png');

    const winOpts = {
        width: 1380,
        height: 880,
        minWidth: 1080,
        minHeight: 680,
        title: 'BRQ Transfer - Too lazy for cables',
        backgroundColor: '#0a0d14',
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false
        }
    };

    if (fs.existsSync(icoPath)) {
        winOpts.icon = icoPath;
    } else if (fs.existsSync(iconPath)) {
        winOpts.icon = iconPath;
    }

    mainWindow = new BrowserWindow(winOpts);

    // Wait for the backend to be online
    if (!await waitForServer(baseUrl + '/api/health', 8000)) throw new Error('BRQ Transfer hazır hale gelemedi. Portu ve klasör izinlerini kontrol edin.');

    mainWindow.webContents.on('did-fail-load', () => { if (!isQuitting) showRecovery(new Error('Panel yüklenemedi. Yeniden deneyin.')); });
    const session = JSON.parse(fs.readFileSync(path.join(__dirname, '.dashboard-session.json'), 'utf8'));
    if (session.port !== port || !/^[a-f0-9]{64}$/.test(session.token)) throw new Error('Yerel yönetim oturumu geçersiz. Hub sunucusunu yeniden başlatın.');
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    await mainWindow.loadURL(baseUrl + '/?session=' + session.token);
}

function createTray() {
    const iconPath = path.join(__dirname, 'public', 'icon.png');
    if (!fs.existsSync(iconPath)) return;
    try {
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'BRQ Transfer Aç',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            {
                label: 'Yeniden Yükle',
                click: () => {
                    if (mainWindow) mainWindow.reload();
                }
            },
            { type: 'separator' },
            {
                label: 'Çıkış',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);
        tray.setToolTip('BRQ Transfer - Too lazy for cables');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    } catch (e) {
        console.warn('Tray creation skipped:', e.message);
    }
}

async function showRecovery(error) {
    if (recovering || isQuitting) return;
    recovering = true;
    if (mainWindow) { mainWindow.destroy(); mainWindow = null; }
    const result = await dialog.showMessageBox({ type: 'error', title: 'BRQ Transfer', message: error.message, buttons: ['Yeniden dene', 'Çıkış'] });
    recovering = false;
    if (result.response === 0) { try { await startServer(); await createWindow(); } catch (nextError) { await showRecovery(nextError); } }
    else app.quit();
}

app.whenReady().then(async () => {
    try { await startServer(); createTray(); await createWindow(); } catch (error) { await showRecovery(error); }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow().catch(showRecovery);
        } else if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

app.on('before-quit', event => {
    isQuitting = true;
    if (ownedBackend && !shutdownComplete) {
        event.preventDefault();
        ownedBackend.shutdown().finally(() => { shutdownComplete = true; app.quit(); });
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !recovering) {
        app.quit();
    }
});
