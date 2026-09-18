const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const WebSocket = require('ws');
const multer = require('multer');
const QRCode = require('qrcode');
const chokidar = require('chokidar');
const cors = require('cors');
const net = require('net');

const PORT = process.env.PORT || 4500;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Directories
const BASE_DIR = __dirname;
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const WATCH_DIR = path.join(BASE_DIR, 'watch');
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const RECEIVED_DIR = path.join(BASE_DIR, 'received');
const CONFIG_FILE = path.join(BASE_DIR, 'config.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(RECEIVED_DIR)) fs.mkdirSync(RECEIVED_DIR, { recursive: true });

// Configuration state
let config = {
    watchFolder: WATCH_DIR,
    autoInstallOnAdb: false,
    autoLaunchAfterInstall: true,
    selectedAdbDevice: '',
    selectedIp: '',
    language: 'tr'
};

if (fs.existsSync(CONFIG_FILE)) {
    try {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    } catch (e) {
        console.error('Config read error:', e.message);
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error('Config save error:', e.message);
    }
}

// Smart Local IP Detection with Subnet & Hotspot Prioritization
let lastDetectedConnectedIp = '';

function getAllLocalIps() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    // Find if an active ADB device is connected over Wi-Fi
    let targetSubnet = null;
    const activeDevice = config.selectedAdbDevice || lastDetectedConnectedIp;
    if (activeDevice && activeDevice.includes(':')) {
        const devIp = activeDevice.split(':')[0];
        const parts = devIp.split('.');
        if (parts.length === 4) {
            targetSubnet = `${parts[0]}.${parts[1]}.${parts[2]}.`;
        }
    }

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const ip = iface.address;
                if (ip.startsWith('169.254.')) continue; // Skip unassigned APIPA

                const isHotspot = ip.startsWith('192.168.137.');
                const isVirtual = !isHotspot && (/vEthernet|Virtual|Host-Only|Loopback|WSL/i.test(name) || /[\*]/.test(name));

                let priority = 1;
                if (targetSubnet && ip.startsWith(targetSubnet)) {
                    // Highest priority: matches the subnet of the connected phone!
                    priority = 30;
                } else if (isHotspot) {
                    // Windows Mobile Hotspot adapter: connected phones rely on this
                    priority = 20;
                } else if (!isVirtual) {
                    priority = 10;
                } else {
                    priority = 0;
                }

                let friendlyName = name;
                if (isHotspot) {
                    friendlyName = 'Mobil Etkin Nokta (Hotspot)';
                } else if (/wi-?fi/i.test(name)) {
                    friendlyName = 'Wi-Fi';
                } else if (/ethernet/i.test(name)) {
                    friendlyName = 'Ethernet';
                }

                candidates.push({ ip, name, friendlyName, priority });
            }
        }
    }

    // Deduplicate by IP address
    const seen = new Set();
    const unique = [];
    for (const c of candidates) {
        if (!seen.has(c.ip)) {
            seen.add(c.ip);
            unique.push(c);
        }
    }

    unique.sort((a, b) => b.priority - a.priority);
    return unique;
}

function getPrimaryIp() {
    const ips = getAllLocalIps();
    if (config.selectedIp && ips.some(i => i.ip === config.selectedIp)) {
        return config.selectedIp;
    }
    return ips.length > 0 ? ips[0].ip : '127.0.0.1';
}

// Tool Path Detection (ADB & AAPT)
function findBinary(name, subpath = '') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const candidates = [
        path.join(localAppData, 'Android', 'Sdk', 'build-tools', '36.0.0', name),
        path.join(localAppData, 'Android', 'Sdk', 'build-tools', '36.1.0', name),
        path.join(localAppData, 'Android', 'Sdk', 'build-tools', '37.0.0', name),
        path.join(localAppData, 'Android', 'Sdk', 'platform-tools', name),
        `C:\\Program Files\\Unity\\Hub\\Editor\\6000.0.72f1\\Editor\\Data\\PlaybackEngines\\AndroidPlayer\\SDK\\${subpath || 'platform-tools'}\\${name}`,
        `C:\\Program Files\\Unity\\Hub\\Editor\\2022.3.62f2\\Editor\\Data\\PlaybackEngines\\AndroidPlayer\\SDK\\${subpath || 'platform-tools'}\\${name}`,
        name
    ];
    for (const p of candidates) {
        if (p === name || fs.existsSync(p)) return p;
    }
    return name;
}

const ADB_BIN = findBinary('adb.exe', 'platform-tools');
const AAPT_BIN = findBinary('aapt.exe', 'build-tools');
console.log('ADB:', ADB_BIN);
console.log('AAPT:', AAPT_BIN);

// In-Memory APK list & Universal File Transfers
let apkList = [];
let transfersList = [];

function getTargetAndroidDir(filename) {
    const ext = path.extname(filename).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif'];
    const videoExts = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.3gp', '.flv', '.m4v', '.ts'];
    const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.wma', '.mid'];

    let category = 'document';
    let isMedia = false;

    if (imageExts.includes(ext)) {
        category = 'image';
        isMedia = true;
    } else if (videoExts.includes(ext)) {
        category = 'video';
        isMedia = true;
    } else if (audioExts.includes(ext)) {
        category = 'audio';
        isMedia = true;
    } else if (ext === '.apk') {
        category = 'apk';
    }

    return { dir: '/sdcard/Download', category, isMedia };
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- Transfers Persistence & Disk Synchronization ---
const TRANSFERS_FILE = path.join(BASE_DIR, 'transfers.json');

function saveTransfers() {
    try {
        fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(transfersList, null, 2), 'utf8');
    } catch (e) {
        console.error('Transfers save error:', e.message);
    }
}

function syncTransfersWithDisk() {
    let saved = [];
    if (fs.existsSync(TRANSFERS_FILE)) {
        try {
            saved = JSON.parse(fs.readFileSync(TRANSFERS_FILE, 'utf8'));
            if (!Array.isArray(saved)) saved = [];
        } catch (e) {
            console.error('Transfers read error:', e.message);
            saved = [];
        }
    }

    // Filter out records whose files have been deleted from disk
    saved = saved.filter(t => {
        if (t.direction === 'mobile-to-pc') {
            const filePath = t.localPath || path.join(RECEIVED_DIR, t.filename);
            return fs.existsSync(filePath);
        }
        if (t.localPath) {
            return fs.existsSync(t.localPath);
        }
        return true;
    });

    // Scan RECEIVED_DIR to auto-discover any files that physically exist on disk
    if (fs.existsSync(RECEIVED_DIR)) {
        try {
            const files = fs.readdirSync(RECEIVED_DIR);
            for (const file of files) {
                const fullPath = path.join(RECEIVED_DIR, file);
                try {
                    const stats = fs.statSync(fullPath);
                    if (!stats.isFile()) continue;

                    const alreadyInList = saved.some(t => 
                        t.filename === file || t.localPath === fullPath
                    );

                    if (!alreadyInList) {
                        const meta = getTargetAndroidDir(file);
                        saved.push({
                            id: Date.now() + Math.random().toString(36).substr(2, 5),
                            filename: file,
                            originalName: file,
                            size: formatBytes(stats.size),
                            rawSize: stats.size,
                            category: meta.category,
                            direction: 'mobile-to-pc',
                            localPath: fullPath,
                            timestamp: new Date(stats.mtime).toLocaleTimeString(),
                            mtime: stats.mtime,
                            status: 'transferred'
                        });
                    }
                } catch (e) {}
            }
        } catch (e) {
            console.error('Scan received folder error:', e.message);
        }
    }

    // Sort by mtime / timestamp descending (most recent first)
    saved.sort((a, b) => {
        const timeA = a.mtime ? new Date(a.mtime).getTime() : (typeof a.id === 'number' ? a.id : 0);
        const timeB = b.mtime ? new Date(b.mtime).getTime() : (typeof b.id === 'number' ? b.id : 0);
        return timeB - timeA;
    });

    transfersList = saved.slice(0, 100);
    saveTransfers();
    return transfersList;
}

// Watch RECEIVED_DIR for file deletions so UI updates live
if (fs.existsSync(RECEIVED_DIR)) {
    const receivedWatcher = chokidar.watch(RECEIVED_DIR, {
        ignoreInitial: true,
        persistent: true
    });
    receivedWatcher.on('unlink', (filePath) => {
        console.log('[Received Klasörü]: Dosya silindi:', path.basename(filePath));
        syncTransfersWithDisk();
        broadcast({ type: 'TRANSFERS_UPDATED', transfers: transfersList });
    });
}

