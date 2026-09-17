const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

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

function startServer() {
    return new Promise((resolve) => {
        http.get('http://localhost:4500/api/status', () => {
            console.log('[Electron]: Existing backend detected on port 4500');
            resolve();
        }).on('error', () => {
            try {
                console.log('[Electron]: Starting in-process Node.js backend...');
                require('./server.js');
            } catch (e) {
                console.error('[Electron]: Server startup error:', e.message);
            }
            resolve();
        });
    });
}

function waitForServer(url, timeout = 10000) {
    const startTime = Date.now();
    return new Promise((resolve) => {
        const check = () => {
            http.get(url, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    resolve(true);
                } else if (Date.now() - startTime < timeout) {
                    setTimeout(check, 200);
                } else {
                    resolve(false);
                }
            }).on('error', () => {
                if (Date.now() - startTime < timeout) {
                    setTimeout(check, 200);
                } else {
                    resolve(false);
                }
            });
        };
        check();
    });
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
    await waitForServer('http://localhost:4500/api/status', 8000);

    mainWindow.loadURL('http://localhost:4500');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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

app.whenReady().then(async () => {
    await startServer();
    createTray();
    await createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