function extractApkMetadata(apkPath) {
    return new Promise((resolve) => {
        let stdout = '';
        const proc = spawn(AAPT_BIN, ['dump', 'badging', apkPath]);
        proc.stdout.on('data', d => { stdout += d.toString('utf8'); });
        proc.on('error', () => {
            resolve({
                packageName: 'com.app.android',
                versionName: '1.0',
                versionCode: '1',
                label: path.basename(apkPath).replace(/\.apk$/i, ''),
                minSdk: '24',
                targetSdk: '34',
                launchableActivity: ''
            });
        });
        proc.on('close', (code) => {
            if (code !== 0 || !stdout) {
                return resolve({
                    packageName: 'com.app.android',
                    versionName: '1.0',
                    versionCode: '1',
                    label: path.basename(apkPath).replace(/\.apk$/i, ''),
                    minSdk: '24',
                    targetSdk: '34',
                    launchableActivity: ''
                });
            }

            const pkgMatch = stdout.match(/package:\s*name='([^']+)'\s*versionCode='([^']*)'\s*versionName='([^']*)'/);
            const labelMatch = stdout.match(/application-label(?:-[a-zA-Z_]+)?:'([^']+)'/) || stdout.match(/application:\s*label='([^']+)'/);
            const minSdkMatch = stdout.match(/sdkVersion:'([^']+)'/);
            const targetSdkMatch = stdout.match(/targetSdkVersion:'([^']+)'/);
            const activityMatch = stdout.match(/launchable-activity:\s*name='([^']+)'/);

            resolve({
                packageName: pkgMatch ? pkgMatch[1] : 'com.app.android',
                versionCode: pkgMatch ? pkgMatch[2] : '1',
                versionName: pkgMatch ? pkgMatch[3] : '1.0',
                label: labelMatch ? labelMatch[1] : path.basename(apkPath).replace(/\.apk$/i, ''),
                minSdk: minSdkMatch ? minSdkMatch[1] : '24',
                targetSdk: targetSdkMatch ? targetSdkMatch[1] : '34',
                launchableActivity: activityMatch ? activityMatch[1] : ''
            });
        });
    });
}

async function registerApk(filePath, source = 'drop') {
    try {
        if (!fs.existsSync(filePath)) return null;
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) return null;

        const fileName = path.basename(filePath);
        const id = Buffer.from(filePath).toString('hex').slice(0, 16);

        // Deduplication
        const existing = apkList.find(item => item.filePath === filePath);
        if (existing && existing.updatedAt && new Date(existing.updatedAt).getTime() === stats.mtime.getTime()) {
            return existing;
        }

        apkList = apkList.filter(item => item.filePath !== filePath);

        const meta = await extractApkMetadata(filePath);

        const apkItem = {
            id,
            name: fileName,
            size: formatBytes(stats.size),
            rawSize: stats.size,
            filePath: filePath,
            source: source,
            updatedAt: stats.mtime,
            downloadUrl: `/download/${id}`,
            ...meta
        };

        apkList.unshift(apkItem);
        if (apkList.length > 50) apkList = apkList.slice(0, 50);

        console.log(`[Yeni APK]: ${meta.label} (${fileName}) v${meta.versionName} (${apkItem.size})`);
        broadcast({
            type: 'NEW_APK',
            apk: apkItem,
            message: `Yeni APK hazır: ${meta.label} (v${meta.versionName})`
        });

        // Auto ADB install
        if (config.autoInstallOnAdb && config.selectedAdbDevice) {
            console.log(`[Otomatik ADB]: ${fileName} -> ${config.selectedAdbDevice}`);
            installApkViaAdb(config.selectedAdbDevice, filePath, apkItem);
        }

        return apkItem;
    } catch (err) {
        console.error('APK registration error:', err.message);
        return null;
    }
}

function scanFolder(dirPath, source) {
    if (!fs.existsSync(dirPath)) return;
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            if (file.toLowerCase().endsWith('.apk')) {
                registerApk(fullPath, source);
            }
        }
    } catch (err) {
        console.error(`Scan error ${dirPath}:`, err.message);
    }
}

// Folder Watcher setup
let currentWatcher = null;
function setupWatcher(targetDir) {
    if (currentWatcher) {
        try { currentWatcher.close(); } catch (e) {}
    }
    if (!fs.existsSync(targetDir)) {
        try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
    }
    console.log(`[Klasör İzleniyor]: ${targetDir}`);
    const normalizedDir = path.resolve(targetDir).replace(/\\/g, '/');
    currentWatcher = chokidar.watch(normalizedDir, {
        persistent: true,
        usePolling: true,
        interval: 600,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 1200,
            pollInterval: 300
        }
    });

    currentWatcher.on('add', filePath => {
        if (filePath.toLowerCase().endsWith('.apk')) {
            registerApk(filePath, 'folder-watcher');
        }
    });

    currentWatcher.on('change', filePath => {
        if (filePath.toLowerCase().endsWith('.apk')) {
            registerApk(filePath, 'folder-watcher');
        }
    });
}

// ADB Management functions
function getAdbBattery(deviceId) {
    return new Promise((resolve) => {
        if (!deviceId) return resolve(null);
        exec(`"${ADB_BIN}" -s ${deviceId} shell dumpsys battery`, { timeout: 2500 }, (err, stdout) => {
            if (err || !stdout) return resolve(null);
            const levelMatch = stdout.match(/level:\s*(\d+)/i);
            const scaleMatch = stdout.match(/scale:\s*(\d+)/i);
            const acMatch = stdout.match(/AC powered:\s*true/i);
            const usbMatch = stdout.match(/USB powered:\s*true/i);
            const wirelessMatch = stdout.match(/Wireless powered:\s*true/i);
            const statusMatch = stdout.match(/status:\s*(\d+)/i);

            const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;
            const scale = scaleMatch ? parseInt(scaleMatch[1], 10) : 100;
            const percentage = scale > 0 ? Math.round((level / scale) * 100) : level;
            const isCharging = !!(acMatch || usbMatch || wirelessMatch || (statusMatch && parseInt(statusMatch[1], 10) === 2));

            resolve({
                level: percentage,
                isCharging
            });
        });
    });
}

function getAdbDevices() {
    return new Promise((resolve) => {
        exec(`"${ADB_BIN}" devices -l`, async (err, stdout, stderr) => {
            if (err) {
                console.error('ADB devices error:', stderr || err.message);
                return resolve([]);
            }
            const lines = stdout.split('\n');
            const devices = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                    const id = parts[0];
                    const state = parts[1];
                    let model = 'Android Cihaz';
                    const modelMatch = line.match(/model:([^\s]+)/);
                    if (modelMatch) model = modelMatch[1].replace(/_/g, ' ');
                    const isWifi = id.includes(':');
                    devices.push({ id, state, model, isWifi });
                }
            }

            try {
                await Promise.all(devices.map(async (d) => {
                    if (d.state === 'device') {
                        d.battery = await getAdbBattery(d.id);
                        if (d.id.includes(':')) {
                            lastDetectedConnectedIp = d.id;
                        }
                        // Reverse forward port 4500 so phone can always access localhost:4500
                        exec(`"${ADB_BIN}" -s ${d.id} reverse tcp:${PORT} tcp:${PORT}`, () => {});
                    }
                }));
            } catch (e) {}

            resolve(devices);
        });
    });
}

function verifyDeviceConnected(deviceIdOrIp) {
    return new Promise(resolve => {
        exec(`"${ADB_BIN}" devices`, (err, stdout) => {
            if (err || !stdout) return resolve(false);
            const isListed = stdout.split('\n').some(line => {
                const parts = line.trim().split(/\s+/);
                return parts[0].includes(deviceIdOrIp) && parts[1] === 'device';
            });
            resolve(isListed);
        });
    });
}

function adbConnect(ip, port = 5555) {
    return new Promise((resolve, reject) => {
        if (!/^[a-zA-Z0-9.:_-]+$/.test(ip) || !/^\d+$/.test(String(port))) {
            return reject(new Error('Geçersiz IP veya port parametresi'));
        }
        const proc = spawn(ADB_BIN, ['connect', `${ip}:${port}`]);
        let out = '';
        proc.stdout.on('data', d => { out += d.toString('utf8'); });
        proc.stderr.on('data', d => { out += d.toString('utf8'); });
        proc.on('close', () => {
            if (out.includes('cannot connect') || out.includes('failed to connect')) {
                return reject(new Error(out.trim() || 'Bağlantı kurulamadı'));
            }
            resolve(out.trim());
        });
        proc.on('error', err => reject(err));
    });
}

function adbPair(ip, port, code) {
    return new Promise((resolve, reject) => {
        if (!/^[a-zA-Z0-9.:_-]+$/.test(ip) || !/^\d+$/.test(String(port)) || !/^\d+$/.test(String(code))) {
            return reject(new Error('Geçersiz IP, port veya eşleştirme kodu'));
        }
        const proc = spawn(ADB_BIN, ['pair', `${ip}:${port}`, String(code)]);
        let out = '';
        proc.stdout.on('data', d => { out += d.toString('utf8'); });
        proc.stderr.on('data', d => { out += d.toString('utf8'); });
        proc.on('close', () => {
            if (out.includes('Failed') || out.includes('error')) {
                return reject(new Error(out.trim() || 'Eşleştirme başarısız'));
            }
            resolve(out.trim());
        });
        proc.on('error', err => reject(err));
    });
}

function launchAppViaAdb(deviceId, packageName) {
    return new Promise((resolve) => {
        if (!/^[a-zA-Z0-9._-]+$/.test(packageName)) {
            return resolve({ success: false, error: 'Geçersiz paket adı' });
        }
        const args = [];
        if (deviceId && /^[a-zA-Z0-9.:_-]+$/.test(deviceId)) {
            args.push('-s', deviceId);
        }
        args.push('shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1');
        const proc = spawn(ADB_BIN, args);
        let stdout = '';
        proc.stdout.on('data', d => { stdout += d.toString('utf8'); });
        proc.on('close', (code) => {
            resolve({ success: code === 0, output: stdout });
        });
        proc.on('error', err => resolve({ success: false, error: err.message }));
    });
}

function installApkViaAdb(deviceId, apkPath, apkMeta = null) {
    broadcast({
        type: 'ADB_INSTALL_START',
        deviceId,
        apkName: path.basename(apkPath),
        message: `${path.basename(apkPath)} cihaza aktarılıyor ve kuruluyor...`
    });

    const args = [];
    if (deviceId && /^[a-zA-Z0-9.:_-]+$/.test(deviceId)) {
        args.push('-s', deviceId);
    }
    args.push('install', '-r', '-d', '-t', apkPath);

    console.log('[ADB Kurulum Başladı]:', ADB_BIN, args.join(' '));
    const proc = spawn(ADB_BIN, args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString('utf8'); });
    proc.stderr.on('data', d => { stderr += d.toString('utf8'); });

    proc.on('close', async (code) => {
        if (code !== 0 || (stdout && stdout.includes('Failure'))) {
            const errorMsg = stdout || stderr || 'Kurulum başarısız';
            console.error('[ADB Kurulum Hatası]:', errorMsg);
            broadcast({
                type: 'ADB_INSTALL_ERROR',
                deviceId,
                apkName: path.basename(apkPath),
                error: errorMsg
            });
        } else {
            console.log('[ADB Kurulum Başarılı]:', stdout);
            broadcast({
                type: 'ADB_INSTALL_SUCCESS',
                deviceId,
                apkName: path.basename(apkPath),
                output: stdout.trim()
            });

            if (config.autoLaunchAfterInstall && apkMeta && apkMeta.packageName) {
                console.log(`[ADB Başlatılıyor]: ${apkMeta.packageName}`);
                await launchAppViaAdb(deviceId, apkMeta.packageName);
            }
        }
    });
}

// ADB Wireless QR Code Pairing Engine
function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let res = "";
    for (let i = 0; i < length; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
}

let currentPairingSession = null;

async function startAdbQrPairing() {
    if (currentPairingSession) {
        currentPairingSession.cancelled = true;
    }

    const serviceName = `ADB_WIFI_${generateRandomString(12)}`;
    const password = generateRandomString(16);
    const qrText = `WIFI:T:ADB;S:${serviceName};P:${password};;`;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
    });

    const session = {
        serviceName,
        password,
        qrText,
        qrDataUrl,
        status: 'waiting_for_scan',
        pairedIp: '',
        message: 'Telefonunuzdan "Cihazı QR koduyla eşle"yi açıp bu kodu tarayın...',
        startedAt: Date.now(),
        cancelled: false
    };

    currentPairingSession = session;
    runPairingLoop(session);
    return session;
}

function testTcpPort(ip, port, timeout = 90) {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, ip);
    });
}

async function autoResolveConnect(ip, pairPort, session) {
    console.log(`[Auto-Connect]: ${ip} için bağlantı portu aranıyor...`);

    // 1. Check if already listed as device
    if (await verifyDeviceConnected(ip)) {
        return true;
    }

    // 2. Check mDNS for connect port
    for (let attempt = 0; attempt < 3; attempt++) {
        const mdnsOut = await new Promise(r => exec(`"${ADB_BIN}" mdns services`, (e, o) => r(o || '')));
        const connectLine = mdnsOut.split('\n').find(l => (l.includes('_adb-tls-connect._tcp') || l.includes('_adb._tcp')) && l.includes(ip));
        if (connectLine) {
            const cParts = connectLine.trim().split(/\s+/);
            const cAddr = cParts.find(p => p.includes(':') && !p.includes('_adb'));
            if (cAddr) {
                const mdnsPort = parseInt(cAddr.substring(cAddr.lastIndexOf(':') + 1), 10);
                if (mdnsPort) {
                    console.log(`[Auto-Connect]: mDNS portu bulundu: ${ip}:${mdnsPort}`);
                    await new Promise(r => exec(`"${ADB_BIN}" connect ${ip}:${mdnsPort}`, () => r()));
                    if (await verifyDeviceConnected(ip)) return true;
                }
            }
        }
        await new Promise(r => setTimeout(r, 400));
    }

    // 3. High-priority candidates: previous device, 5555, pairPort and neighbors
    const priorityCandidates = [];
    if (config.selectedAdbDevice && config.selectedAdbDevice.includes(ip)) {
        const p = parseInt(config.selectedAdbDevice.split(':')[1], 10);
        if (p) priorityCandidates.push(p);
    }
    priorityCandidates.push(5555);
    if (pairPort) {
        const numPairPort = parseInt(pairPort, 10);
        if (numPairPort) {
            priorityCandidates.push(numPairPort);
            for (let d = 1; d <= 25; d++) {
                priorityCandidates.push(numPairPort - d);
                priorityCandidates.push(numPairPort + d);
            }
        }
    }

    for (const port of priorityCandidates) {
        if (port < 1024 || port > 65535) continue;
        const isOpen = await testTcpPort(ip, port, 70);
        if (isOpen) {
            console.log(`[Auto-Connect]: Öncelikli port açık bulundu: ${ip}:${port}, bağlanılıyor...`);
            await new Promise(r => exec(`"${ADB_BIN}" connect ${ip}:${port}`, () => r()));
            if (await verifyDeviceConnected(ip)) return true;
        }
    }

    // 4. Fast concurrency sweep across Android wireless debugging range (30000 - 45000)
    console.log(`[Auto-Connect]: Hızlı port taraması başlatılıyor (30000-45000)...`);
    session.message = `Eşleşti! Otomatik bağlantı kuruluyor...`;
    broadcast({ type: 'ADB_PAIR_STATUS', session });

    let foundPort = null;
    const concurrency = 50;
    let currentPort = 30000;
    const maxPort = 45000;

    async function worker() {
        while (currentPort <= maxPort && !foundPort && !session.cancelled) {
            const p = currentPort++;
            const open = await testTcpPort(ip, p, 70);
            if (open) {
                console.log(`[Auto-Connect]: Port açık tespit edildi: ${ip}:${p}, bağlanılıyor...`);
                await new Promise(r => exec(`"${ADB_BIN}" connect ${ip}:${p}`, () => r()));
                if (await verifyDeviceConnected(ip)) {
                    foundPort = p;
                    break;
                }
            }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
    return !!foundPort;
}

async function runPairingLoop(session) {
    console.log(`[ADB QR Eşleme Başlatıldı]: ${session.serviceName}`);
    const startTime = Date.now();
    const TIMEOUT_MS = 120000;

    while (!session.cancelled && (Date.now() - startTime < TIMEOUT_MS)) {
        try {
            const stdout = await new Promise((resolve) => {
                exec(`"${ADB_BIN}" mdns services`, (err, out) => resolve(out || ''));
            });

            const lines = stdout.split('\n');
            const pairLine = lines.find(l => l.includes('_adb-tls-pairing._tcp'));

            if (pairLine) {
                const parts = pairLine.trim().split(/\s+/);
                const addressPort = parts.find(p => p.includes(':') && !p.includes('_adb'));
                if (addressPort) {
                    const sep = addressPort.lastIndexOf(':');
                    const ip = addressPort.substring(0, sep);
                    const pairPort = addressPort.substring(sep + 1);

                    console.log(`[ADB QR]: Cihaz algılandı: ${ip}:${pairPort}`);
                    session.status = 'pairing';
                    session.pairedIp = ip;
                    session.message = `Cihaz algılandı (${ip}:${pairPort}), eşleştiriliyor...`;
                    broadcast({ type: 'ADB_PAIR_STATUS', session });

                    const pairResult = await new Promise((resolve) => {
                        exec(`"${ADB_BIN}" pair ${ip}:${pairPort} ${session.password}`, (err, out, errOut) => {
                            if (err || (out && out.includes('Failed'))) {
                                resolve({ success: false, error: errOut || out || (err ? err.message : '') });
                            } else {
                                resolve({ success: true, output: out });
                            }
                        });
                    });

                    if (pairResult.success) {
                        console.log(`[ADB QR]: Eşleşme başarılı! Cihaz: ${ip}`);
                        session.status = 'paired';
                        session.pairedIp = ip;
                        session.message = `✅ Eşleşme başarılı! Bağlantı portu aranıyor...`;
                        broadcast({ type: 'ADB_PAIR_STATUS', session });

                        // Automatic Zero-Click Connect Port Resolution
                        const connected = await autoResolveConnect(ip, pairPort, session);
                        if (connected) {
                            session.status = 'connected';
                            session.message = `Cihaz başarıyla bağlandı! (${ip})`;
                            const devices = await getAdbDevices();
                            const activeDev = devices.find(d => d.id.includes(ip));
                            if (activeDev) {
                                config.selectedAdbDevice = activeDev.id;
                                saveConfig();
                            }
                            broadcast({ type: 'ADB_PAIR_STATUS', session });
                            broadcast({ type: 'DEVICES_UPDATED', devices });
                            return;
                        }

                        // Last resort fallback if auto-detection fails
                        session.status = 'paired_need_port';
                        session.pairedIp = ip;
                        session.message = `Eşleşme tamamlandı. Bağlantı portunu girin:`;
                        broadcast({ type: 'ADB_PAIR_STATUS', session });
                        return;
                    } else {
                        console.error('[ADB QR]: Eşleşme hatası:', pairResult.error);
                    }
                }
            }
        } catch (e) {
            console.error('[ADB QR Hata]:', e.message);
        }

        await new Promise(r => setTimeout(r, 1200));
    }

    if (!session.cancelled && session.status === 'waiting_for_scan') {
        session.status = 'timeout';
        session.message = 'Eşleşme zaman aşımına uğradı. QR kodu yenileyip tekrar deneyin.';
        broadcast({ type: 'ADB_PAIR_STATUS', session });
    }
}

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// In-Browser High-FPS Screen Streamer via hardware screenrecord H.264
let screenStreamProcess = null;
let activeScreenStreamWs = null;

function stopScreenStream() {
    if (screenStreamProcess) {
        console.log('[Screen Stream]: Durduruluyor PID:', screenStreamProcess.pid);
        const pid = screenStreamProcess.pid;
        try {
            if (process.platform === 'win32') {
                exec(`taskkill /pid ${pid} /T /F`, () => {});
            } else {
                screenStreamProcess.kill();
            }
        } catch (e) {}
        screenStreamProcess = null;
        activeScreenStreamWs = null;
        broadcast({ type: 'SCREEN_STREAM_STATUS', running: false });
    }
    const targetDevice = config.selectedAdbDevice;
    if (targetDevice) {
        exec(`"${ADB_BIN}" -s ${targetDevice} shell "pkill -9 -f screenrecord || true"`, () => {});
    }
}

function startScreenStream(targetWs, deviceId) {
    const targetDevice = deviceId || config.selectedAdbDevice;
    if (!targetDevice) return;

    stopScreenStream();

    const targetArg = targetDevice ? ['-s', targetDevice] : [];
    // Ensure any stuck or lingering screenrecord on the phone is killed first
    exec(`"${ADB_BIN}" ${targetArg.join(' ')} shell "pkill -9 -f screenrecord || true"`, () => {
        activeScreenStreamWs = targetWs;
        const args = [
            ...targetArg,
            'exec-out',
            'screenrecord',
            '--output-format=h264',
            '--size', '720x1520',
            '--bit-rate', '6000000',
            '--time-limit', '180',
            '-'
        ];

        console.log('[Screen Stream H264]: Başlatılıyor:', ADB_BIN, args.join(' '));
        screenStreamProcess = spawn(ADB_BIN, args);

        // Immediately poke the display so hardware encoder emits the initial IDR keyframe without waiting
        exec(`"${ADB_BIN}" ${targetArg.join(' ')} shell "input keyevent 224; input tap 1 1"`, () => {});

        broadcast({ type: 'SCREEN_STREAM_STATUS', running: true });

        screenStreamProcess.stdout.on('data', (chunk) => {
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(chunk);
            }
        });

        screenStreamProcess.stderr.on('data', (errChunk) => {
            console.error('[Screen Stream stderr]:', errChunk.toString('utf8').trim());
        });

        screenStreamProcess.on('close', (code) => {
            console.log('[Screen Stream]: Kapandı, kod:', code);
            if (screenStreamProcess && targetWs && targetWs.readyState === WebSocket.OPEN) {
                setTimeout(() => {
                    if (targetWs && targetWs.readyState === WebSocket.OPEN && screenStreamProcess) {
                        startScreenStream(targetWs, targetDevice);
                    }
                }, 100);
            } else {
                screenStreamProcess = null;
                activeScreenStreamWs = null;
                broadcast({ type: 'SCREEN_STREAM_STATUS', running: false });
            }
        });
    });
}

wss.on('connection', async (ws) => {
    syncTransfersWithDisk();
    const devices = await getAdbDevices();
    ws.send(JSON.stringify({
        type: 'INIT',
        apks: apkList,
        transfers: transfersList,
        devices: devices,
        config: config,
        localIp: getPrimaryIp(),
        availableIps: getAllLocalIps(),
        port: PORT,
        clipboardMode: currentClipboardMode,
        isScrcpyRunning: !!activeScrcpyProcess,
        pairingSession: currentPairingSession ? {
            qrDataUrl: currentPairingSession.qrDataUrl,
            status: currentPairingSession.status,
            pairedIp: currentPairingSession.pairedIp,
            message: currentPairingSession.message
        } : null
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'START_SCREEN_STREAM') {
                startScreenStream(ws, data.deviceId);
            } else if (data.action === 'STOP_SCREEN_STREAM') {
                stopScreenStream();
            }
        } catch (e) {
            console.error('WS message error:', e);
        }
    });

    ws.on('close', () => {
        if (activeScreenStreamWs === ws) {
            stopScreenStream();
        }
    });
});

// Middleware
app.use(cors());
app.use(express.json());

// Auto-route mobile clients to mobile PWA interface
app.get('/', (req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (isMobile) {
        return res.sendFile(path.join(PUBLIC_DIR, 'mobile.html'));
    }
    next();
});

app.use(express.static(PUBLIC_DIR));

// Multer Storage for PC Drag & Drop (uploads folder)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        let safeName = path.basename(file.originalname).replace(/[/\\?%*:|"<>]/g, '_');
        if (!safeName) safeName = `upload_${Date.now()}`;
        const targetPath = path.join(UPLOADS_DIR, safeName);
        if (fs.existsSync(targetPath)) {
            const ext = path.extname(safeName);
            const nameWithoutExt = path.basename(safeName, ext);
            safeName = `${nameWithoutExt}_${Date.now()}${ext}`;
        }
        cb(null, safeName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 2000 * 1024 * 1024 } // 2GB
});

// Multer Storage for Mobile to PC Transfers (received folder)
const storageReceived = multer.diskStorage({
    destination: (req, file, cb) => cb(null, RECEIVED_DIR),
    filename: (req, file, cb) => {
        let safeName = path.basename(file.originalname).replace(/[/\\?%*:|"<>]/g, '_');
        if (!safeName) safeName = `file_${Date.now()}`;
        const targetPath = path.join(RECEIVED_DIR, safeName);
        if (fs.existsSync(targetPath)) {
            const ext = path.extname(safeName);
            const nameWithoutExt = path.basename(safeName, ext);
            safeName = `${nameWithoutExt}_${Date.now()}${ext}`;
        }
        cb(null, safeName);
    }
});
const uploadReceived = multer({
    storage: storageReceived,
    limits: { fileSize: 2000 * 1024 * 1024 } // 2GB
});

// REST Routes
app.get('/api/status', async (req, res) => {
    const devices = await getAdbDevices();
    res.json({
        localIp: getPrimaryIp(),
        availableIps: getAllLocalIps(),
        port: PORT,
        devices,
        config,
        apkCount: apkList.length,
        clipboardMode: currentClipboardMode
    });
});

app.get('/api/apks', (req, res) => {
    res.json(apkList);
});

app.get('/api/transfers', (req, res) => {
    syncTransfersWithDisk();
    res.json(transfersList);
});

// Delete Transfer and associated local file if exists
app.post('/api/transfers/delete', (req, res) => {
    const { id } = req.body;
    const target = transfersList.find(t => String(t.id) === String(id));
    if (target) {
        if (target.direction === 'mobile-to-pc') {
            const filePath = target.localPath || path.join(RECEIVED_DIR, target.filename);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {}
            }
        }
        transfersList = transfersList.filter(t => String(t.id) !== String(id));
        saveTransfers();
        broadcast({ type: 'TRANSFERS_UPDATED', transfers: transfersList });
    }
    res.json({ success: true, transfers: transfersList });
});

// PC to Phone Upload & Push
app.post('/api/upload', upload.any(), async (req, res) => {
    const file = req.files && req.files[0] ? req.files[0] : req.file;
    if (!file) {
        return res.status(400).json({ error: 'Dosya yüklenemedi' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isApk = ext === '.apk';
    let registeredApk = null;
    if (isApk) {
        registeredApk = await registerApk(file.path, 'drag-drop');
    }

    // Universal file transfer directly to /sdcard/Download
    const meta = getTargetAndroidDir(file.originalname);
    const devices = await getAdbDevices();
    const targetDevice = (req.body && req.body.deviceId) || config.selectedAdbDevice || (devices.length > 0 ? devices[0].id : null);

    const record = {
        id: Date.now(),
        filename: file.originalname,
        size: formatBytes(file.size),
        category: meta.category,
        direction: 'pc-to-phone',
        localPath: file.path,
        targetDir: meta.dir,
        remotePath: `${meta.dir}/${file.originalname}`,
        deviceId: targetDevice,
        timestamp: new Date().toLocaleTimeString(),
        status: targetDevice ? 'transferring' : 'saved'
    };

    if (targetDevice) {
        const targetArg = `-s ${targetDevice}`;
        const escapedLocal = file.path.replace(/\\/g, '/');
        const remoteDest = `${meta.dir}/${file.originalname}`;

        exec(`"${ADB_BIN}" ${targetArg} push "${escapedLocal}" "${remoteDest}"`, (pushErr) => {
            if (pushErr) {
                console.error('[Universal Transfer Error]:', pushErr.message);
                record.status = 'error';
                record.error = pushErr.message;
            } else {
                record.status = 'transferred';
                console.log(`[Universal Transfer]: ${file.originalname} -> ${remoteDest}`);
                if (meta.isMedia) {
                    exec(`"${ADB_BIN}" ${targetArg} shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://${remoteDest}"`, () => {});
                }
            }
            transfersList.unshift(record);
            if (transfersList.length > 100) transfersList.pop();
            saveTransfers();
            broadcast({ type: 'TRANSFER_COMPLETED', transfer: record, transfers: transfersList });
        });
        return res.json({ success: true, isApk, apk: registeredApk, transfer: record });
    } else {
        transfersList.unshift(record);
        if (transfersList.length > 100) transfersList.pop();
        saveTransfers();
        broadcast({ type: 'TRANSFER_SAVED', transfer: record, transfers: transfersList });
        return res.json({ success: true, isApk, apk: registeredApk, transfer: record });
    }
});

// Mobile to PC Upload (Receives files over Wi-Fi)
app.post('/api/upload/mobile-to-pc', uploadReceived.array('files', 50), async (req, res) => {
    try {
        const files = req.files || (req.file ? [req.file] : []);
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'Yüklenecek dosya seçilmedi' });
        }

        const savedRecords = [];
        for (const file of files) {
            const ext = path.extname(file.filename).toLowerCase();
            let category = 'document';
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif'].includes(ext)) category = 'image';
            else if (['.mp4', '.mkv', '.mov', '.avi', '.webm', '.3gp'].includes(ext)) category = 'video';
            else if (['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'].includes(ext)) category = 'audio';
            else if (ext === '.apk') category = 'apk';

            if (ext === '.apk') {
                registerApk(file.path, 'mobile-upload').catch(() => {});
            }

            const record = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                filename: file.filename,
                originalName: file.originalname,
                size: formatBytes(file.size),
                rawSize: file.size,
                category,
                direction: 'mobile-to-pc',
                localPath: file.path,
                timestamp: new Date().toLocaleTimeString(),
                mtime: new Date(),
                status: 'transferred'
            };

            transfersList.unshift(record);
            if (transfersList.length > 100) transfersList.pop();
            savedRecords.push(record);

            console.log(`[Mobil -> PC]: ${file.filename} (${record.size}) kaydedildi -> ${file.path}`);
        }

        saveTransfers();

        broadcast({
            type: 'FILE_RECEIVED_FROM_PHONE',
            transfers: savedRecords,
            allTransfers: transfersList,
            message: `${savedRecords.length} dosya telefondan PC'ye başarıyla aktarıldı!`
        });

        res.json({ success: true, count: savedRecords.length, files: savedRecords });
    } catch (err) {
        console.error('[Mobil -> PC Yükleme Hatası]:', err);
        res.status(500).json({ error: err.message });
    }
});

// Open Received File with default Windows application
app.post('/api/transfers/open', (req, res) => {
    const { filename, filePath } = req.body;
    let target = filePath;
    if (!target && filename) {
        target = path.join(RECEIVED_DIR, path.basename(filename));
    }
    if (!target) {
        return res.status(400).json({ error: 'Dosya belirtilmedi' });
    }

    const resolved = path.resolve(target);
    const resolvedRec = path.resolve(RECEIVED_DIR);
    const resolvedUp = path.resolve(UPLOADS_DIR);
    const isAllowed = resolved.startsWith(resolvedRec + path.sep) || resolved.startsWith(resolvedUp + path.sep);

    if (!isAllowed || !fs.existsSync(resolved)) {
        return res.status(403).json({ error: 'Erişim reddedildi veya dosya bulunamadı' });
    }

    const proc = spawn('cmd.exe', ['/c', 'start', '""', resolved], { windowsHide: true });
    proc.on('error', (err) => res.status(500).json({ error: err.message }));
    res.json({ success: true });
});

// Show Received File in Windows Explorer
app.post('/api/transfers/open-folder', (req, res) => {
    const { filename, filePath } = req.body;
    let target = filePath;
    if (!target && filename) {
        target = path.join(RECEIVED_DIR, path.basename(filename));
    }

    if (target) {
        const resolved = path.resolve(target);
        const resolvedRec = path.resolve(RECEIVED_DIR);
        const resolvedUp = path.resolve(UPLOADS_DIR);
        if ((resolved.startsWith(resolvedRec + path.sep) || resolved.startsWith(resolvedUp + path.sep)) && fs.existsSync(resolved)) {
            spawn('explorer.exe', [`/select,${resolved}`], { windowsHide: true });
            return res.json({ success: true });
        }
    }
    spawn('explorer.exe', [path.resolve(RECEIVED_DIR)], { windowsHide: true });
    return res.json({ success: true });
});

// Pull Latest Screenshot from Connected Android Device via ADB
app.post('/api/adb/pull-latest-screenshot', async (req, res) => {
    const { deviceId } = req.body;
    const targetDevice = deviceId || config.selectedAdbDevice;
    if (!targetDevice) {
        return res.status(400).json({ error: 'Bağlı cihaz bulunamadı' });
    }

    const targetArg = `-s ${targetDevice}`;
    const checkCmd = `"${ADB_BIN}" ${targetArg} shell "ls -t /sdcard/DCIM/Screenshots/ 2>/dev/null | head -n 1; ls -t /sdcard/Pictures/Screenshots/ 2>/dev/null | head -n 1"`;

    exec(checkCmd, async (err, stdout) => {
        let lines = (stdout || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let phonePath = '';
        let screenshotName = '';

        if (lines.length > 0 && lines[0]) {
            screenshotName = lines[0];
            const dcimTest = `"${ADB_BIN}" ${targetArg} shell "ls '/sdcard/DCIM/Screenshots/${screenshotName}' 2>/dev/null"`;
            const hasDcim = await new Promise(resolve => {
                exec(dcimTest, (e, out) => resolve(out && out.includes(screenshotName)));
            });
            phonePath = hasDcim ? `/sdcard/DCIM/Screenshots/${screenshotName}` : `/sdcard/Pictures/Screenshots/${screenshotName}`;
        }

        if (!phonePath || !screenshotName) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            screenshotName = `Screenshot_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
            phonePath = `/sdcard/Pictures/Screenshots/${screenshotName}`;
            await new Promise(r => exec(`"${ADB_BIN}" ${targetArg} shell "screencap -p '${phonePath}'"`, () => r()));
        }

        const localFileName = `Phone_${Date.now()}_${screenshotName.replace(/[/\\?%*:|"<>]/g, '_')}`;
        const localDest = path.join(RECEIVED_DIR, localFileName);

        exec(`"${ADB_BIN}" ${targetArg} pull "${phonePath}" "${localDest}"`, (pullErr) => {
            if (pullErr || !fs.existsSync(localDest)) {
                return res.status(500).json({ error: pullErr ? pullErr.message : 'Ekran görüntüsü çekilemedi' });
            }

            const stats = fs.statSync(localDest);
            const record = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                filename: localFileName,
                originalName: screenshotName,
                size: formatBytes(stats.size),
                rawSize: stats.size,
                category: 'image',
                direction: 'mobile-to-pc',
                localPath: localDest,
                timestamp: new Date().toLocaleTimeString(),
                status: 'transferred'
            };

            transfersList.unshift(record);
            if (transfersList.length > 60) transfersList.pop();

            broadcast({
                type: 'FILE_RECEIVED_FROM_PHONE',
                transfers: [record],
                allTransfers: transfersList,
                message: `Telefondan ekran görüntüsü çekildi: ${screenshotName}`
            });

            res.json({ success: true, transfer: record });
        });
    });
});

app.post('/api/config', (req, res) => {
    const { watchFolder, autoInstallOnAdb, autoLaunchAfterInstall, selectedAdbDevice, selectedIp, language } = req.body;
    if (watchFolder && watchFolder !== config.watchFolder) {
        if (fs.existsSync(watchFolder)) {
            config.watchFolder = watchFolder;
            setupWatcher(watchFolder);
        } else {
            return res.status(400).json({ error: 'Belirtilen klasör mevcut değil' });
        }
    }
    if (autoInstallOnAdb !== undefined) config.autoInstallOnAdb = !!autoInstallOnAdb;
    if (autoLaunchAfterInstall !== undefined) config.autoLaunchAfterInstall = !!autoLaunchAfterInstall;
    if (selectedAdbDevice !== undefined) config.selectedAdbDevice = selectedAdbDevice;
    if (selectedIp !== undefined) config.selectedIp = selectedIp;
    if (language) config.language = language;
    saveConfig();
    
    // Broadcast updated QR when config or selected IP changes
    const primaryIp = getPrimaryIp();
    const qrUrl = `http://${primaryIp}:${PORT}/mobile`;
    QRCode.toDataURL(qrUrl, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(qrDataUrl => {
            broadcast({ type: 'MOBILE_QR_UPDATED', url: qrUrl, qrDataUrl, ip: primaryIp, availableIps: getAllLocalIps() });
        }).catch(() => {});

    broadcast({ type: 'CONFIG_UPDATED', config });
    res.json({ success: true, config, primaryIp });
});

// Launch Mobile Web transfer interface directly on phone via ADB
app.post('/api/adb/open-mobile-web', (req, res) => {
    const { deviceId } = req.body;
    const target = deviceId || config.selectedAdbDevice || lastDetectedConnectedIp;
    if (!target) {
        return res.status(400).json({ error: 'Bağlı cihaz bulunamadı' });
    }
    exec(`"${ADB_BIN}" -s ${target} reverse tcp:${PORT} tcp:${PORT}`, () => {
        exec(`"${ADB_BIN}" -s ${target} shell am start -a android.intent.action.VIEW -d "http://localhost:${PORT}/mobile"`, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Mobil arayüz telefonda açıldı' });
        });
    });
});

app.get('/api/adb/devices', async (req, res) => {
    const devices = await getAdbDevices();
    res.json(devices);
});

// Start/Get ADB Pairing QR Code
app.get('/api/adb/pairing-qr', async (req, res) => {
    try {
        const session = await startAdbQrPairing();
        res.json({
            success: true,
            qrDataUrl: session.qrDataUrl,
            status: session.status,
            pairedIp: session.pairedIp,
            message: session.message
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/adb/pairing-status', (req, res) => {
    if (!currentPairingSession) {
        return res.json({ active: false });
    }
    res.json({
        active: true,
        status: currentPairingSession.status,
        pairedIp: currentPairingSession.pairedIp,
        message: currentPairingSession.message
    });
});

app.post('/api/adb/tcpip', (req, res) => {
    const targetPort = req.body.port || 5555;
    exec(`"${ADB_BIN}" tcpip ${targetPort}`, (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr || err.message });
        res.json({ success: true, message: `Cihaz ${targetPort} portunda kablosuz moda alındı! Kabloyu çıkarabilirsiniz.` });
    });
});

app.post('/api/adb/connect', async (req, res) => {
    const { ip, port } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP adresi gerekli' });
    try {
        const result = await adbConnect(ip, port || 5555);
        await new Promise(r => setTimeout(r, 500));
        const devices = await getAdbDevices();
        const connected = devices.find(d => d.id.includes(ip));
        if (connected) {
            config.selectedAdbDevice = connected.id;
            saveConfig();
        }
        broadcast({ type: 'DEVICES_UPDATED', devices });
        res.json({ success: true, result, devices });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Disconnect / Remove Device
app.post('/api/adb/disconnect', async (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId || !/^[a-zA-Z0-9.:_-]+$/.test(deviceId)) {
        return res.status(400).json({ error: 'Geçersiz cihaz ID' });
    }
    const proc = spawn(ADB_BIN, ['disconnect', deviceId]);
    proc.on('close', async () => {
        const devices = await getAdbDevices();
        if (config.selectedAdbDevice === deviceId) {
            config.selectedAdbDevice = devices.length > 0 ? devices[0].id : '';
            saveConfig();
        }
        if (activeClipboardDevice === deviceId) {
            setClipboardMode('off');
        }
        broadcast({ type: 'DEVICES_UPDATED', devices });
        res.json({ success: true, message: `${deviceId} bağlantısı sonlandırıldı`, devices });
    });
});

app.post('/api/adb/pair', async (req, res) => {
    const { ip, port, code } = req.body;
    if (!ip || !port || !code) return res.status(400).json({ error: 'IP, Port ve Eşleşme kodu gereklidir' });
    try {
        const result = await adbPair(ip, port, code);
        res.json({ success: true, result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/adb/install', async (req, res) => {
    const { deviceId, apkId } = req.body;
    const targetApk = apkList.find(a => a.id === apkId);
    if (!targetApk) return res.status(404).json({ error: 'APK bulunamadı' });

    installApkViaAdb(deviceId, targetApk.filePath, targetApk);
    res.json({ success: true, message: 'Yükleme başlatıldı' });
});

app.post('/api/adb/launch', async (req, res) => {
    const { deviceId, packageName } = req.body;
    if (!packageName || !/^[a-zA-Z0-9._-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Geçersiz paket adı' });
    }
    const result = await launchAppViaAdb(deviceId, packageName);
    res.json(result);
});

app.post('/api/adb/stop', (req, res) => {
    const { deviceId, packageName } = req.body;
    if (!packageName || !/^[a-zA-Z0-9._-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Geçersiz paket adı' });
    }
    const args = [];
    if (deviceId && /^[a-zA-Z0-9.:_-]+$/.test(deviceId)) {
        args.push('-s', deviceId);
    }
    args.push('shell', 'am', 'force-stop', packageName);
    const proc = spawn(ADB_BIN, args);
    let stdout = '';
    proc.stdout.on('data', d => { stdout += d.toString('utf8'); });
    proc.on('close', code => res.json({ success: code === 0, output: stdout }));
});

app.post('/api/adb/uninstall', (req, res) => {
    const { deviceId, packageName } = req.body;
    if (!packageName || !/^[a-zA-Z0-9._-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Geçersiz paket adı' });
    }
    const args = [];
    if (deviceId && /^[a-zA-Z0-9.:_-]+$/.test(deviceId)) {
        args.push('-s', deviceId);
    }
    args.push('uninstall', packageName);
    const proc = spawn(ADB_BIN, args);
    let stdout = '';
    proc.stdout.on('data', d => { stdout += d.toString('utf8'); });
    proc.on('close', code => res.json({ success: code === 0, output: stdout }));
});

// Remote Key Events (Back=4, Home=3, AppSwitch=187, Power=26)
const handleRemoteKey = (req, res) => {
    const { deviceId, code, keyCode } = req.body;
    const key = keyCode || code;
    if (!key || !/^\d+$/.test(String(key))) {
        return res.status(400).json({ error: 'Geçersiz keycode' });
    }
    const args = [];
    const target = deviceId || config.selectedAdbDevice;
    if (target && /^[a-zA-Z0-9.:_-]+$/.test(target)) {
        args.push('-s', target);
    }
    args.push('shell', 'input', 'keyevent', String(key));
    const proc = spawn(ADB_BIN, args);
    proc.on('close', code => res.json({ success: code === 0 }));
};
app.post('/api/adb/key', handleRemoteKey);
app.post('/api/adb/keyevent', handleRemoteKey);

// Interactive Touch & Swipe Events from HTML Canvas/Video
app.post('/api/adb/touch', (req, res) => {
    const { deviceId, type, x, y, x2, y2 } = req.body;
    const target = deviceId || config.selectedAdbDevice;
    const args = [];
    if (target && /^[a-zA-Z0-9.:_-]+$/.test(target)) {
        args.push('-s', target);
    }

    if (type === 'tap') {
        const numX = Math.round(Number(x));
        const numY = Math.round(Number(y));
        if (isNaN(numX) || isNaN(numY)) return res.status(400).json({ error: 'Geçersiz koordinat' });
        args.push('shell', 'input', 'tap', String(numX), String(numY));
    } else if (type === 'swipe') {
        const numX = Math.round(Number(x));
        const numY = Math.round(Number(y));
        const numX2 = Math.round(Number(x2));
        const numY2 = Math.round(Number(y2));
        if (isNaN(numX) || isNaN(numY) || isNaN(numX2) || isNaN(numY2)) return res.status(400).json({ error: 'Geçersiz koordinat' });
        args.push('shell', 'input', 'swipe', String(numX), String(numY), String(numX2), String(numY2), '150');
    } else {
        return res.json({ success: false });
    }

    const proc = spawn(ADB_BIN, args);
    proc.on('close', code => res.json({ success: code === 0 }));
});

// Get Device Display Resolution
app.get('/api/adb/display-size', (req, res) => {
    const { deviceId } = req.query;
    const target = deviceId || config.selectedAdbDevice;
    const targetArg = target ? `-s ${target}` : '';
    exec(`"${ADB_BIN}" ${targetArg} shell wm size`, (err, stdout) => {
        const match = stdout && stdout.match(/Physical size:\s*(\d+)x(\d+)/);
        if (match) {
            res.json({ width: parseInt(match[1]), height: parseInt(match[2]) });
        } else {
            res.json({ width: 1080, height: 2400 });
        }
    });
});

app.get('/api/adb/screenshot', (req, res) => {
    const { deviceId } = req.query;
    const targetArg = deviceId ? ['-s', deviceId] : [];
    const proc = spawn(ADB_BIN, [...targetArg, 'exec-out', 'screencap', '-p']);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    proc.stdout.pipe(res);
    proc.stderr.on('data', () => {});
});

// Scrcpy 60 FPS Hardware-Accelerated Mirroring
const SCRCPY_DIR = path.join(BASE_DIR, 'tools', 'scrcpy');
const SCRCPY_BIN = path.join(SCRCPY_DIR, 'scrcpy.exe');
let activeScrcpyProcess = null;

function stopScrcpy() {
    try {
        if (process.platform === 'win32') {
            exec('taskkill /im scrcpy.exe /F', () => {});
        } else if (activeScrcpyProcess) {
            activeScrcpyProcess.kill();
        }
    } catch (e) {}
    activeScrcpyProcess = null;
    broadcast({ type: 'SCRCPY_STATUS', running: false });
}

app.post('/api/adb/scrcpy/start', (req, res) => {
    const { deviceId } = req.body;
    const targetDevice = deviceId || config.selectedAdbDevice;
    if (!targetDevice) {
        return res.status(400).json({ error: 'Bağlı cihaz bulunamadı. Önce Kablosuz ADB sekmesinden cihazınızı bağlayın.' });
    }

    if (!fs.existsSync(SCRCPY_BIN)) {
        return res.status(500).json({ error: 'Scrcpy bulunamadı: ' + SCRCPY_BIN });
    }

    const batPath = path.join(BASE_DIR, 'start-screen.bat');
    console.log('[Scrcpy]: Windows Shell ile Başlatılıyor:', batPath);
    exec(`start "" "${batPath}"`, (err) => {
        if (err) {
            console.error('[Scrcpy Başlatma Hatası]:', err.message);
            broadcast({ type: 'SCRCPY_STATUS', running: false });
        }
    });

    broadcast({ type: 'SCRCPY_STATUS', running: true });
    res.json({ success: true, message: '60 FPS ultra akıcı canlı ekran penceresi açıldı!' });
});

app.post('/api/adb/scrcpy/stop', (req, res) => {
    stopScrcpy();
    res.json({ success: true, message: 'Canlı ekran kapatıldı.' });
});

app.get('/api/adb/scrcpy/status', (req, res) => {
    res.json({ running: !!activeScrcpyProcess });
});

// Battery Info API
app.get('/api/adb/battery', async (req, res) => {
    const deviceId = req.query.deviceId || config.selectedAdbDevice;
    if (!deviceId) return res.json({ success: false, battery: null });
    const battery = await getAdbBattery(deviceId);
    res.json({ success: true, battery });
});

// --- 3-Way Clipboard Synchronization Engine (PC -> Mobil / Mobil -> PC / Kapalı) ---
let currentClipboardMode = 'off'; // 'off' | 'pc-to-phone' | 'phone-to-pc'
let activeClipboardProcess = null; // scrcpy headless (phone-to-pc)
let activeClipWatchProcess = null; // clipwatch.exe (pc-to-phone)
let activeClipboardDevice = null;
let lastSentClipboardB64 = '';

const CLIP_JAR_PATH = path.join(BASE_DIR, 'tools', 'clip.jar');
const CLIPWATCH_BIN = path.join(BASE_DIR, 'tools', 'clipwatch.exe');

function ensureClipJar(deviceId) {
    return new Promise((resolve) => {
        if (!fs.existsSync(CLIP_JAR_PATH)) {
            console.warn('[Clipboard]: tools/clip.jar bulunamadı');
            return resolve(false);
        }
        exec(`"${ADB_BIN}" -s ${deviceId} push "${CLIP_JAR_PATH}" /data/local/tmp/clip.jar`, (err) => {
            if (err) {
                console.error('[Clipboard]: clip.jar push hatası:', err.message);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

function stopAllClipboardProcesses() {
    if (activeClipWatchProcess) {
        try {
            if (process.platform === 'win32') {
                exec(`taskkill /pid ${activeClipWatchProcess.pid} /T /F`, () => {});
            } else {
                activeClipWatchProcess.kill();
            }
        } catch (e) {}
        activeClipWatchProcess = null;
    }

    if (activeClipboardProcess) {
        try {
            if (process.platform === 'win32') {
                exec(`taskkill /pid ${activeClipboardProcess.pid} /T /F`, () => {});
            } else {
                activeClipboardProcess.kill();
            }
        } catch (e) {}
        activeClipboardProcess = null;
    }
}

async function setClipboardMode(mode, deviceId) {
    stopAllClipboardProcesses();

    const target = deviceId || config.selectedAdbDevice;

    if (mode === 'off' || !mode) {
        currentClipboardMode = 'off';
        activeClipboardDevice = null;
        broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'off' });
        return { success: true, mode: 'off' };
    }

    if (!target) {
        currentClipboardMode = 'off';
        broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'off' });
        return { success: false, error: 'Bağlı cihaz bulunamadı' };
    }

    activeClipboardDevice = target;

    if (mode === 'pc-to-phone') {
        if (!fs.existsSync(CLIPWATCH_BIN)) {
            return { success: false, error: 'tools/clipwatch.exe bulunamadı' };
        }

        const jarReady = await ensureClipJar(target);
        if (!jarReady) {
            return { success: false, error: 'clip.jar cihaza yüklenemedi' };
        }

        try {
            console.log(`[Clipboard PC -> Mobil]: Başlatılıyor -> ${target}`);
            lastSentClipboardB64 = '';

            activeClipWatchProcess = spawn(CLIPWATCH_BIN, [], {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'ignore']
            });

            activeClipWatchProcess.stdout.on('data', (chunk) => {
                const text = chunk.toString('utf8');
                const lines = text.split(/\r?\n/);
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('CLIP:')) {
                        const b64 = trimmed.substring(5).trim();
                        if (b64 && b64 !== lastSentClipboardB64 && activeClipboardDevice) {
                            lastSentClipboardB64 = b64;
                            console.log(`[Clipboard PC -> Mobil]: Yeni pano aktarılıyor...`);
                            exec(`"${ADB_BIN}" -s ${activeClipboardDevice} shell "CLASSPATH=/data/local/tmp/clip.jar app_process / com.brq.Clip set-b64 '${b64}'"`, (err) => {
                                if (err) console.error('[Clipboard Set Error]:', err.message);
                            });
                        }
                    }
                }
            });

            activeClipWatchProcess.on('exit', (code) => {
                console.log(`[ClipWatch]: Sonlandı (kod: ${code})`);
                activeClipWatchProcess = null;
                if (currentClipboardMode === 'pc-to-phone') {
                    currentClipboardMode = 'off';
                    broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'off' });
                }
            });

            currentClipboardMode = 'pc-to-phone';
            broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'pc-to-phone', deviceId: target });
            return { success: true, mode: 'pc-to-phone', deviceId: target };
        } catch (err) {
            console.error('[ClipWatch Başlatma Hatası]:', err.message);
            currentClipboardMode = 'off';
            return { success: false, error: err.message };
        }
    }

    if (mode === 'phone-to-pc') {
        if (!fs.existsSync(SCRCPY_BIN)) {
            return { success: false, error: 'Scrcpy bulunamadı: ' + SCRCPY_BIN };
        }

        try {
            console.log(`[Clipboard Mobil -> PC]: Başlatılıyor -> ${target}`);
            activeClipboardProcess = spawn(SCRCPY_BIN, [
                '-s', target,
                '--no-video',
                '--no-audio',
                '--no-window'
            ], {
                windowsHide: true,
                stdio: ['ignore', 'ignore', 'pipe']
            });

            activeClipboardProcess.stderr.on('data', (data) => {
                const msg = data.toString();
                if (msg.includes('ERROR') || msg.includes('Aborted')) {
                    console.warn('[Clipboard Sync]:', msg.trim());
                }
            });

            activeClipboardProcess.on('exit', (code) => {
                console.log(`[Clipboard Mobil -> PC]: Durdu (kod: ${code})`);
                activeClipboardProcess = null;
                if (currentClipboardMode === 'phone-to-pc') {
                    currentClipboardMode = 'off';
                    broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'off' });
                }
            });

            currentClipboardMode = 'phone-to-pc';
            broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'phone-to-pc', deviceId: target });
            return { success: true, mode: 'phone-to-pc', deviceId: target };
        } catch (err) {
            console.error('[Clipboard Mobil -> PC Hatası]:', err.message);
            currentClipboardMode = 'off';
            return { success: false, error: err.message };
        }
    }

    return { success: false, error: 'Bilinmeyen pano modu' };
}

// Clipboard REST Endpoints
app.post('/api/clipboard/mode', async (req, res) => {
    const { mode, deviceId } = req.body;
    const result = await setClipboardMode(mode, deviceId);
    res.json(result);
});

app.get('/api/clipboard/status', (req, res) => {
    res.json({
        mode: currentClipboardMode,
        deviceId: activeClipboardDevice,
        active: currentClipboardMode !== 'off'
    });
});

// Backward compatibility routes
app.post('/api/clipboard/sync/start', async (req, res) => {
    const { deviceId } = req.body;
    const result = await setClipboardMode('phone-to-pc', deviceId);
    res.json({ ...result, active: result.success });
});

app.post('/api/clipboard/sync/stop', async (req, res) => {
    const result = await setClipboardMode('off');
    res.json({ success: true, active: false });
});

app.get('/api/clipboard/sync/status', (req, res) => {
    res.json({
        mode: currentClipboardMode,
        deviceId: activeClipboardDevice,
        active: currentClipboardMode !== 'off'
    });
});

app.post('/api/clipboard/send-text', async (req, res) => {
    const { text, deviceId } = req.body;
    const target = deviceId || config.selectedAdbDevice;
    if (!target || !/^[a-zA-Z0-9.:_-]+$/.test(target)) {
        return res.status(400).json({ error: 'Bağlı cihaz bulunamadı veya geçersiz' });
    }
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Metin gerekli' });
    }

    await ensureClipJar(target);
    const b64 = Buffer.from(text, 'utf8').toString('base64');
    if (!/^[A-Za-z0-9+/=]+$/.test(b64)) {
        return res.status(400).json({ error: 'Geçersiz veri' });
    }

    const proc = spawn(ADB_BIN, [
        '-s', target,
        'shell',
        `CLASSPATH=/data/local/tmp/clip.jar app_process / com.brq.Clip set-b64 ${b64}`
    ]);
    proc.on('close', code => {
        if (code !== 0) return res.status(500).json({ error: 'Pano aktarılamadı' });
        res.json({ success: true });
    });
});

// Unity Editor PostProcessBuild notification endpoint
app.post('/api/unity-build-done', async (req, res) => {
    const { apkPath } = req.body;
    if (!apkPath || typeof apkPath !== 'string') {
        return res.status(400).json({ error: 'apkPath gereklidir' });
    }
    const resolvedPath = path.resolve(apkPath);
    if (!resolvedPath.toLowerCase().endsWith('.apk') || !fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'APK dosyası bulunamadı' });
    }
    const apkItem = await registerApk(resolvedPath, 'unity-editor');
    if (apkItem) {
        res.json({ success: true, apk: apkItem });
    } else {
        res.status(500).json({ error: 'APK işlenemedi' });
    }
});

app.get('/download/:id', (req, res) => {
    const apk = apkList.find(a => a.id === req.params.id);
    if (!apk || !fs.existsSync(apk.filePath)) {
        return res.status(404).send('APK dosyası bulunamadı');
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(apk.name)}"`);
    const stream = fs.createReadStream(apk.filePath);
    stream.pipe(res);
});

app.get('/download-companion', (req, res) => {
    const companionPath = path.join(PUBLIC_DIR, 'UnityCompanion.apk');
    if (!fs.existsSync(companionPath)) {
        return res.status(404).send('Companion APK bulunamadı');
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="ApkDropCompanion.apk"');
    const stream = fs.createReadStream(companionPath);
    stream.pipe(res);
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'mobile.html'));
});

app.get('/api/qr', async (req, res) => {
    try {
        const ip = req.query.ip || getPrimaryIp();
        const url = `http://${ip}:${PORT}/mobile`;
        const qrDataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });
        res.json({ url, qrDataUrl, ip, availableIps: getAllLocalIps() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Periodic ADB Device & Battery Monitor (every 4 seconds)
let lastDevicesSnapshotJson = '';
setInterval(async () => {
    try {
        const devices = await getAdbDevices();
        const currentSnapshot = JSON.stringify(devices.map(d => ({
            id: d.id,
            state: d.state,
            battery: d.battery ? d.battery.level : null
        })));

        if (currentSnapshot !== lastDevicesSnapshotJson) {
            lastDevicesSnapshotJson = currentSnapshot;
            broadcast({ type: 'DEVICES_UPDATED', devices });

            const primaryIp = getPrimaryIp();
            const qrUrl = `http://${primaryIp}:${PORT}/mobile`;
            const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                width: 320,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            broadcast({ type: 'MOBILE_QR_UPDATED', url: qrUrl, qrDataUrl, ip: primaryIp, availableIps: getAllLocalIps() });
        }
    } catch (e) {}
}, 4000);

// Start Server
server.listen(PORT, '0.0.0.0', () => {
    const ip = getPrimaryIp();
    console.log('==================================================');
    console.log(`🚀 ApkDrop Hub & Wireless ADB V3`);
    console.log(`💻 PC Yönetim Paneli : http://localhost:${PORT}`);
    console.log(`📂 İzlenen Klasör   : ${config.watchFolder}`);
    console.log('==================================================');

    setupWatcher(config.watchFolder);
    scanFolder(config.watchFolder, 'folder-watcher');
    scanFolder(UPLOADS_DIR, 'upload');
    syncTransfersWithDisk();
});

// Graceful Cleanup
process.on('SIGINT', () => {
    stopAllClipboardProcesses();
    process.exit(0);
});
process.on('SIGTERM', () => {
    stopAllClipboardProcesses();
    process.exit(0);
});
process.on('exit', () => {
    stopAllClipboardProcesses();
});