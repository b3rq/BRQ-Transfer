const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile } = require('child_process');
const WebSocket = require('ws');
const multer = require('multer');
const QRCode = require('qrcode');
const chokidar = require('chokidar');
const net = require('net');
const dgram = require('dgram');
const crypto = require('crypto');
const { StringDecoder } = require('string_decoder');
const { TextDecoder } = require('util');
const { AsyncLocalStorage } = require('async_hooks');
const requestContext = new AsyncLocalStorage();

const PORT = Number(process.env.PORT || 4500);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT 1–65535 arasında olmalıdır.');
let shuttingDown = false;
let serverReady = false;
const app = express();
// Express 4 does not forward rejected async handlers to error middleware.
for (const method of ['get', 'post']) {
    const register = app[method].bind(app);
    app[method] = (route, ...handlers) => register(route, ...handlers.map(handler =>
        (req, res, next) => {
            const fail = error => {
                if (route === '/api/upload' && uploadRequests.get(req.body?.requestId)?.pending) uploadRequests.delete(req.body.requestId);
                cleanupUploadParts(req);
                return sendApiError(res, error);
            };
            try { return Promise.resolve(handler(req, res, next)).catch(fail); }
            catch (error) { return fail(error); }
        }));
}
const server = http.createServer(app);
// Large uploads may run for hours; close idle connections instead of timing the whole request.
server.requestTimeout = 0;
server.timeout = 5 * 60 * 1000;
const wss = new WebSocket.Server({ server, maxPayload: 64 * 1024, perMessageDeflate: false, verifyClient: ({ req }, done) =>
    done(isAdminRequest(req) || (sameOriginRequest(req) && hasSession(req, 'brq_mobile', mobileSession)), 403) });
const adminSession = crypto.randomBytes(32).toString('hex');
let dashboardBootstrap = crypto.randomBytes(32).toString('hex');
const mobileSession = crypto.randomBytes(32).toString('hex');
const unitySession = crypto.randomBytes(32).toString('hex');

function hasSession(req, name, value) {
    return (req.headers.cookie || '').split(';').some(part => part.trim() === `${name}=${value}`);
}
function sameOriginRequest(req) {
    const origin = req.headers.origin;
    return !origin || origin === `http://${req.headers.host}`;
}
function isLocalDashboardHost(req) {
    const address = req.socket.remoteAddress;
    return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address) &&
        [`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`].includes(req.headers.host) && sameOriginRequest(req);
}
function isAdminRequest(req) {
    return isLocalDashboardHost(req) && hasSession(req, 'brq_admin', adminSession);
}

function sendApiError(res, error) {
    if (res.headersSent || res.destroyed) return;
    const code = error.code || (error.status ? 'REQUEST_FAILED' : 'INTERNAL_ERROR');
    const messages = {
        ENOSPC: 'Diskte yeterli boş alan yok. Alan açıp tekrar deneyin.',
        LIMIT_FILE_SIZE: 'Dosya 2000 MiB sınırını aşıyor.',
        LIMIT_UNEXPECTED_FILE: 'Dosya alanı veya dosya sayısı geçersiz.',
        LIMIT_FILE_COUNT: 'Bir gönderimde en fazla 50 dosya seçin.',
        EACCES: 'Dosyaya erişilemiyor. Klasör okuma/yazma izinlerini kontrol edin.',
        EPERM: 'Dosya işlemi engellendi. Dosyanın başka uygulamada açık olmadığını ve izinleri kontrol edin.',
        ENOENT: 'Dosya veya klasör bulunamadı. Listeyi yenileyip tekrar deneyin.',
        EIO: 'Disk işlemi tamamlanamadı. Disk bağlantısını ve boş alanı kontrol edin.',
        INTERNAL_ERROR: 'İşlem tamamlanamadı. Tekrar deneyin.'
    };
    const status = error.status || (['EACCES', 'EPERM'].includes(code) ? 403 : code === 'ENOENT' ? 404 : ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT'].includes(code) ? 413 : code.startsWith('LIMIT_') ? 400 : 500);
    return res.status(status).json({ success: false, error: { code: code === 'ENOSPC' ? 'DISK_FULL' : ['EACCES', 'EPERM'].includes(code) ? 'FILE_ACCESS_DENIED' : code,
        message: messages[code] || (/^E[A-Z]+$/.test(code) ? messages.INTERNAL_ERROR : error.message), action: 'Bağlantıyı ve ayarları kontrol edip tekrar deneyin.',
        retryable: status >= 500 }, operationId: error.operationId || crypto.randomUUID() });
}

// Directories
const BASE_DIR = __dirname;
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const WATCH_DIR = path.join(BASE_DIR, 'watch');
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const RECEIVED_DIR = path.join(BASE_DIR, 'received');
const CONFIG_FILE = path.join(BASE_DIR, 'config.json');
const DASHBOARD_SESSION_FILE = path.join(BASE_DIR, '.dashboard-session.json');
function getDashboardUrl() { return `http://localhost:${PORT}/?session=${dashboardBootstrap}`; }
function writeDashboardSession() {
    const tempPath = `${DASHBOARD_SESSION_FILE}.${crypto.randomUUID()}.tmp`;
    try {
        fs.writeFileSync(tempPath, JSON.stringify({ port: PORT, token: dashboardBootstrap, HookToken: unitySession }), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        fs.renameSync(tempPath, DASHBOARD_SESSION_FILE);
    } finally {
        if (fs.existsSync(tempPath)) { try { fs.unlinkSync(tempPath); } catch (_) {} }
    }
}

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
    knownWirelessDevices: [],
    forgottenWirelessDevices: [],
    selectedIp: '',
    language: 'tr'
};

let configReadFailed = false;
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const rawConfig = fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '');
        const parsed = JSON.parse(rawConfig);
        config = { ...config, ...validateConfig(parsed, false) };
    } catch (e) {
        configReadFailed = true;
        console.error('Config okunamadı; mevcut dosya korunuyor.');
        try { config = { ...config, ...validateConfig(JSON.parse(fs.readFileSync(CONFIG_FILE + '.bak', 'utf8').replace(/^\uFEFF/, ''))) }; } catch (_) {}
    }
}

function validateConfig(value, strict = true) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('Geçersiz ayarlar. Alanları kontrol edin.'), { code: 'INVALID_CONFIG', status: 400 });
    const result = {};
    for (const [key, item] of Object.entries(value)) {
        let valid = false;
        if (key === 'watchFolder') valid = typeof item === 'string' && item.trim().length > 0 && item.length <= 4096 && !item.includes('\0');
        else if (['selectedAdbDevice', 'selectedIp'].includes(key)) valid = typeof item === 'string' && item.length <= 255;
        else if (['autoInstallOnAdb', 'autoLaunchAfterInstall'].includes(key)) valid = typeof item === 'boolean';
        else if (key === 'language') valid = ['tr', 'en'].includes(item);
        else if (['knownWirelessDevices', 'forgottenWirelessDevices'].includes(key)) valid = Array.isArray(item) && item.every(d =>
            d && typeof d === 'object' && typeof d.serviceName === 'string' &&
            ['serial', 'deviceId', 'ip', 'model', 'deviceName', 'phoneId'].every(field => d[field] === undefined || typeof d[field] === 'string') &&
            (d.autoReconnect === undefined || typeof d.autoReconnect === 'boolean') &&
            (d.aliases === undefined || (Array.isArray(d.aliases) && d.aliases.every(alias => typeof alias === 'string'))));
        else if (key === 'schemaVersion' || key === 'revision') valid = Number.isSafeInteger(item) && item >= 0 && (key !== 'schemaVersion' || item <= 1);
        else continue;
        if (valid) result[key] = item;
        else if (strict) throw Object.assign(new Error('Geçersiz ayar: ' + key + '. Değeri kontrol edin.'), { code: 'INVALID_CONFIG', status: 400 });
        else configReadFailed = true;
    }
    return result;
}

function atomicWriteJson(filename, value) {
    const temporary = filename + '.' + crypto.randomUUID() + '.tmp';
    try {
        fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' });
        if (fs.existsSync(filename)) fs.copyFileSync(filename, filename + '.bak');
        fs.renameSync(temporary, filename);
    } catch (e) {
        try { fs.unlinkSync(temporary); } catch (_) {}
        throw Object.assign(new Error('Değişiklik diske kaydedilemedi. Yazma iznini ve boş alanı kontrol edin.'), { code: 'PERSISTENCE_FAILED', status: 500 });
    }
}

let confirmedConfig = JSON.parse(JSON.stringify(config));
function saveConfig() {
    try {
        if (configReadFailed) throw Object.assign(new Error('Ayar dosyası okunamadı. Mevcut dosyayı kurtarın ve yeniden başlatın.'), { code: 'PERSISTENCE_FAILED' });
        config.revision = (confirmedConfig.revision || 0) + 1;
        atomicWriteJson(CONFIG_FILE, config);
        confirmedConfig = JSON.parse(JSON.stringify(config));
    } catch (error) {
        config = JSON.parse(JSON.stringify(confirmedConfig));
        throw error;
    }
}

function migratePhoneRegistry() {
    if (config.schemaVersion === 1) return;
    const entries = [];
    for (const record of config.knownWirelessDevices) {
        const serial = normalizePhoneSerial(record.serial);
        const previous = serial && entries.find(item => item.serial === serial);
        const aliases = [...new Set([record.serviceName, ...(record.aliases || [])])];
        if (previous) {
            previous.aliases = [...new Set([...previous.aliases, ...aliases])];
            if (record.autoReconnect === false) previous.autoReconnect = false;
            if (config.selectedAdbDevice === record.deviceId) config.selectedAdbDevice = previous.deviceId || record.deviceId;
        } else entries.push({ ...record, serial, aliases, identityConfirmed: !!serial,
            phoneId: record.phoneId || (serial ? 'phone-' + crypto.createHash('sha256').update(serial).digest('hex').slice(0, 24) : crypto.randomUUID()) });
    }
    config.knownWirelessDevices = entries;
    config.schemaVersion = 1;
    saveConfig();
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
let transfersReadFailed = false;

function saveTransfers() {
    if (transfersReadFailed) throw Object.assign(new Error('Transfer geçmişi okunamadı. Mevcut dosyayı kurtarıp yeniden başlatın.'), { code: 'PERSISTENCE_FAILED' });
    const previous = transfersList;
    let completed = 0;
    transfersList = transfersList.filter(item => ['queued', 'transferring'].includes(item.status) || completed++ < 100);
    try { atomicWriteJson(TRANSFERS_FILE, transfersList); } catch (error) { transfersList = previous; throw error; }
}

function requireTransferCapacity() {
    if (transfersList.filter(item => ['queued', 'transferring'].includes(item.status)).length >= 100) throw Object.assign(new Error('Aktarım kuyruğu dolu. Devam eden işlerin bitmesini bekleyin.'), { code: 'DEVICE_BUSY', status: 409 });
}

function readTransferHistory(filename) {
    let saved = JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
    if (!Array.isArray(saved) || saved.some(item => !item || typeof item !== 'object' ||
        !['string', 'number'].includes(typeof item.id) || typeof item.filename !== 'string' ||
        !['mobile-to-pc', 'pc-to-phone'].includes(item.direction) ||
        ['localPath', 'deviceId', 'remotePath', 'phoneSerial'].some(key => item[key] !== undefined && typeof item[key] !== 'string') ||
        (item.rawSize !== undefined && (!Number.isFinite(item.rawSize) || item.rawSize < 0)) ||
        !['saved', 'queued', 'transferring', 'transferred', 'interrupted', 'error'].includes(item.status))) throw new Error('Geçersiz transfer geçmişi');
    saved = saved.map(item => ['queued', 'transferring'].includes(item.status) ? { ...item, status: 'interrupted' } : item);
    return saved;
}

function syncTransfersWithDisk() {
    let saved = [];
    if (fs.existsSync(TRANSFERS_FILE)) {
        try {
            saved = readTransferHistory(TRANSFERS_FILE);
        } catch (e) {
            transfersReadFailed = true;
            console.error('Transfer geçmişi okunamadı; dosya korunuyor.');
            try { saved = readTransferHistory(TRANSFERS_FILE + '.bak'); } catch (_) { return transfersList; }
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
            const indexedPaths = new Set(saved.filter(item => item.localPath).map(item => path.resolve(item.localPath)));
            for (const file of files) {
                if (file.startsWith('.') || /\.(tmp|part)$/i.test(file)) continue;
                const fullPath = path.join(RECEIVED_DIR, file);
                try {
                    const stats = fs.statSync(fullPath);
                    if (!stats.isFile()) continue;

                    const alreadyInList = indexedPaths.has(path.resolve(fullPath));

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
                        indexedPaths.add(path.resolve(fullPath));
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
    if (!transfersReadFailed) saveTransfers();
    return transfersList;
}

// Watch RECEIVED_DIR for file deletions so UI updates live
let receivedWatcher = null;
if (fs.existsSync(RECEIVED_DIR)) {
    receivedWatcher = chokidar.watch(RECEIVED_DIR, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 1200, pollInterval: 300 }
    });
    receivedWatcher.on('add', indexReceivedFile);
    receivedWatcher.on('change', indexReceivedFile);
    receivedWatcher.on('error', () => broadcast({ type: 'PERSISTENCE_ERROR', error: 'Alınan dosyalar klasörü izlenemiyor. Klasör erişimini kontrol edin.' }));
    receivedWatcher.on('unlink', (filePath) => {
        try {
            const previousLength = transfersList.length;
            transfersList = transfersList.filter(item => path.resolve(item.localPath || '') !== path.resolve(filePath));
            if (transfersList.length !== previousLength) { saveTransfers(); broadcast({ type: 'TRANSFERS_UPDATED', transfers: transfersList }); }
        } catch (error) { console.error(error.message); }
    });
}

function indexReceivedFile(filePath) {
    if (path.basename(filePath).startsWith('.') || /\.(tmp|part)$/i.test(filePath)) return;
    try {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) return;
        const previous = transfersList.find(item => item.localPath && path.resolve(item.localPath) === path.resolve(filePath));
        if (previous && previous.rawSize === stats.size && new Date(previous.mtime).getTime() === stats.mtimeMs) return;
        const record = { ...(previous || {}), id: previous?.id || crypto.randomUUID(), filename: previous?.filename || path.basename(filePath),
            originalName: previous?.originalName || path.basename(filePath), localPath: filePath, rawSize: stats.size, size: formatBytes(stats.size),
            mtime: stats.mtime, timestamp: new Date(stats.mtime).toLocaleTimeString(), direction: 'mobile-to-pc',
            category: getTargetAndroidDir(filePath).category, status: 'transferred' };
        transfersList = [record, ...transfersList.filter(item => item !== previous)];
        saveTransfers();
        broadcast({ type: 'TRANSFERS_UPDATED', transfers: transfersList });
    } catch (_) { broadcast({ type: 'PERSISTENCE_ERROR', error: 'Dosya geçmişi güncellenemedi. Klasör erişimini ve boş alanı kontrol edin.' }); }
}

function extractApkMetadata(apkPath) {
    return new Promise(resolve => {
        let child;
        child = execFile(AAPT_BIN, ['dump', 'badging', apkPath], { timeout: 15000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (error, stdout) => {
            ownedAdbProcesses.delete(child);
            const output = error ? '' : stdout || '';
            const pkg = output.match(/package:\s*name='([^']+)'\s*versionCode='([^']*)'\s*versionName='([^']*)'/);
            const label = output.match(/application-label(?:-[a-zA-Z_]+)?:'([^']+)'/) || output.match(/application:\s*label='([^']+)'/);
            resolve({ packageName: pkg?.[1] || '', versionCode: pkg?.[2] || '', versionName: pkg?.[3] || '',
                label: label?.[1] || path.basename(apkPath).replace(/\.apk$/i, ''),
                minSdk: output.match(/sdkVersion:'([^']+)'/)?.[1] || '',
                targetSdk: output.match(/targetSdkVersion:'([^']+)'/)?.[1] || '',
                launchableActivity: output.match(/launchable-activity:\s*name='([^']+)'/)?.[1] || '' });
        });
        if (child) ownedAdbProcesses.add(child);
    });
}

const pendingApkRegistrations = new Map();
function isCompleteApk(filePath, size) {
    if (size < 22) return false;
    const descriptor = fs.openSync(filePath, 'r');
    try {
        const tail = Buffer.alloc(Math.min(size, 65557));
        if (fs.readSync(descriptor, tail, 0, tail.length, size - tail.length) !== tail.length) return false;
        const signature = Buffer.from('504b0506', 'hex');
        for (let offset = tail.lastIndexOf(signature); offset >= 0; offset = offset === 0 ? -1 : tail.lastIndexOf(signature, offset - 1)) {
            if (offset + 22 > tail.length || offset + 22 + tail.readUInt16LE(offset + 20) !== tail.length) continue;
            const directorySize = tail.readUInt32LE(offset + 12);
            const directoryOffset = tail.readUInt32LE(offset + 16);
            if (!tail.readUInt16LE(offset + 10)) return false;
            return directorySize === 0xffffffff || directoryOffset === 0xffffffff || directorySize + directoryOffset === size - tail.length + offset;
        }
        return false;
    } finally { fs.closeSync(descriptor); }
}

function registerApk(filePath, source = 'drop', originalName = '') {
    let canonical;
    try { canonical = fs.realpathSync(filePath); } catch (_) { return Promise.resolve(null); }
    const key = process.platform === 'win32' ? path.resolve(canonical).toLowerCase() : path.resolve(canonical);
    if (pendingApkRegistrations.has(key)) return pendingApkRegistrations.get(key);
    const pending = registerApkRevision(canonical, source, key, originalName).finally(() => pendingApkRegistrations.delete(key));
    pendingApkRegistrations.set(key, pending);
    return pending;
}

async function registerApkRevision(filePath, source, key, originalName) {
    try {
        if (!fs.existsSync(filePath)) return null;
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) return null;

        const fileName = originalName || path.basename(filePath);
        const id = crypto.createHash('sha256').update(key).digest('hex');
        const revision = `${stats.size}:${stats.mtimeMs}`;

        // Deduplication
        const existing = apkList.find(item => item.id === id);
        if (existing && existing.revision === revision) {
            return existing;
        }

        if (!isCompleteApk(filePath, stats.size)) return null;

        const meta = await extractApkMetadata(filePath);
        const after = fs.statSync(filePath);
        if (`${after.size}:${after.mtimeMs}` !== revision) return null;
        apkList = apkList.filter(item => item.id !== id);

        const apkItem = {
            id,
            revision,
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
        if (['folder-watcher', 'unity-editor'].includes(source) && config.autoInstallOnAdb && config.selectedAdbDevice) {
            console.log(`[Otomatik ADB]: ${fileName} -> ${config.selectedAdbDevice}`);
            installApkViaAdb(config.selectedAdbDevice, filePath, apkItem).catch(() => {});
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
            if (file.startsWith('.')) continue;
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
let watcherRevision = 0;
let watcherChange = Promise.resolve();
function setupWatcher(targetDir, forcePolling = false) {
    const revision = ++watcherRevision;
    watcherChange = watcherChange.catch(() => {}).then(() => replaceWatcher(targetDir, revision, forcePolling));
    return watcherChange;
}
async function replaceWatcher(targetDir, revision, forcePolling) {
    if (currentWatcher) {
        const previous = currentWatcher;
        currentWatcher = null;
        await previous.close();
    }
    if (revision !== watcherRevision || shuttingDown) return;
    if (!fs.existsSync(targetDir)) {
        try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
    }
    console.log(`[Klasör İzleniyor]: ${targetDir}`);
    const normalizedDir = path.resolve(targetDir).replace(/\\/g, '/');
    const usePolling = forcePolling || process.env.BRQ_WATCH_POLLING === '1' || normalizedDir.startsWith('//');
    currentWatcher = chokidar.watch(normalizedDir, {
        persistent: true,
        usePolling,
        ignored: (filePath, stats) => stats?.isFile() && (!filePath.toLowerCase().endsWith('.apk') || path.basename(filePath).startsWith('.')),
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

    const watcher = currentWatcher;
    watcher.on('error', () => {
        if (revision !== watcherRevision || currentWatcher !== watcher || shuttingDown) return;
        if (!usePolling) setupWatcher(targetDir, true).catch(() => broadcast({ type: 'WATCHER_ERROR', error: 'Klasör izlenemiyor. Erişim izinlerini kontrol edin.' }));
        else broadcast({ type: 'WATCHER_ERROR', error: 'İzlenen klasör okunamıyor. Klasör erişimini kontrol edin.' });
    });
    currentWatcher.on('unlink', filePath => { apkList = apkList.filter(item => item.filePath !== filePath); broadcast({ type: 'APKS_UPDATED', apks: apkList }); });
    currentWatcher.on('change', filePath => {
        if (filePath.toLowerCase().endsWith('.apk')) {
            registerApk(filePath, 'folder-watcher');
        }
    });
}

// ADB Management functions
const batteryCache = new Map();
function getAdbBattery(deviceId) {
    if (!deviceId) return Promise.resolve(null);
    const cached = batteryCache.get(deviceId);
    if (cached && Date.now() < cached.expiresAt) return cached.promise;
    const promise = runAdbCommand(['-s', deviceId, 'shell', 'dumpsys', 'battery'], 2500).then(output => {
        const level = Number(output.match(/level:\s*(\d+)/i)?.[1]);
        const scale = Number(output.match(/scale:\s*(\d+)/i)?.[1] || 100);
        if (!Number.isFinite(level) || scale <= 0) return null;
        return { level: Math.round(level / scale * 100), isCharging: /(?:AC|USB|Wireless) powered:\s*true|status:\s*2\b/i.test(output) };
    }).catch(() => null);
    batteryCache.set(deviceId, { promise, expiresAt: Date.now() + 20000 });
    return promise;
}

let adbDeviceMutationVersion = 0;
let devicesPoll = null;
let devicesSnapshot = [];
let devicesSnapshotAt = 0;
const reversedTransports = new Set();
async function getAdbDevices(strict = false) {
    if (devicesPoll) return devicesPoll;
    if (!strict && devicesSnapshotAt && Date.now() - devicesSnapshotAt < 3500) return devicesSnapshot;
    const version = adbDeviceMutationVersion;
    devicesPoll = (async () => {
        const output = await runAdbCommand(['devices', '-l'], 4000);
        const devices = [];
        for (const line of output.split(/\r?\n/).slice(1)) {
            const [id, state] = line.trim().split(/\s+/);
            if (!id || !state) continue;
            const isWifi = id.includes(':') || id.includes('._adb-tls-connect._tcp');
            if (isWifi && await isForgottenWirelessDevice(id)) continue;
            let serial = '';
            if (state === 'device') {
                try { serial = await runAdbCommand(['-s', id, 'shell', 'getprop', 'ro.serialno'], 2500); } catch (_) {}
                serial = normalizePhoneSerial(serial);
            }
            const rawModel = line.match(/model:([^\s]+)/)?.[1]?.replace(/_/g, ' ') || '';
            const identity = state === 'device' ? await readWirelessPhoneIdentity(id) : {};
            const model = resolveDeviceModel(identity.model || rawModel) || 'Android Cihaz';
            const phoneId = serial ? 'phone-' + crypto.createHash('sha256').update(serial).digest('hex').slice(0, 24) : 'transport-' + id;
            let device = devices.find(d => d.phoneId === phoneId);
            if (device) { device.transports.push({ id, state, isWifi }); continue; }
            device = { id, transportId: id, phoneId, serial, state, model, isWifi, transports: [{ id, state, isWifi }] };
            devices.push(device);
            if (state === 'device') device.battery = await getAdbBattery(id);
        }
        const online = new Set(devices.flatMap(d => d.transports.filter(t => t.state === 'device').map(t => t.id)));
        for (const id of reversedTransports) if (!online.has(id)) { reversedTransports.delete(id); batteryCache.delete(id); }
        for (const id of online) if (!reversedTransports.has(id)) {
            try { await runAdbCommand(['-s', id, 'reverse', 'tcp:' + PORT, 'tcp:' + PORT], 2500); reversedTransports.add(id); } catch (_) {}
        }
        if (version === adbDeviceMutationVersion) { devicesSnapshot = devices; devicesSnapshotAt = Date.now(); }
        return devices;
    })();
    let result;
    try { result = await devicesPoll; }
    catch (error) { if (strict) throw error; return []; }
    finally { devicesPoll = null; }
    if (version !== adbDeviceMutationVersion) return getAdbDevices(true);
    return result;
}

function runAdbCommand(args, options = 8000) {
    const settings = typeof options === 'number' ? { timeout: options } : options;
    return new Promise((resolve, reject) => {
        if (typeof shuttingDown !== 'undefined' && shuttingDown) return reject(new Error('Uygulama kapanıyor.'));
        let child;
        child = execFile(ADB_BIN, args, { timeout: 8000, maxBuffer: 4 * 1024 * 1024,
            signal: requestContext.getStore()?.signal, ...settings, windowsHide: true }, (err, stdout, stderr) => {
            ownedAdbProcesses.delete(child);
            if (err || /\bFailure\s*\[/i.test(stdout || '')) {
                const detail = String(stderr || stdout || err?.message || '');
                let code = 'ADB_FAILED', status = 502;
                let message = 'Cihaz işlemi tamamlanamadı. Bağlantıyı kontrol edip tekrar deneyin.';
                if (err?.code === 'ENOENT') { code = 'ADB_NOT_FOUND'; status = 503; message = 'ADB bulunamadı. Android Platform-Tools yolunu kontrol edin.'; }
                else if (err?.killed || err?.code === 'ETIMEDOUT' || err?.name === 'AbortError') { code = 'ADB_TIMEOUT'; status = 504; message = 'Cihaz işlemi zaman aşımına uğradı. Bağlantıyı kontrol edip tekrar deneyin.'; }
                else if (/unauthorized/i.test(detail)) { code = 'DEVICE_UNAUTHORIZED'; status = 409; message = 'Telefonda bu bilgisayar için hata ayıklama iznini onaylayın.'; }
                else if (/offline|device .*not found/i.test(detail)) { code = 'DEVICE_OFFLINE'; status = 409; message = 'Seçili telefonun bağlantısı kesildi. Yeniden bağlanın.'; }
                else if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE/.test(detail)) { code = 'INSTALL_SIGNATURE_MISMATCH'; message = 'Telefondaki uygulama farklı imzalı. Aynı imzalı APK kullanın.'; }
                else if (/INSTALL_FAILED_OLDER_SDK/.test(detail)) { code = 'INSTALL_SDK_UNSUPPORTED'; message = 'APK telefonunuzun Android sürümüyle uyumlu değil.'; }
                return reject(Object.assign(new Error(message), { code, status }));
            }
            resolve(settings.encoding === 'buffer' ? stdout : (stdout || '').trim());
        });
        if (child) ownedAdbProcesses.add(child);
    });
}
const ownedAdbProcesses = new Set();

async function resolveTargetDevice(target) {
    if (typeof target === 'string' && target.startsWith('phone-')) {
        const device = (await getAdbDevices(true)).find(item => item.phoneId === target && item.state === 'device');
        if (!device) throw Object.assign(new Error('Seçili telefon bağlı değil. Yeniden bağlanın.'), { code: 'DEVICE_OFFLINE', status: 409 });
        target = device.id;
    }
    if (typeof target !== 'string' || !target || target.length > 255 ||
        !/^[a-zA-Z0-9._:\[\]%-]+$/.test(target)) {
        throw Object.assign(new Error('Geçerli bir telefon seçin.'), { code: 'INVALID_TARGET', status: 400 });
    }
    const output = await runAdbCommand(['devices', '-l'], 3000);
    const rows = output.split(/\r?\n/).map(line => line.trim().split(/\s+/));
    const row = rows.find(parts => parts[0] === target);
    if (!row || row[1] !== 'device') throw Object.assign(new Error('Seçili telefon bağlı değil veya izin bekliyor. Telefonu yeniden bağlayın.'),
        { code: row?.[1] === 'unauthorized' ? 'DEVICE_UNAUTHORIZED' : 'DEVICE_OFFLINE', status: 409 });
    const known = config.knownWirelessDevices.find(item => item.deviceId === target && item.serial);
    if (known) {
        const serial = await runAdbCommand(['-s', target, 'shell', 'getprop', 'ro.serialno'], 3000);
        if (serial !== known.serial) throw Object.assign(new Error('Bu bağlantı artık kayıtlı telefona ait değil. Telefonu listeden yeniden seçin.'), { code: 'DEVICE_IDENTITY_CHANGED', status: 409 });
    }
    return target;
}

function isValidAdbAddress(ip, port) {
    return typeof ip === 'string' && /^[a-zA-Z0-9.:_-]+$/.test(ip) &&
        /^\d{1,5}$/.test(String(port)) && Number(port) > 0 && Number(port) <= 65535;
}

function adbEndpoint(ip, port) {
    return `${net.isIP(ip) === 6 ? `[${ip}]` : ip}:${port}`;
}

async function adbConnect(ip, port = 5555) {
    if (!isValidAdbAddress(ip, port)) throw new Error('Geçersiz IP veya port parametresi');
    const freshlyPaired = currentPairingSession && !currentPairingSession.cancelled &&
        currentPairingSession.pairedIp === ip && ['paired', 'paired_need_port'].includes(currentPairingSession.status);
    let services = discoveredAdbServices;
    if (config.forgottenWirelessDevices?.length) {
        try { services = await discoverAdbServices(); } catch (e) {}
        if (!freshlyPaired && requiresWirelessPairing(ip, services)) throw new Error('pairing required');
    }
    const output = await runAdbCommand(['connect', adbEndpoint(ip, port)]);
    if (!/^(already )?connected to /im.test(output)) {
        throw new Error(output || 'Bağlantı kurulamadı');
    }
    if (freshlyPaired && config.forgottenWirelessDevices?.length) {
        const serial = await runAdbCommand(['-s', adbEndpoint(ip, port), 'shell', 'getprop', 'ro.serialno'], 3000);
        config.forgottenWirelessDevices = config.forgottenWirelessDevices.filter(known => !serial || known.serial !== serial);
        saveConfig();
    } else if (await isForgottenWirelessDevice(adbEndpoint(ip, port))) {
        await runAdbCommand(['disconnect', adbEndpoint(ip, port)]);
        throw new Error('pairing required');
    }
    return output;
}

async function adbPair(ip, port, code) {
    if (!isValidAdbAddress(ip, port) || !/^\d{6}$/.test(String(code))) {
        throw Object.assign(new Error('Geçersiz IP, port veya 6 haneli eşleştirme kodu. Bilgileri kontrol edin.'), { code: 'INVALID_PAIRING', status: 400 });
    }
    const output = await runAdbCommand(['pair', adbEndpoint(ip, port), String(code)], 15000);
    if (!/^Successfully paired to /im.test(output)) {
        throw Object.assign(new Error('Eşleştirme tamamlanamadı. Kodun güncel olduğunu, eşleştirme ekranını ve ağ bağlantısını kontrol edin.'), { code: 'PAIRING_FAILED', status: 502 });
    }
    return output;
}

async function launchAppViaAdb(deviceId, packageName) {
    if (!/^[a-zA-Z0-9._-]+$/.test(packageName || '')) throw Object.assign(new Error('Geçersiz paket adı'), { status: 400 });
    const target = await resolveTargetDevice(deviceId);
    const output = await runAdbCommand(['-s', target, 'shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);
    if (/No activities found|monkey aborted|Error:/i.test(output)) throw Object.assign(new Error('Uygulama açılamadı. Paket ve açılış activity bilgisini kontrol edin.'), { code: 'LAUNCH_FAILED', status: 502 });
    return { success: true, output };
}

const deviceDataQueues = new Map();
const deviceDataQueueCounts = new Map();
async function runDeviceDataOperation(target, work) {
    const serial = normalizePhoneSerial(await runAdbCommand(['-s', target, 'shell', 'getprop', 'ro.serialno'], 3000));
    const key = serial || target;
    const count = deviceDataQueueCounts.get(key) || 0;
    if (count >= 100) throw Object.assign(new Error('Telefonun işlem kuyruğu dolu. İşlemlerin bitmesini bekleyin.'), { code: 'DEVICE_BUSY', status: 409 });
    deviceDataQueueCounts.set(key, count + 1);
    const previous = deviceDataQueues.get(key) || Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
        await resolveTargetDevice(target);
        if (serial && await runAdbCommand(['-s', target, 'shell', 'getprop', 'ro.serialno'], 3000) !== serial) throw Object.assign(new Error('Telefon kimliği değişti. İşlemi doğru telefonla yeniden başlatın.'), { code: 'DEVICE_IDENTITY_CHANGED', status: 409 });
        return work();
    });
    deviceDataQueues.set(key, pending);
    return pending.finally(() => {
        const remaining = deviceDataQueueCounts.get(key) - 1;
        if (remaining) deviceDataQueueCounts.set(key, remaining); else deviceDataQueueCounts.delete(key);
        if (deviceDataQueues.get(key) === pending) deviceDataQueues.delete(key);
    });
}

async function installApkViaAdb(deviceId, apkPath, apkMeta = null) {
    const operationId = crypto.randomUUID();
    let target = deviceId;
    try {
        target = await resolveTargetDevice(deviceId);
        return await runDeviceDataOperation(target, async () => {
            broadcast({ type: 'ADB_INSTALL_START', operationId, deviceId: target, apkName: path.basename(apkPath) });
            const snapshot = path.join(UPLOADS_DIR, '.install-' + crypto.randomUUID() + '.apk');
            try {
                const before = fs.statSync(apkPath);
                const revision = `${before.size}:${before.mtimeMs}`;
                if (apkMeta?.revision && apkMeta.revision !== revision) throw new Error('APK seçildikten sonra değişti. Güncel APK kartını yeniden seçin.');
                await fs.promises.copyFile(apkPath, snapshot);
                const after = fs.statSync(apkPath);
                if (`${after.size}:${after.mtimeMs}` !== revision) throw new Error('APK kopyalanırken değişti. Build tamamlanınca yeniden deneyin.');
                const output = await runAdbCommand(['-s', target, 'install', '-r', '-d', '-t', snapshot], { timeout: 10 * 60 * 1000 });
                broadcast({ type: 'ADB_INSTALL_SUCCESS', operationId, deviceId: target, apkName: path.basename(apkPath), output });
                if (config.autoLaunchAfterInstall && apkMeta?.packageName) {
                    try { await launchAppViaAdb(target, apkMeta.packageName); }
                    catch (error) { broadcast({ type: 'ADB_LAUNCH_ERROR', deviceId: target, error: error.message }); }
                }
                return { success: true, operationId };
            } finally { try { fs.unlinkSync(snapshot); } catch (_) {} }
        });
    } catch (error) {
        error.operationId = operationId;
        broadcast({ type: 'ADB_INSTALL_ERROR', operationId, deviceId: target, apkName: path.basename(apkPath), error: error.message });
        throw error;
    }
}

// ADB wireless discovery, pairing and reconnection
function normalizePhoneSerial(value) {
    return typeof value === 'string' && /^[a-zA-Z0-9._-]{1,255}$/.test(value) && !/^(unknown|null|undefined|0+)$/i.test(value) ? value : '';
}

function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let res = "";
    for (let i = 0; i < length; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
}

let currentPairingSession = null;
let pairingInProgress = false;
let reconnectInProgress = false;
let forgettingWirelessDevices = false;
let wirelessConnectInProgress = false;
let wirelessDisconnectInProgress = false;
let deviceSelectionVersion = 0;
function wirelessLifecycleBusy() {
    return forgettingWirelessDevices || wirelessConnectInProgress || wirelessDisconnectInProgress || reconnectInProgress;
}
const pausedWirelessDevices = new Set();
let discoveredAdbServices = [];
let discoveryPromise = null;
let discoveryExpiresAt = 0;
const wirelessPhoneIdentityCache = new Map();
const discoverySockets = new Set();

function resolveDeviceModel(model) {
    const normalized = (model || '').trim();
    if (/^SM[-_ ]N975F(?:\/DS)?$/i.test(normalized)) return 'Galaxy Note10+';
    return normalized;
}

async function readWirelessPhoneIdentity(deviceId) {
    const cached = wirelessPhoneIdentityCache.get(deviceId);
    if (cached && Date.now() < cached.expiresAt) return cached.promise;
    const promise = runAdbCommand(['-s', deviceId, 'shell',
        'echo BRQ_DEVICE_IDENTITY; getprop ro.product.marketname; getprop ro.product.model; settings get global device_name; settings get secure bluetooth_name 2>/dev/null; settings get system bluetooth_name 2>/dev/null'], 3000)
        .then(output => {
            const values = output.split(/\r?\n/).slice(1).map(value => {
                const cleaned = value.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 100);
                return /^(null|undefined|unknown)$/i.test(cleaned) ? '' : cleaned;
            });
            return { model: resolveDeviceModel(values[0] || values[1]), deviceName: values[2] || values[3] || values[4] || '' };
        }).catch(() => ({}));
    wirelessPhoneIdentityCache.set(deviceId, { promise, expiresAt: Date.now() + 60000 });
    if (wirelessPhoneIdentityCache.size > 100) {
        wirelessPhoneIdentityCache.delete(wirelessPhoneIdentityCache.keys().next().value);
    }
    return promise;
}

async function describeWirelessPhones(services) {
    const phones = wirelessPhoneServices(services);
    if (!phones.length) return phones;
    let devices = [];
    try {
        const output = await runAdbCommand(['devices', '-l'], 3000);
        devices = output.split(/\r?\n/).map(line => line.trim().split(/\s+/))
            .filter(parts => parts[1] === 'device');
    } catch (e) { /* Saved names remain available when ADB cannot list devices. */ }
    let changed = false;
    const result = await Promise.all(phones.map(async phone => {
        const known = (config.knownWirelessDevices || []).find(entry => isKnownWirelessService(phone, entry));
        const device = devices.find(parts => deviceMatchesService(parts[0], phone) ||
            (known?.serial && parts[0] === known.serial));
        let identity = { model: resolveDeviceModel(known?.model), deviceName: known?.deviceName || '' };
        if (device) {
            const live = await readWirelessPhoneIdentity(device[0]);
            const modelField = device.find(part => part.startsWith('model:'));
            identity = { model: resolveDeviceModel(live.model || modelField?.slice(6).replace(/_/g, ' ') || identity.model),
                deviceName: live.deviceName || identity.deviceName };
            if (known && (known.model !== identity.model || known.deviceName !== identity.deviceName)) {
                Object.assign(known, identity);
                changed = true;
            }
        }
        return { ...phone, ...identity };
    }));
    if (changed) saveConfig();
    return result;
}

function parseAdbServices(output) {
    const services = [];
    for (const line of output.split(/\r?\n/)) {
        const match = line.trim().match(/^(\S+)\s+(_adb(?:-tls-(?:pairing|connect))?\._tcp)\.?\s+(\S+)$/);
        if (!match) continue;
        const address = match[3].match(/^(?:\[([^\]]+)\]|(.+)):(\d+)$/);
        if (!address) continue;
        const ip = address[1] || address[2];
        const port = Number(address[3]);
        if (!net.isIP(ip) || !isValidAdbAddress(ip, port)) continue;
        const service = { name: match[1], type: match[2], ip, port };
        if (!services.some(s => s.name === service.name && s.type === service.type && s.ip === ip && s.port === port)) {
            services.push(service);
        }
    }
    return services;
}

function codePairingServices(services) {
    const byName = new Map();
    for (const service of services) {
        if (service.type !== '_adb-tls-pairing._tcp' || !service.name.startsWith('adb-')) continue;
        if (!byName.has(service.name) || net.isIP(service.ip) === 4) byName.set(service.name, service);
    }
    return [...byName.values()];
}

// Query each LAN interface directly as a fallback for ADB discovery on hotspots.
// Ephemeral UDP ports request unicast DNS-SD replies without taking ADB's port 5353.
function readDnsName(packet, offset, visited = new Set()) {
    const labels = [];
    let end = offset;
    while (offset < packet.length) {
        if (visited.has(offset)) throw new Error('DNS pointer loop');
        visited.add(offset);
        const length = packet[offset++];
        if (!length) return { name: labels.join('.'), end: offset };
        if ((length & 0xc0) === 0xc0) {
            if (offset >= packet.length) throw new Error('Truncated DNS pointer');
            const pointer = ((length & 0x3f) << 8) | packet[offset++];
            labels.push(readDnsName(packet, pointer, visited).name);
            return { name: labels.join('.'), end: offset };
        }
        if (length > 63 || offset + length > packet.length) throw new Error('Invalid DNS label');
        labels.push(packet.toString('utf8', offset, offset + length));
        offset += length;
        end = offset;
    }
    throw new Error(`Truncated DNS name at ${end}`);
}

function parseMdnsRecords(packet) {
    if (packet.length < 12 || !(packet.readUInt16BE(2) & 0x8000)) return [];
    let offset = 12;
    const records = [];
    for (let i = 0; i < packet.readUInt16BE(4); i++) offset = readDnsName(packet, offset).end + 4;
    const count = packet.readUInt16BE(6) + packet.readUInt16BE(8) + packet.readUInt16BE(10);
    for (let i = 0; i < count; i++) {
        const owner = readDnsName(packet, offset);
        offset = owner.end;
        if (offset + 10 > packet.length) throw new Error('Truncated DNS record');
        const type = packet.readUInt16BE(offset);
        const ttl = packet.readUInt32BE(offset + 4);
        const length = packet.readUInt16BE(offset + 8);
        offset += 10;
        const end = offset + length;
        if (end > packet.length) throw new Error('Truncated DNS data');
        const record = { name: owner.name, type, ttl };
        if (type === 12 && length) record.target = readDnsName(packet, offset).name;
        if (type === 33 && length >= 7) {
            record.port = packet.readUInt16BE(offset + 4);
            record.target = readDnsName(packet, offset + 6).name;
        }
        if (type === 1 && length === 4) record.ip = [...packet.subarray(offset, end)].join('.');
        records.push(record);
        offset = end;
    }
    return records;
}

function discoverNetworkAdbServices() {
    const interfaces = Object.values(os.networkInterfaces()).flat().filter(iface =>
        iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.'));
    return Promise.all(interfaces.map(iface => new Promise(resolve => {
        const socket = dgram.createSocket('udp4');
        discoverySockets.add(socket);
        const records = [];
        const queried = new Set();
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            discoverySockets.delete(socket);
            clearTimeout(timer);
            try { socket.close(); } catch (e) {}
            const services = [];
            for (const record of records.filter(r => r.type === 33 && r.port)) {
                const match = record.name.match(/^(.+)\.(_adb(?:-tls-(?:pairing|connect))?\._tcp)\.local$/i);
                if (!match) continue;
                for (const address of records.filter(r => r.type === 1 && r.name.toLowerCase() === record.target.toLowerCase())) {
                    if (isValidAdbAddress(address.ip, record.port)) {
                        services.push({ name: match[1], type: match[2].toLowerCase(), ip: address.ip, port: record.port });
                    }
                }
            }
            resolve(services);
        };
        const timer = setTimeout(finish, 1600);
        const query = (name, type) => {
            const key = `${name.toLowerCase()}:${type}`;
            if (finished || queried.has(key) || queried.size >= 64) return;
            queried.add(key);
            const labels = name.split('.').map(label => Buffer.concat([Buffer.from([Buffer.byteLength(label)]), Buffer.from(label)]));
            const header = Buffer.alloc(12);
            header.writeUInt16BE(1, 4);
            const question = Buffer.alloc(4);
            question.writeUInt16BE(type, 0);
            question.writeUInt16BE(1, 2);
            const packet = Buffer.concat([header, ...labels, Buffer.from([0]), question]);
            socket.send(packet, 5353, '224.0.0.251', () => {});
        };
        socket.on('error', finish);
        socket.on('close', finish);
        socket.on('message', packet => {
            try {
                const incoming = parseMdnsRecords(packet);
                // Ignore unrelated replies and follow only ADB service references.
                for (const record of incoming) {
                    const previous = records.findIndex(item => item.name.toLowerCase() === record.name.toLowerCase() && item.type === record.type &&
                        (record.type === 33 || (item.ip === record.ip && item.target === record.target)));
                    if (previous >= 0) records.splice(previous, 1);
                    if (record.ttl === 0) continue;
                    if (records.length < 512) records.push(record);
                    if (record.type === 12 && /^_adb(?:-tls-(?:pairing|connect))?\._tcp\.local$/i.test(record.name) &&
                        record.target?.toLowerCase().endsWith(`.${record.name.toLowerCase()}`)) query(record.target, 33);
                    if (record.type === 33 && /\._adb(?:-tls-(?:pairing|connect))?\._tcp\.local$/i.test(record.name)) query(record.target, 1);
                }
            } catch (e) { /* A malformed LAN reply must not interrupt discovery. */ }
        });
        socket.bind(0, iface.address, () => {
            if (finished) return;
            try {
                socket.setMulticastInterface(iface.address);
                socket.setMulticastTTL(255);
                for (const type of ['_adb-tls-connect._tcp', '_adb-tls-pairing._tcp', '_adb._tcp']) query(`${type}.local`, 12);
            } catch (e) { finish(); }
        });
    }))).then(results => results.flat());
}

async function discoverAdbServices() {
    if (discoveryPromise) return discoveryPromise;
    if (Date.now() < discoveryExpiresAt) return discoveredAdbServices;
    discoveryPromise = Promise.allSettled([
        runAdbCommand(['mdns', 'services'], 5000), discoverNetworkAdbServices()
    ]).then(([adbResult, networkResult]) => {
        const services = networkResult.status === 'fulfilled' ? networkResult.value : [];
        if (adbResult.status === 'rejected' && !services.length) throw adbResult.reason;
        if (adbResult.status === 'fulfilled') {
            const freshNames = new Set(services.map(service => service.name + ':' + service.type));
            services.push(...parseAdbServices(adbResult.value).filter(service => !freshNames.has(service.name + ':' + service.type)));
        }
        discoveredAdbServices = services.filter((service, index) => services.findIndex(s =>
            s.name === service.name && s.type === service.type && s.ip === service.ip && s.port === service.port) === index);
        discoveryExpiresAt = Date.now() + 1500;
        return discoveredAdbServices;
    }).finally(() => { discoveryPromise = null; });
    return discoveryPromise;
}

function wirelessPhoneServices(services) {
    const phones = new Map();
    for (const service of services) {
        if (!['_adb-tls-connect._tcp', '_adb._tcp'].includes(service.type)) continue;
        if (service.type === '_adb._tcp' && services.some(candidate => candidate.ip === service.ip && candidate.type === '_adb-tls-connect._tcp')) continue;
        const key = service.name + service.type;
        const previous = phones.get(key);
        if (!previous || net.isIP(service.ip) === 4) phones.set(key, service);
    }
    for (const service of codePairingServices(services)) {
        if (![...phones.values()].some(phone => phone.ip === service.ip)) phones.set(service.name + service.type, service);
    }
    return [...phones.values()].map(service => {
        const known = (config.knownWirelessDevices || []).some(known => isKnownWirelessService(service, known));
        return { ...service, known, reconnectable: known && service.type !== '_adb-tls-pairing._tcp' &&
            isWirelessServicePaused(service) && !requiresWirelessPairing(service.ip, services) };
    });
}

function deviceMatchesService(deviceId, service) {
    return deviceId === adbEndpoint(service.ip, service.port) || deviceId === service.name ||
        deviceId.replace(/\.$/, '') === `${service.name}.${service.type}`;
}

async function findConnectedDevice(ip, services) {
    const output = await runAdbCommand(['devices']);
    const ids = output.split(/\r?\n/).map(line => line.trim().split(/\s+/))
        .filter(parts => parts[1] === 'device').map(parts => parts[0]);
    return ids.find(id => id.startsWith(`${net.isIP(ip) === 6 ? `[${ip}]` : ip}:`) ||
        services.some(s => s.ip === ip && s.type === '_adb-tls-connect._tcp' && deviceMatchesService(id, s))) || '';
}

function publicPairingSession(session = currentPairingSession) {
    if (!session) return null;
    const { mode, qrDataUrl, status, pairedIp, message } = session;
    return { mode, qrDataUrl, status, pairedIp, message };
}

function publishPairingStatus(session) {
    if (!session.cancelled) broadcast({ type: 'ADB_PAIR_STATUS', session: publicPairingSession(session) });
}

function isWirelessServicePaused(service) {
    return pausedWirelessDevices.has(service.ip) || pausedWirelessDevices.has(service.name) ||
        (config.knownWirelessDevices || []).some(known => isKnownWirelessService(service, known) &&
            (known.autoReconnect === false || pausedWirelessDevices.has(known.serviceName) || pausedWirelessDevices.has(known.serial)));
}

async function rememberWirelessDevice(deviceId, services, resume = true) {
    const version = adbDeviceMutationVersion;
    const service = services.find(s => s.type === '_adb-tls-connect._tcp' && deviceMatchesService(deviceId, s));
    if (!service) return;
    if (forgettingWirelessDevices || requiresWirelessPairing(service.ip, services)) return false;
    let serial = '';
    try { serial = await runAdbCommand(['-s', deviceId, 'shell', 'getprop', 'ro.serialno'], 3000); } catch (e) {}
    serial = normalizePhoneSerial(serial);
    if (!resume && isWirelessServicePaused(service)) return false;
    const identity = await readWirelessPhoneIdentity(deviceId);
    if (version !== adbDeviceMutationVersion) return false;
    const known = Array.isArray(config.knownWirelessDevices) ? config.knownWirelessDevices : [];
    const previous = known.find(d => (serial && d.serial === serial) || (d.serviceName === service.name && (!serial || !d.serial)));
    for (const entry of known) if (serial && entry.serial && entry.serial !== serial && entry.serviceName === service.name) { entry.aliases = (entry.aliases || []).filter(alias => alias !== service.name); entry.serviceName = ''; entry.autoReconnect = false; }
    if (forgettingWirelessDevices || requiresWirelessPairing(service.ip, services)) return false;
    if (!resume && isWirelessServicePaused(service)) return false;
    config.knownWirelessDevices = known.filter(d => d !== previous && (!serial || d.serial !== serial));
    config.knownWirelessDevices.push({ phoneId: previous?.phoneId || (serial ? 'phone-' + crypto.createHash('sha256').update(serial).digest('hex').slice(0, 24) : crypto.randomUUID()), identityConfirmed: !!serial, aliases: [...new Set([...(previous?.aliases || []), service.name])], serviceName: service.name, serial, deviceId, ip: service.ip,
        model: identity.model || previous?.model || '', deviceName: identity.deviceName || previous?.deviceName || '' });
    pausedWirelessDevices.delete(service.name);
    pausedWirelessDevices.delete(service.ip);
    if (serial) pausedWirelessDevices.delete(serial);
    saveConfig();
    return true;
}

function isKnownWirelessService(service, known) {
    return service.name === known.serviceName || known.aliases?.includes(service.name) || (known.serial && service.name.startsWith(`adb-${known.serial}-`));
}

// These records enforce re-pairing in BRQ; Android keeps its own host authorization.
function requiresWirelessPairing(ip, services = discoveredAdbServices) {
    return (config.forgottenWirelessDevices || []).some(known =>
        services.some(service => service.ip === ip && isKnownWirelessService(service, known)) ||
        (known.ip === ip && !services.some(service => service.ip === ip &&
            service.type === '_adb-tls-connect._tcp' && !isKnownWirelessService(service, known))));
}

async function isForgottenWirelessDevice(deviceId) {
    const forgotten = config.forgottenWirelessDevices || [];
    if (!forgotten.length) return false;
    const service = discoveredAdbServices.find(service => deviceMatchesService(deviceId, service));
    if (service) return requiresWirelessPairing(service.ip);
    if (forgotten.some(known => known.deviceId === deviceId ||
        deviceId.replace(/\.$/, '') === `${known.serviceName}._adb-tls-connect._tcp` ||
        (known.serial && deviceId.startsWith(`adb-${known.serial}-`)))) return true;
    // Discovery may be blocked while DHCP has changed a forgotten phone's address.
    try {
        const serial = await runAdbCommand(['-s', deviceId, 'shell', 'getprop', 'ro.serialno'], 3000);
        return !serial || forgotten.some(known => !known.serial || known.serial === serial);
    } catch (e) {
        return true;
    }
}

async function reconnectKnownWirelessDevices() {
    if (wirelessLifecycleBusy() || pairingInProgress || !config.knownWirelessDevices?.length) return;
    reconnectInProgress = true;
    try {
        const services = await discoverAdbServices();
        for (const service of services.filter(s => s.type === '_adb-tls-connect._tcp')) {
            if (pairingInProgress || forgettingWirelessDevices) break;
            const known = config.knownWirelessDevices.find(d => isKnownWirelessService(service, d));
            if (!known || !known.serial || isWirelessServicePaused(service)) continue;
            if (await findConnectedDevice(service.ip, services)) continue;
            if (isWirelessServicePaused(service)) continue;
            try { await adbConnect(service.ip, service.port); } catch (e) { continue; }
            const deviceId = await findConnectedDevice(service.ip, services);
            if (isWirelessServicePaused(service)) {
                if (deviceId) await runAdbCommand(['disconnect', deviceId]);
                continue;
            }
            if (deviceId) {
                const serial = await runAdbCommand(['-s', deviceId, 'shell', 'getprop', 'ro.serialno'], 3000);
                if (serial !== known.serial) { await runAdbCommand(['disconnect', deviceId]); continue; }
                if (!await rememberWirelessDevice(deviceId, services, false)) {
                    await runAdbCommand(['disconnect', deviceId]);
                    continue;
                }
                if (config.selectedAdbDevice === known.deviceId) {
                    config.selectedAdbDevice = deviceId;
                }
                saveConfig();
                broadcast({ type: 'CONFIG_UPDATED', config });
                broadcast({ type: 'DEVICES_UPDATED', devices: await getAdbDevices() });
            }
        }
    } catch (e) {
        // Offline devices are retried on the next discovery cycle.
    } finally {
        reconnectInProgress = false;
    }
}

async function startAdbQrPairing() {
    if (wirelessLifecycleBusy()) throw new Error('ADB işlemi devam ediyor. Lütfen tekrar deneyin.');
    if (pairingInProgress) throw new Error('Eşleştirme devam ediyor. Lütfen bekleyin.');
    if (currentPairingSession) {
        currentPairingSession.cancelled = true;
    }

    const serviceName = `ADB_WIFI_${generateRandomString(12)}`;
    const password = generateRandomString(16);
    const qrText = `WIFI:T:ADB;S:${serviceName};P:${password};;`;
    const session = {
        mode: 'qr',
        serviceName,
        password,
        qrText,
        qrDataUrl: '',
        status: 'waiting_for_scan',
        pairedIp: '',
        message: 'Telefonunuzdan "Cihazı QR koduyla eşle"yi açıp bu kodu tarayın...',
        startedAt: Date.now(),
        cancelled: false
    };

    currentPairingSession = session;
    session.selectionVersion = deviceSelectionVersion;
    session.qrDataUrl = await QRCode.toDataURL(qrText, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
    });
    if (session.cancelled || currentPairingSession !== session) throw new Error('QR eşleştirme iptal edildi.');
    runPairingLoop(session);
    return session;
}

async function autoResolveConnect(ip, session) {
    for (let attempt = 0; attempt < 6 && !session.cancelled; attempt++) {
        let services = [];
        try { services = await discoverAdbServices(); } catch (e) {}
        const connected = await findConnectedDevice(ip, services);
        if (connected) return connected;
        for (const service of services.filter(s => s.ip === ip && s.type === '_adb-tls-connect._tcp')) {
            if (session.cancelled) return '';
            try {
                await adbConnect(service.ip, service.port);
                const deviceId = await findConnectedDevice(ip, services);
                if (deviceId) return deviceId;
            } catch (e) {}
        }
        if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 750));
    }
    return '';
}

async function completeAdbPairing(session, service) {
    let pairedServices = [];
    try { pairedServices = await discoverAdbServices(); } catch (e) {}
    if (session.cancelled || currentPairingSession !== session) return;
    config.forgottenWirelessDevices = (config.forgottenWirelessDevices || []).filter(known =>
        !pairedServices.some(candidate => candidate.ip === service.ip && isKnownWirelessService(candidate, known)));
    saveConfig();
    session.status = 'paired';
    session.pairedIp = service.ip;
    publishPairingStatus(session);
    const deviceId = await autoResolveConnect(service.ip, session);
    if (session.cancelled) return;
    if (deviceId) {
        if (config.forgottenWirelessDevices?.length) {
            const serial = await runAdbCommand(['-s', deviceId, 'shell', 'getprop', 'ro.serialno'], 3000);
            config.forgottenWirelessDevices = config.forgottenWirelessDevices.filter(known => !serial || known.serial !== serial);
        }
        if (session.selectionVersion === undefined || session.selectionVersion === deviceSelectionVersion) config.selectedAdbDevice = deviceId;
        saveConfig();
        let services = [];
        try { services = await discoverAdbServices(); } catch (e) {}
        await rememberWirelessDevice(deviceId, services);
        session.status = 'connected';
        broadcast({ type: 'CONFIG_UPDATED', config });
        broadcast({ type: 'DEVICES_UPDATED', devices: await getAdbDevices() });
    } else {
        session.status = 'paired_need_port';
    }
    publishPairingStatus(session);
}

async function runPairingLoop(session) {
    while (!session.cancelled && Date.now() - session.startedAt < 120000) {
        try {
            const services = await discoverAdbServices();
            if (session.cancelled) return;
            const service = services.find(s => s.type === '_adb-tls-pairing._tcp' && s.name === session.serviceName);
            if (service && !pairingInProgress && !wirelessLifecycleBusy()) {
                pairingInProgress = true;
                try {
                    session.status = 'pairing';
                    session.pairedIp = service.ip;
                    publishPairingStatus(session);
                    const output = await runAdbCommand(['pair', adbEndpoint(service.ip, service.port), session.password], 15000);
                    if (!/^Successfully paired to /im.test(output)) throw new Error('Eşleştirme başarısız');
                    await completeAdbPairing(session, service);
                } catch (e) {
                    session.status = 'error';
                    publishPairingStatus(session);
                } finally {
                    pairingInProgress = false;
                }
                return;
            }
        } catch (e) {}
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
    if (!session.cancelled) {
        session.status = 'timeout';
        publishPairingStatus(session);
    }
}

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            if (client.isAdmin) client.send(payload);
            else if (data.type === 'NEW_APK') client.send(JSON.stringify({ type: 'NEW_APK', apk: publicApk(data.apk) }));
            else if (data.type === 'APKS_UPDATED') client.send(JSON.stringify({ type: 'APKS_UPDATED', apks: data.apks.map(publicApk) }));
        }
    });
}

// In-Browser High-FPS Screen Streamer via hardware screenrecord H.264
function publicApk(apk) {
    const { filePath, ...result } = apk;
    return result;
}

let screenStreamProcess = null;
let activeScreenStreamWs = null;
let screenSession = null;
function stopScreenStream(owner = null, reason = '') {
    const session = screenSession;
    if (!session || (owner && owner !== session.owner)) return;
    screenSession = null;
    clearTimeout(session.retry);
    clearInterval(session.backpressure);
    session.process?.kill();
    screenStreamProcess = null;
    activeScreenStreamWs = null;
    if (session.owner.readyState === WebSocket.OPEN) session.owner.send(JSON.stringify({ type: 'SCREEN_STREAM_STATUS', running: false, streamId: session.id, error: reason }));
}
async function startScreenStream(owner, deviceId) {
    if (screenSession && screenSession.owner !== owner) {
        if (owner.readyState === WebSocket.OPEN) owner.send(JSON.stringify({ type: 'SCREEN_STREAM_STATUS', running: false, error: 'Yayın başka bir pencerede açık. Önce o pencereden durdurun.' }));
        return;
    }
    stopScreenStream(owner);
    const session = { id: crypto.randomUUID(), owner, target: deviceId || config.selectedAdbDevice, process: null, stalledAt: 0 };
    screenSession = session;
    activeScreenStreamWs = owner;
    try {
        session.target = await resolveTargetDevice(session.target);
        if (screenSession !== session || owner.readyState !== WebSocket.OPEN) return;
        spawnScreenSegment(session);
    } catch (error) { if (screenSession === session) stopScreenStream(owner, error.message); }
}
function spawnScreenSegment(session) {
    if (screenSession !== session || session.owner.readyState !== WebSocket.OPEN) return;
    const proc = spawn(ADB_BIN, ['-s', session.target, 'exec-out', 'screenrecord', '--output-format=h264', '--bit-rate', '6000000', '--time-limit', '180', '-'], { windowsHide: true });
    session.process = proc;
    screenStreamProcess = proc;
    let running = false;
    const current = () => screenSession === session && session.process === proc;
    const checkBackpressure = () => {
        if (!current()) return;
        if (session.owner.readyState !== WebSocket.OPEN) return stopScreenStream(session.owner);
        if (session.owner.bufferedAmount > 4 * 1024 * 1024) {
            proc.stdout.pause();
            session.stalledAt ||= Date.now();
            if (Date.now() - session.stalledAt > 5000) stopScreenStream(session.owner, 'Ekran alıcısı yavaş. Yayını yeniden başlatın.');
        } else if (session.owner.bufferedAmount < 1024 * 1024) { session.stalledAt = 0; proc.stdout.resume(); }
    };
    clearInterval(session.backpressure);
    session.backpressure = setInterval(checkBackpressure, 100);
    proc.stdout.on('data', chunk => {
        if (!current()) return;
        if (session.owner.readyState !== WebSocket.OPEN) return stopScreenStream(session.owner);
        if (!running) { running = true; session.owner.send(JSON.stringify({ type: 'SCREEN_STREAM_STATUS', running: true, streamId: session.id, deviceId: session.target })); }
        session.owner.send(chunk);
        checkBackpressure();
    });
    proc.stderr.on('data', () => {});
    proc.on('error', () => { if (current()) stopScreenStream(session.owner, 'Ekran yayını başlatılamadı. ADB bağlantısını kontrol edin.'); });
    proc.on('close', code => {
        if (!current()) return;
        clearInterval(session.backpressure);
        session.process = null;
        screenStreamProcess = null;
        if (code === 0 && running) session.retry = setTimeout(() => spawnScreenSegment(session), 250);
        else stopScreenStream(session.owner, 'Ekran yayını kesildi. Bağlantıyı kontrol edip yeniden başlatın.');
    });
}

wss.on('connection', (ws, req) => {
    ws.on('error', () => { stopScreenStream(ws); ws.terminate(); });
    ws.on('close', () => stopScreenStream(ws));
    initializeWebSocket(ws, req).catch(() => ws.terminate());
});
async function initializeWebSocket(ws, req) {
    ws.isAdmin = isAdminRequest(req);
    if (!ws.isAdmin) {
        ws.send(JSON.stringify({ type: 'INIT', apks: apkList.map(publicApk), port: PORT }));
        return;
    }
    const devices = await getAdbDevices();
    if (ws.readyState !== WebSocket.OPEN) return;
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
        pairingSession: publicPairingSession()
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'START_SCREEN_STREAM') {
                startScreenStream(ws, data.deviceId).catch(() => {});
            } else if (data.action === 'STOP_SCREEN_STREAM') {
                stopScreenStream(ws);
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
}

// Middleware
app.use((req, res, next) => {
    if (!sameOriginRequest(req)) return sendApiError(res, Object.assign(new Error('Bu kaynaktan erişime izin verilmiyor. Yerel yönetim panelini açın.'), { code: 'FORBIDDEN', status: 403 }));
    if (req.path === '/api/health') return next();
    if (req.method === 'GET' && (req.path === '/mobile' || req.path === '/mobile.html' ||
        (req.path === '/' && /Android|iPhone|iPad|Mobile/i.test(req.headers['user-agent'] || '')))) {
        res.cookie('brq_mobile', mobileSession, { httpOnly: true, sameSite: 'strict' });
        return next();
    }
    if (req.method === 'GET' && req.path === '/' && isLocalDashboardHost(req) && req.query.session === dashboardBootstrap) {
        const previous = dashboardBootstrap;
        dashboardBootstrap = crypto.randomBytes(32).toString('hex');
        try { writeDashboardSession(); } catch (error) { dashboardBootstrap = previous; throw error; }
        res.cookie('brq_admin', adminSession, { httpOnly: true, sameSite: 'strict' });
        res.setHeader('Referrer-Policy', 'no-referrer');
        return res.redirect('/');
    }
    if (req.method === 'GET' && req.path === '/' && isLocalDashboardHost(req) && !isAdminRequest(req)) return res.status(403).send('Yönetim panelini masaüstü başlatıcısından veya npm run panel ile açın. Mobil aktarım: /mobile');
    if (req.path === '/api/unity-build-done' && isLocalDashboardHost(req) && !req.headers.origin && req.headers['x-brq-local-session'] === unitySession) return next();
    const transferSurface = req.path === '/api/upload/mobile-to-pc' || req.path === '/api/apks' || req.path.startsWith('/download/');
    if (isAdminRequest(req) || (transferSurface && hasSession(req, 'brq_mobile', mobileSession))) return next();
    if (req.path.startsWith('/api/') || req.path.startsWith('/download/')) return sendApiError(res, Object.assign(new Error('Bu işlem için yerel yönetim panelini açın.'), { code: 'FORBIDDEN', status: 403 }));
    next();
});
app.use(express.json());
app.use((req, res, next) => {
    const controller = new AbortController();
    const cancel = () => { if (!res.writableEnded) controller.abort(); cleanup(); };
    const cleanup = () => { req.off('aborted', cancel); res.off('close', cancel); res.off('finish', cleanup); };
    req.once('aborted', cancel);
    res.once('close', cancel);
    res.once('finish', cleanup);
    requestContext.run({ signal: controller.signal }, next);
});
let activeUploadRequests = 0;
app.use((req, res, next) => {
    if (req.method !== 'POST' || !['/api/upload', '/api/upload/mobile-to-pc'].includes(req.path)) return next();
    if (activeUploadRequests >= 4) return sendApiError(res, Object.assign(new Error('Yükleme sınırı dolu. Devam eden yüklemelerin bitmesini bekleyin.'), { code: 'UPLOAD_BUSY', status: 429 }));
    activeUploadRequests++;
    let finished = false;
    const finish = () => { if (!finished) { finished = true; activeUploadRequests--; } };
    req.once('aborted', finish);
    res.once('finish', finish);
    res.once('close', finish);
    next();
});
// Normalize legacy route errors during the incremental migration.
app.use((req, res, next) => {
    const json = res.json.bind(res);
    res.json = payload => {
        if (payload && payload.error && typeof payload.error === 'string') {
            payload = { ...payload, success: false, operationId: crypto.randomUUID(), error: {
                code: res.statusCode === 409 ? 'DEVICE_BUSY' : 'REQUEST_FAILED', message: payload.error,
                action: 'Ayarları ve bağlantıyı kontrol edip tekrar deneyin.', retryable: res.statusCode >= 500 } };
        }
        return json(payload);
    };
    next();
});

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

// UUID names reserve separate paths for concurrent uploads; incomplete files stay hidden.
function cleanupUploadParts(req) {
    for (const filename of req.uploadParts || []) {
        const remove = attempt => {
            try { fs.unlinkSync(filename); req.uploadParts.delete(filename); }
            catch (error) { if (attempt < 3 && (error.code !== 'ENOENT' || req.aborted)) setTimeout(() => remove(attempt + 1), 100); }
        };
        remove(0);
    }
}
function uploadStorage(directory) {
    return multer.diskStorage({ destination: (req, file, cb) => cb(null, directory),
        filename: (req, file, cb) => {
            if (/^[\x00-\xff]*$/.test(file.originalname)) {
                try { file.originalname = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(file.originalname, 'latin1')); } catch (_) {}
            }
            const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 16);
            const filename = crypto.randomUUID() + ext + '.part';
            if (!req.uploadParts) {
                req.uploadParts = new Set();
                req.once('aborted', () => cleanupUploadParts(req));
            }
            req.uploadParts.add(path.join(directory, filename));
            cb(null, filename);
        } });
}
const upload = multer({ storage: uploadStorage(UPLOADS_DIR), limits: { fileSize: 2000 * 1024 * 1024, files: 1, fields: 4, fieldSize: 1024, parts: 5 } });
const uploadReceived = multer({ storage: uploadStorage(RECEIVED_DIR), limits: { files: 50, fields: 4, fieldSize: 1024, parts: 55 } });

// REST Routes
app.get('/api/health', (req, res) => res.json({ app: 'brq-transfer', version: require('./package.json').version, ready: serverReady, port: PORT }));
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
    res.json(isAdminRequest(req) ? apkList : apkList.map(publicApk));
});

app.get('/api/transfers', (req, res) => {
    res.json(transfersList);
});

// Delete Transfer and associated local file if exists
app.post('/api/transfers/delete', (req, res) => {
    const { id } = req.body;
    const target = transfersList.find(t => String(t.id) === String(id));
    if (target) {
        if (['queued', 'transferring'].includes(target.status)) throw Object.assign(new Error('Devam eden aktarım silinemez. Tamamlanmasını bekleyin.'), { code: 'DEVICE_BUSY', status: 409 });
        if (target.direction === 'mobile-to-pc') {
            const filePath = target.localPath || path.join(RECEIVED_DIR, target.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(transferFileById(target.id));
            }
        }
        transfersList = transfersList.filter(t => String(t.id) !== String(id));
        saveTransfers();
        broadcast({ type: 'TRANSFERS_UPDATED', transfers: transfersList });
    }
    res.json({ success: true, transfers: transfersList });
});

const uploadRequests = new Map();
const transferRetries = new Set();

async function pushTransferWithProgress(record) {
    const totalBytes = record.rawSize ?? fs.statSync(record.localPath).size;
    let active = true;
    let reading = false;
    const remotePath = "'" + record.remotePath.replace(/'/g, "'\\''") + "'";
    const timer = setInterval(async () => {
        if (!active || reading || totalBytes <= 0) return;
        reading = true;
        try {
            const output = await runAdbCommand(['-s', record.deviceId, 'shell',
                `stat -c %s ${remotePath} 2>/dev/null`], 2000);
            if (!active || !/^\d+$/.test(output)) return;
            const progress = Math.min(99, Math.floor(Number(output) * 100 / totalBytes));
            if (progress > record.progress) {
                record.progress = progress;
                broadcast({ type: 'TRANSFER_PROGRESS', id: record.id, operationId: record.operationId, progress });
            }
        } catch (_) { /* Size queries must not interrupt the file transfer. */ }
        finally { reading = false; }
    }, 1000);
    try {
        await runAdbCommand(['-s', record.deviceId, 'push', record.localPath, record.remotePath], { timeout: 15 * 60 * 1000 });
    } finally {
        active = false;
        clearInterval(timer);
    }
}

function enqueueTransfer(record) {
    const fail = error => {
        record.status = 'error';
        record.error = error.message;
        try { saveTransfers(); } catch (_) { record.error = 'Aktarım sonucu diske kaydedilemedi. Dosya PC’de korunuyor.'; }
        broadcast({ type: 'TRANSFER_FAILED', operationId: record.operationId, transfer: record, transfers: transfersList });
    };
    runDeviceDataOperation(record.deviceId, async () => {
        if (record.phoneSerial && normalizePhoneSerial(await runAdbCommand(['-s', record.deviceId, 'shell', 'getprop', 'ro.serialno'], 3000)) !== record.phoneSerial) {
            throw Object.assign(new Error('Telefon kimliği değişti. Doğru telefonu bağlayıp yeniden deneyin.'), { code: 'DEVICE_IDENTITY_CHANGED', status: 409 });
        }
        record.status = 'transferring';
        record.progress = 0;
        saveTransfers();
        broadcast({ type: 'TRANSFERS_UPDATED', transfers: transfersList });
        await pushTransferWithProgress(record);
        record.status = 'transferred';
        record.progress = 100;
        saveTransfers();
        broadcast({ type: 'TRANSFER_COMPLETED', operationId: record.operationId, transfer: record, transfers: transfersList });
    }).catch(fail);
}

app.post('/api/transfers/retry', async (req, res) => {
    const record = transfersList.find(item => String(item.id) === String(req.body.id));
    if (!record || record.direction !== 'pc-to-phone') throw Object.assign(new Error('Gönderilecek kayıt bulunamadı.'), { status: 404 });
    if (transferRetries.has(record.id) || ['queued', 'transferring'].includes(record.status)) return res.status(202).json({ success: true, transfer: record });
    transferRetries.add(record.id);
    try {
        if (!record.phoneSerial) throw Object.assign(new Error('Eski kaydın telefon kimliği eksik. Doğru telefonu seçip dosyayı yeniden yükleyin.'), { status: 409 });
        transferFileById(record.id);
        await resolveTargetDevice(record.deviceId);
        const serial = normalizePhoneSerial(await runAdbCommand(['-s', record.deviceId, 'shell', 'getprop', 'ro.serialno'], 3000));
        if (serial !== record.phoneSerial) throw Object.assign(new Error('Bu bağlantı başka telefona ait. Önce özgün telefonu bağlayın.'), { code: 'DEVICE_IDENTITY_CHANGED', status: 409 });
        requireTransferCapacity();
        const previous = { ...record };
        record.status = 'queued';
        record.progress = 0;
        record.operationId = crypto.randomUUID();
        delete record.error;
        try { saveTransfers(); } catch (error) { Object.assign(record, previous); throw error; }
        broadcast({ type: 'TRANSFERS_UPDATED', transfers: transfersList });
        res.status(202).json({ success: true, transfer: record });
        enqueueTransfer(record);
    } finally { transferRetries.delete(record.id); }
});
function finalizeUpload(file) {
    if (file.path.endsWith('.part')) {
        const finalPath = file.path.slice(0, -5);
        fs.renameSync(file.path, finalPath);
        file.path = finalPath;
        file.filename = path.basename(finalPath);
    }
    return file;
}

// PC to Phone Upload & Push
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
    const requestId = req.body.requestId;
    if (requestId && (typeof requestId !== 'string' || requestId.length > 128)) throw Object.assign(new Error('Geçersiz istek kimliği.'), { status: 400 });
    if (requestId && uploadRequests.has(requestId)) {
        try { fs.unlinkSync(file.path); } catch (_) {}
        const previous = uploadRequests.get(requestId);
        return res.status(202).json(previous.pending ? { success: true, operationId: previous.operationId, status: 'queued' } : previous);
    }
    const operationId = crypto.randomUUID();
    if (requestId) {
        if (uploadRequests.size >= 1000) {
            const expired = [...uploadRequests].find(([, value]) => !value.pending);
            if (!expired) throw Object.assign(new Error('Yükleme kuyruğu dolu. Bekleyip tekrar deneyin.'), { code: 'DEVICE_BUSY', status: 409 });
            uploadRequests.delete(expired[0]);
        }
        uploadRequests.set(requestId, { pending: true, operationId });
    }
    const requestedTarget = Object.prototype.hasOwnProperty.call(req.body, 'deviceId') ? req.body.deviceId : config.selectedAdbDevice;
    const target = requestedTarget ? await resolveTargetDevice(requestedTarget) : '';
    const phoneSerial = target ? normalizePhoneSerial(await runAdbCommand(['-s', target, 'shell', 'getprop', 'ro.serialno'], 3000)) : '';
    if (target) requireTransferCapacity();
    finalizeUpload(file);
    const meta = getTargetAndroidDir(file.originalname);
    const safeName = path.basename(file.originalname).replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/[. ]+$/, '') || 'file';
    const remotePath = meta.dir + '/' + operationId + '-' + safeName;
    const record = { id: operationId, operationId, filename: file.originalname, originalName: file.originalname,
        size: formatBytes(file.size), rawSize: file.size, category: meta.category, direction: 'pc-to-phone',
        localPath: file.path, remotePath, targetDir: meta.dir, deviceId: target, phoneSerial,
        timestamp: new Date().toLocaleTimeString(), status: target ? 'queued' : 'saved', progress: 0 };
    transfersList.unshift(record);
    saveTransfers();
    // APK metadata extraction can take seconds; it must not delay the phone push.
    broadcast({ type: target ? 'TRANSFERS_UPDATED' : 'TRANSFER_SAVED', transfer: record, transfers: transfersList });
    if (target) enqueueTransfer(record);
    const isApk = path.extname(file.originalname).toLowerCase() === '.apk';
    const registeredApk = isApk ? await registerApk(file.path, 'drag-drop', file.originalname) : null;
    const result = { success: true, operationId, status: record.status, isApk, apk: registeredApk, transfer: record };
    if (requestId) {
        uploadRequests.set(requestId, result);
        if (uploadRequests.size > 1000) uploadRequests.delete(uploadRequests.keys().next().value);
    }
    res.status(target ? 202 : 200).json(result);
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
            finalizeUpload(file);
            const ext = path.extname(file.filename).toLowerCase();
            let category = 'document';
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif'].includes(ext)) category = 'image';
            else if (['.mp4', '.mkv', '.mov', '.avi', '.webm', '.3gp'].includes(ext)) category = 'video';
            else if (['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'].includes(ext)) category = 'audio';
            else if (ext === '.apk') category = 'apk';

            if (ext === '.apk') {
                registerApk(file.path, 'mobile-upload', file.originalname).catch(() => {});
            }

            const record = {
                id: crypto.randomUUID(),
                filename: file.originalname,
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

        res.json({ success: true, count: savedRecords.length, files: savedRecords.map(({ localPath, ...record }) => record) });
    } catch (err) {
        sendApiError(res, err);
    }
});

function transferFileById(id) {
    const record = transfersList.find(item => String(item.id) === String(id));
    if (!record?.localPath || !fs.existsSync(record.localPath)) throw Object.assign(new Error('Kayıtlı dosya bulunamadı.'), { status: 404 });
    const resolved = fs.realpathSync(record.localPath);
    if (![RECEIVED_DIR, UPLOADS_DIR].some(root => path.resolve(resolved).startsWith(path.resolve(root) + path.sep))) throw Object.assign(new Error('Dosya erişimi reddedildi.'), { status: 403 });
    return resolved;
}
function openInExplorer(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('explorer.exe', args, { windowsHide: false });
        proc.once('error', () => reject(new Error('Dosya açılamadı. Dosya erişimini kontrol edin.')));
        proc.once('spawn', resolve);
    });
}
app.post('/api/transfers/open', async (req, res) => {
    await openInExplorer([transferFileById(req.body.id)]);
    res.json({ success: true });
});
app.post('/api/transfers/open-folder', async (req, res) => {
    const args = req.body.id ? ['/select,', transferFileById(req.body.id)] : [RECEIVED_DIR];
    await openInExplorer(args);
    res.json({ success: true });
});

app.post('/api/adb/pull-latest-screenshot', async (req, res) => {
    const target = await resolveTargetDevice(req.body.deviceId || config.selectedAdbDevice);
    const output = await runAdbCommand(['-s', target, 'shell', 'ls -1t /sdcard/DCIM/Screenshots/* /sdcard/Pictures/Screenshots/* 2>/dev/null | head -n 1']);
    const phonePath = output.split(/\r?\n/)[0];
    if (!/^\/sdcard\/(DCIM|Pictures)\/Screenshots\/[^/]+\.(png|jpg|jpeg|webp)$/i.test(phonePath)) throw Object.assign(new Error('Kayıtlı ekran görüntüsü bulunamadı. Telefonda ekran görüntüsü alıp tekrar deneyin.'), { status: 404 });
    const filename = crypto.randomUUID() + path.extname(phonePath).toLowerCase();
    const localPath = path.join(RECEIVED_DIR, filename);
    const temporary = localPath + '.part';
    try {
        await runAdbCommand(['-s', target, 'pull', phonePath, temporary], { timeout: 120000 });
        const stats = fs.statSync(temporary);
        if (!stats.size) throw new Error('Ekran görüntüsü boş.');
        fs.renameSync(temporary, localPath);
        const record = { id: crypto.randomUUID(), filename: path.basename(phonePath), originalName: path.basename(phonePath),
            size: formatBytes(stats.size), rawSize: stats.size, category: 'image', direction: 'mobile-to-pc', localPath,
            timestamp: new Date().toLocaleTimeString(), status: 'transferred' };
        transfersList.unshift(record);
        saveTransfers();
        broadcast({ type: 'FILE_RECEIVED_FROM_PHONE', transfers: [record], allTransfers: transfersList });
        res.json({ success: true, transfer: record });
    } catch (error) { try { fs.unlinkSync(temporary); } catch (_) {} throw error; }
});

app.post('/api/config', async (req, res) => {
    const patch = validateConfig(req.body);
    const { watchFolder, autoInstallOnAdb, autoLaunchAfterInstall, selectedAdbDevice, selectedIp, language } = patch;
    if (watchFolder && watchFolder !== config.watchFolder) {
        if (fs.existsSync(watchFolder) && fs.statSync(watchFolder).isDirectory()) {
            fs.accessSync(watchFolder, fs.constants.R_OK);
            config.watchFolder = watchFolder;

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
    if (selectedAdbDevice !== undefined) deviceSelectionVersion++;
    if (selectedAdbDevice !== undefined && activeClipboardDevice && activeClipboardDevice !== selectedAdbDevice) await setClipboardMode('off');
    if (watchFolder) await setupWatcher(watchFolder);
    
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
app.post('/api/adb/open-mobile-web', async (req, res) => {
    const target = await resolveTargetDevice(req.body.deviceId || config.selectedAdbDevice);
    await runAdbCommand(['-s', target, 'reverse', 'tcp:' + PORT, 'tcp:' + PORT]);
    await runAdbCommand(['-s', target, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'http://localhost:' + PORT + '/mobile']);
    res.json({ success: true });
});

app.get('/api/adb/devices', async (req, res) => {
    try {
        res.json(await getAdbDevices(true));
    } catch (e) {
        res.status(503).json({ error: e.message });
    }
});

// Start/Get ADB Pairing QR Code
app.get('/api/adb/pairing-services', async (req, res) => {
    try {
        const services = await discoverAdbServices();
        res.json({ success: true, services: codePairingServices(services) });
    } catch (e) {
        res.status(503).json({ success: false, error: 'ADB ağ keşfi çalışmıyor. Platform-Tools ve ağ bağlantısını kontrol edin.' });
    }
});

app.get('/api/adb/wireless-phones', async (req, res) => {
    try {
        res.json({ success: true, services: await describeWirelessPhones(await discoverAdbServices()) });
    } catch (e) {
        res.status(503).json({ success: false, error: 'Telefon keşfi çalışmıyor. ADB ve ağ bağlantısını kontrol edin.' });
    }
});

app.get('/api/adb/known-devices', (req, res) => {
    res.json({ success: true, devices: config.knownWirelessDevices || [] });
});

app.post('/api/adb/forget', async (req, res) => {
    if (wirelessLifecycleBusy() || pairingInProgress) {
        return res.status(409).json({ error: 'ADB işlemi devam ediyor. Lütfen tekrar deneyin.' });
    }
    const { serviceName, all } = req.body;
    if (all !== true && (typeof serviceName !== 'string' || !serviceName)) {
        return res.status(400).json({ error: 'Silinecek telefonu seçin.' });
    }
    const targets = (config.knownWirelessDevices || []).filter(known => all === true || known.serviceName === serviceName || known.phoneId === serviceName);
    if (!targets.length && all !== true) return res.status(404).json({ error: 'Kayıtlı telefon bulunamadı.' });
    forgettingWirelessDevices = true;
    adbDeviceMutationVersion++;
    try {
        if (currentPairingSession) {
            currentPairingSession.cancelled = true;
            currentPairingSession = null;
            broadcast({ type: 'ADB_PAIR_STATUS', session: null });
        }
        let services = discoveredAdbServices;
        try { services = await discoverAdbServices(); } catch (e) {}
        const before = (await getAdbDevices(true)).flatMap(device => device.transports ? device.transports.map(transport => ({ ...device, ...transport })) : [device]);
        const targetIds = new Set();
        for (const device of before) {
            if (!device.id.includes(':') && !device.id.includes('._adb-tls-connect._tcp')) continue;
            const advertised = services.find(service => deviceMatchesService(device.id, service));
            if (advertised) {
                if (targets.some(known => isKnownWirelessService(advertised, known))) targetIds.add(device.id);
                continue;
            }
            if (device.state !== 'device') {
                if (targets.some(known => known.deviceId === device.id)) targetIds.add(device.id);
                continue;
            }
            // Addresses can be reassigned; never disconnect a phone just because its IP matches an old record.
            const serial = await runAdbCommand(['-s', device.id, 'shell', 'getprop', 'ro.serialno'], 3000);
            if (!serial) throw new Error('Bağlı telefonun kimliği doğrulanamadı. Silmek için tekrar deneyin.');
            if (targets.some(known => known.serial === serial)) targetIds.add(device.id);
            else if (targets.some(known => !known.serial && known.deviceId === device.id)) {
                throw new Error('Kayıtlı telefonun kimliği eksik. Telefon açıkken yeniden bağlanıp silmeyi deneyin.');
            }
        }
        const matches = id => targetIds.has(id) || services.some(service =>
            targets.some(known => isKnownWirelessService(service, known)) && deviceMatchesService(id, service));
        const failures = [];
        for (const device of before.filter(device => matches(device.id))) {
            try {
                const output = await runAdbCommand(['disconnect', device.id]);
                if (/^(error|failed|cannot)\b/im.test(output)) failures.push(output);
            } catch (e) { failures.push(e.message); }
        }
        let devices = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            devices = await getAdbDevices(true);
            if (!devices.some(device => matches(device.id))) break;
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250));
        }
        if (failures.length || devices.some(device => matches(device.id))) {
            return res.status(502).json({ error: failures[0] || 'Telefonun bağlantısı kesilemedi. Silmek için tekrar deneyin.' });
        }
        const forgotten = config.forgottenWirelessDevices || [];
        for (const known of targets) {
            const service = services.find(service => isKnownWirelessService(service, known));
            const endpoint = known.deviceId?.match(/^(?:\[([^\]]+)\]|([^:]+)):\d+$/);
            const record = { serviceName: known.serviceName, serial: known.serial || '', deviceId: known.deviceId || '',
                ip: service?.ip || known.ip || (endpoint && (endpoint[1] || endpoint[2])) || '' };
            const index = forgotten.findIndex(entry => (known.serviceName && entry.serviceName === known.serviceName) || (known.serial && entry.serial === known.serial));
            if (index >= 0) forgotten[index] = record;
            else forgotten.push(record);
            pausedWirelessDevices.add(known.serviceName);
            if (known.serial) pausedWirelessDevices.add(known.serial);
        }
        config.forgottenWirelessDevices = forgotten;
        config.knownWirelessDevices = (config.knownWirelessDevices || []).filter(known => !targets.includes(known));
        if (matches(config.selectedAdbDevice) || targets.some(known => known.deviceId === config.selectedAdbDevice)) config.selectedAdbDevice = '';
        if (matches(lastDetectedConnectedIp)) lastDetectedConnectedIp = '';
        if (activeClipboardDevice && matches(activeClipboardDevice)) setClipboardMode('off');
        wirelessPhoneIdentityCache.clear();
        saveConfig();
        broadcast({ type: 'CONFIG_UPDATED', config });
        broadcast({ type: 'DEVICES_UPDATED', devices });
        res.json({ success: true, knownDevices: config.knownWirelessDevices, devices,
            selectedAdbDevice: config.selectedAdbDevice });
    } catch (e) {
        sendApiError(res, e);
    } finally {
        forgettingWirelessDevices = false;
        adbDeviceMutationVersion++;
    }
});

app.post('/api/adb/pairing-cancel', (req, res) => {
    if (currentPairingSession) currentPairingSession.cancelled = true;
    res.json({ success: true });
});

app.get('/api/adb/pairing-qr', async (req, res) => {
    if (wirelessLifecycleBusy()) return res.status(409).json({ error: 'ADB işlemi devam ediyor. Lütfen tekrar deneyin.' });
    if (pairingInProgress) return res.status(409).json({ error: 'Eşleştirme devam ediyor. Lütfen bekleyin.' });
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
        sendApiError(res, e);
    }
});

app.get('/api/adb/pairing-status', (req, res) => {
    if (!currentPairingSession || currentPairingSession.cancelled) {
        return res.json({ active: false });
    }
    res.json({
        active: true,
        status: currentPairingSession.status,
        pairedIp: currentPairingSession.pairedIp,
        message: currentPairingSession.message
    });
});

app.post('/api/adb/tcpip', async (req, res) => {
    const port = Number(req.body.port || 5555);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return res.status(400).json({ error: 'Geçersiz port' });
    const target = await resolveTargetDevice(req.body.deviceId || config.selectedAdbDevice);
    await runAdbCommand(['-s', target, 'tcpip', String(port)]);
    res.json({ success: true, message: 'Kablosuz mod etkinleştirildi.' });
});

app.post('/api/adb/connect', async (req, res) => {
    let { ip, port } = req.body;
    const { serviceName } = req.body;
    let selectedService;
    if (!ip && !serviceName) return res.status(400).json({ error: 'IP adresi gerekli' });
    if (wirelessLifecycleBusy()) return res.status(409).json({ error: 'ADB işlemi devam ediyor. Lütfen tekrar deneyin.' });
    if (pairingInProgress) return res.status(409).json({ error: 'Eşleştirme devam ediyor. Lütfen bekleyin.' });
    wirelessConnectInProgress = true;
    const operationVersion = adbDeviceMutationVersion;
    const selectionVersion = deviceSelectionVersion;
    try {
        if (serviceName) {
            const service = wirelessPhoneServices(await discoverAdbServices()).find(s => s.name === serviceName);
            if (!service) return res.status(409).json({ error: 'Telefon artık bulunamıyor. Listeyi yenileyin.' });
            selectedService = service;
            if (service.type === '_adb-tls-pairing._tcp') {
                return res.json({ success: false, needsPairing: true });
            }
            ip = service.ip;
            port = service.port;
        }
        const result = await adbConnect(ip, port || 5555);
        await new Promise(r => setTimeout(r, 500));
        const devices = await getAdbDevices(true);
        let services = [];
        try { services = await discoverAdbServices(); } catch (e) {}
        const deviceId = await findConnectedDevice(ip, services);
        const connected = devices.find(d => (d.id === deviceId || d.transports?.some(t => t.id === deviceId)) && d.state === 'device');
        if (!connected && serviceName) {
            const output = await runAdbCommand(['devices']);
            const unauthorized = output.split(/\r?\n/).some(line => {
                const [id, state] = line.trim().split(/\s+/);
                return state === 'unauthorized' && (id === adbEndpoint(ip, port) ||
                    services.some(s => s.ip === ip && s.type !== '_adb-tls-pairing._tcp' && deviceMatchesService(id, s)));
            });
            if (unauthorized) return res.json({ success: false, needsPairing: true });
        }
        if (!connected) throw new Error('Cihaz bağlantısı doğrulanamadı. IP ve bağlantı portunu kontrol edin.');
        if (operationVersion !== adbDeviceMutationVersion) throw new Error('Bağlantı işlemi güncel değil. Seçiminizi tekrar kontrol edin.');
        if (connected) {
            if (selectionVersion === deviceSelectionVersion) config.selectedAdbDevice = connected.id;
            saveConfig();
            await rememberWirelessDevice(connected.id, services);
            if (currentPairingSession?.pairedIp === ip && currentPairingSession.status === 'paired_need_port') {
                currentPairingSession.status = 'connected';
                publishPairingStatus(currentPairingSession);
            }
        }
        broadcast({ type: 'CONFIG_UPDATED', config });
        broadcast({ type: 'DEVICES_UPDATED', devices });
        res.json({ success: true, result, devices });
    } catch (e) {
        if (/authenticat|unauthorized|pairing required/i.test(e.message)) {
            return res.json({ success: false, needsPairing: true, reason: 'authorization_required' });
        }
        if (selectedService?.type === '_adb-tls-connect._tcp') {
            // ADB also uses generic connection errors after the phone forgets this host.
            // Offer pairing without claiming that a network failure proves revoked authorization.
            discoveryExpiresAt = 0;
            return res.json({ success: false, needsPairing: true, reason: 'connection_failed' });
        }
        sendApiError(res, e);
    } finally {
        wirelessConnectInProgress = false;
    }
});

// Disconnect a wireless phone and all of its active transport aliases.
app.post('/api/adb/disconnect', async (req, res) => {
    if (forgettingWirelessDevices || wirelessDisconnectInProgress) return res.status(409).json({ error: 'Telefon işlemi sürüyor. Tamamlanmasını bekleyin.' });
    const { deviceId } = req.body;
    if (typeof deviceId !== 'string' || !/^[a-zA-Z0-9.:[\]_-]+$/.test(deviceId)) {
        return res.status(400).json({ error: 'Geçersiz cihaz ID' });
    }
    wirelessDisconnectInProgress = true;
    adbDeviceMutationVersion++;
    if (currentPairingSession) currentPairingSession.cancelled = true;
    try {
        let services = discoveredAdbServices;
        try { services = await discoverAdbServices(); } catch (e) {}
        const devicesBefore = (await getAdbDevices(true)).flatMap(device => device.transports ? device.transports.map(transport => ({ ...device, ...transport })) : [device]);
        const target = devicesBefore.find(device => device.id === deviceId);
        const known = (config.knownWirelessDevices || []).find(device => device.deviceId === deviceId ||
            device.serviceName === deviceId || deviceId.replace(/\.$/, '') === device.serviceName + '._adb-tls-connect._tcp' ||
            services.some(service => deviceMatchesService(deviceId, service) && isKnownWirelessService(service, device)));
        const service = services.find(service => deviceMatchesService(deviceId, service)) ||
            services.find(service => known && isKnownWirelessService(service, known));
        const endpoint = deviceId.match(/^(?:\[([^\]]+)\]|([^:]+)):(\d+)$/);
        const ip = service?.ip || (endpoint && (endpoint[1] || endpoint[2]));
        if (!ip && !known && !deviceId.includes('._adb-tls-connect._tcp')) {
            return res.status(400).json({ error: target ? 'USB bağlantısını kesmek için kabloyu çıkarın.' : 'Kablosuz cihaz bulunamadı.' });
        }
        const relatedServices = services.filter(candidate => candidate.ip === ip ||
            (known && isKnownWirelessService(candidate, known)));
        const matchesTarget = id => typeof id === 'string' && (id === deviceId || (known && id === known.deviceId) ||
            relatedServices.some(candidate => deviceMatchesService(id, candidate)) ||
            (ip && id.startsWith((net.isIP(ip) === 6 ? '[' + ip + ']' : ip) + ':')));
        if (ip) pausedWirelessDevices.add(ip);
        for (const candidate of relatedServices) pausedWirelessDevices.add(candidate.name);
        for (const entry of (config.knownWirelessDevices || []).filter(entry => entry === known ||
            matchesTarget(entry.deviceId || '') || relatedServices.some(candidate => isKnownWirelessService(candidate, entry)))) {
            entry.autoReconnect = false;
            pausedWirelessDevices.add(entry.serviceName);
            if (entry.serial) pausedWirelessDevices.add(entry.serial);
        }
        saveConfig();
        if (currentPairingSession && (currentPairingSession.pairedIp === ip || currentPairingSession.status === 'waiting_for_scan')) {
            currentPairingSession.cancelled = true;
            currentPairingSession = null;
            broadcast({ type: 'ADB_PAIR_STATUS', session: null });
        }
        const aliases = new Set(devicesBefore.filter(device => matchesTarget(device.id)).map(device => device.id));
        const failures = [];
        for (const alias of aliases) {
            try {
                const output = await runAdbCommand(['disconnect', alias]);
                if (/^(error|failed|cannot)\b/im.test(output)) failures.push(output);
            } catch (e) { failures.push(e.message); }
        }
        let devices = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            devices = await getAdbDevices(true);
            if (!devices.some(device => matchesTarget(device.id) || device.transports?.some(transport => matchesTarget(transport.id)))) break;
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250));
        }
        if (failures.length || devices.some(device => matchesTarget(device.id))) {
            return res.status(502).json({ success: false, error: failures[0] || 'ADB bağlantıyı kesemedi. Cihaz hâlâ listede; tekrar deneyin.', devices });
        }
        if (matchesTarget(config.selectedAdbDevice)) {
            config.selectedAdbDevice = '';
        }
        if (matchesTarget(lastDetectedConnectedIp)) lastDetectedConnectedIp = '';
        if (matchesTarget(activeClipboardDevice)) setClipboardMode('off');
        saveConfig();
        broadcast({ type: 'CONFIG_UPDATED', config });
        broadcast({ type: 'DEVICES_UPDATED', devices });
        res.json({ success: true, devices, selectedAdbDevice: config.selectedAdbDevice });
    } catch (e) {
        sendApiError(res, e);
    } finally {
        wirelessDisconnectInProgress = false;
        adbDeviceMutationVersion++;
    }
});

app.post('/api/adb/pair', async (req, res) => {
    const { ip, port, code, serviceName } = req.body;
    if (!/^\d{6}$/.test(String(code))) return res.status(400).json({ error: '6 haneli eşleşme kodunu girin.' });
    if (wirelessLifecycleBusy()) return res.status(409).json({ error: 'ADB işlemi devam ediyor. Lütfen tekrar deneyin.' });
    if (pairingInProgress) return res.status(409).json({ error: 'Eşleştirme devam ediyor. Lütfen bekleyin.' });
    pairingInProgress = true;
    if (currentPairingSession) currentPairingSession.cancelled = true;
    const session = { mode: 'code', status: 'pairing', pairedIp: '', cancelled: false, selectionVersion: deviceSelectionVersion };
    currentPairingSession = session;
    try {
        let service;
        if (ip || port) {
            if (!isValidAdbAddress(ip, port)) throw Object.assign(new Error('Geçerli eşleşme IP adresini ve portunu girin.'), { code: 'INVALID_PAIRING', status: 400 });
            service = { ip, port: Number(port) };
        } else {
            const discovered = await discoverAdbServices();
            const selected = discovered.find(s => s.name === serviceName);
            const services = codePairingServices(discovered);
            const matches = services.filter(s => !serviceName || s.name === serviceName || (selected && s.ip === selected.ip));
            if (matches.length !== 1) {
                session.status = 'error';
                publishPairingStatus(session);
                return res.status(409).json({ error: matches.length ? 'Birden fazla telefon bulundu. Telefonunuzu seçin.' :
                    'Telefon bulunamadı. Telefonda eşleşme kodu ekranını açık tutun veya manuel adresi kullanın.' });
            }
            service = matches[0];
        }
        session.pairedIp = service.ip;
        publishPairingStatus(session);
        await adbPair(service.ip, service.port, code);
        await completeAdbPairing(session, service);
        res.json({ success: true, session: publicPairingSession(session) });
    } catch (e) {
        session.status = 'error';
        publishPairingStatus(session);
        sendApiError(res, e);
    } finally {
        pairingInProgress = false;
    }
});

app.post('/api/adb/install', async (req, res) => {
    const { deviceId, apkId } = req.body;
    const targetApk = apkList.find(a => a.id === apkId);
    if (!targetApk) return res.status(404).json({ error: 'APK bulunamadı' });

    const result = await installApkViaAdb(deviceId, targetApk.filePath, targetApk);
    res.json({ ...result, message: 'Kurulum tamamlandı.' });
});

app.post('/api/adb/launch', async (req, res) => {
    const { deviceId, packageName } = req.body;
    if (!packageName || !/^[a-zA-Z0-9._-]+$/.test(packageName)) {
        return res.status(400).json({ error: 'Geçersiz paket adı' });
    }
    const result = await launchAppViaAdb(deviceId, packageName);
    res.json(result);
});

for (const action of ['stop', 'uninstall']) {
    app.post('/api/adb/' + action, async (req, res) => {
        const { deviceId, packageName } = req.body;
        if (!/^[a-zA-Z0-9._-]+$/.test(packageName || '')) return res.status(400).json({ error: 'Geçersiz paket adı' });
        const target = await resolveTargetDevice(deviceId || config.selectedAdbDevice);
        const command = action === 'stop' ? ['shell', 'am', 'force-stop', packageName] : ['uninstall', packageName];
        const output = await runAdbCommand(['-s', target, ...command], { timeout: 120000 });
        res.json({ success: true, output });
    });
}

const handleRemoteKey = async (req, res) => {
    const { deviceId, code, keyCode } = req.body;
    const key = keyCode ?? code;
    if (!Number.isInteger(Number(key)) || Number(key) < 0 || Number(key) > 300) return res.status(400).json({ error: 'Geçersiz keycode' });
    const target = await resolveTargetDevice(deviceId || config.selectedAdbDevice);
    await runAdbCommand(['-s', target, 'shell', 'input', 'keyevent', String(key)]);
    res.json({ success: true });
};
app.post('/api/adb/key', handleRemoteKey);
app.post('/api/adb/keyevent', handleRemoteKey);

app.post('/api/adb/touch', async (req, res) => {
    const { deviceId, type, x, y, x2, y2 } = req.body;
    if (!['tap', 'swipe'].includes(type)) return res.status(400).json({ error: 'Geçersiz işlem' });
    const coordinates = (type === 'tap' ? [x, y] : [x, y, x2, y2]).map(Number);
    if (coordinates.some(value => !Number.isFinite(value) || value < 0 || value > 100000)) return res.status(400).json({ error: 'Geçersiz koordinat' });
    const target = await resolveTargetDevice(deviceId || config.selectedAdbDevice);
    await runAdbCommand(['-s', target, 'shell', 'input', type, ...coordinates.map(value => String(Math.round(value))), ...(type === 'swipe' ? ['150'] : [])]);
    res.json({ success: true });
});

app.get('/api/adb/display-size', async (req, res) => {
    const target = await resolveTargetDevice(req.query.deviceId || config.selectedAdbDevice);
    const output = await runAdbCommand(['-s', target, 'shell', 'wm', 'size']);
    const match = output.match(/Override size:\s*(\d+)x(\d+)/) || output.match(/Physical size:\s*(\d+)x(\d+)/);
    if (!match) throw new Error('Ekran boyutu okunamadı');
    res.json({ width: Number(match[1]), height: Number(match[2]) });
});

app.get('/api/adb/screenshot', async (req, res) => {
    const target = await resolveTargetDevice(req.query.deviceId || config.selectedAdbDevice);
    const data = await runAdbCommand(['-s', target, 'exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 });
    if (!Buffer.isBuffer(data) || data.length < 33 || !data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
        data.toString('ascii', 12, 16) !== 'IHDR' || !data.readUInt32BE(16) || !data.readUInt32BE(20) ||
        data.readUInt32BE(16) > 16384 || data.readUInt32BE(20) > 16384) throw Object.assign(new Error('Geçerli ekran görüntüsü alınamadı. Telefon bağlantısını kontrol edip yeniden deneyin.'), { code: 'SCREENSHOT_INVALID', status: 502 });
    res.setHeader('Cache-Control', 'no-store');
    res.type('png').send(data);
});

// Scrcpy 60 FPS Hardware-Accelerated Mirroring
const SCRCPY_DIR = path.join(BASE_DIR, 'tools', 'scrcpy');
const SCRCPY_BIN = path.join(SCRCPY_DIR, 'scrcpy.exe');
let activeScrcpyProcess = null;

function stopScrcpy() {
    const proc = activeScrcpyProcess;
    activeScrcpyProcess = null;
    proc?.kill();
    broadcast({ type: 'SCRCPY_STATUS', running: false });
}

app.post('/api/adb/scrcpy/start', async (req, res) => {
    const target = await resolveTargetDevice(req.body.deviceId || config.selectedAdbDevice);
    if (!fs.existsSync(SCRCPY_BIN)) throw Object.assign(new Error('Ekran yansıtma için scrcpy bulunamadı. tools/scrcpy dizinine aracı yerleştirin.'), { code: 'TOOL_MISSING', status: 503 });
    if (activeScrcpyProcess) throw Object.assign(new Error('Ekran yansıtma zaten açık. Önce mevcut pencereyi kapatın.'), { code: 'DEVICE_BUSY', status: 409 });
    const proc = spawn(SCRCPY_BIN, ['-s', target, '--window-title', 'BRQ Transfer'], { cwd: SCRCPY_DIR, windowsHide: false });
    activeScrcpyProcess = proc;
    proc.stderr?.on('data', () => {});
    proc.on('close', () => { if (activeScrcpyProcess === proc) { activeScrcpyProcess = null; broadcast({ type: 'SCRCPY_STATUS', running: false }); } });
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { if (activeScrcpyProcess === proc) stopScrcpy(); reject(new Error('scrcpy başlatma zaman aşımı.')); }, 10000);
        proc.once('spawn', () => { clearTimeout(timer); resolve(); });
        proc.on('error', () => { clearTimeout(timer); if (activeScrcpyProcess === proc) activeScrcpyProcess = null;
            reject(Object.assign(new Error('scrcpy başlatılamadı. Araç yolunu kontrol edin.'), { code: 'TOOL_MISSING', status: 503 })); });
    });
    broadcast({ type: 'SCRCPY_STATUS', running: true });
    res.json({ success: true, message: 'Ekran penceresi başlatıldı.' });
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

let clipboardGeneration = 0;
let clipboardRequestVersion = 0;
let clipboardSession = null;
const clipJarReady = new Map();
async function ensureClipJar(deviceId) {
    if (!fs.existsSync(CLIP_JAR_PATH)) return false;
    try {
        const serial = normalizePhoneSerial(await runAdbCommand(['-s', deviceId, 'shell', 'getprop', 'ro.serialno'], 3000));
        const cached = clipJarReady.get(deviceId);
        if (serial && cached?.serial === serial && cached.expiresAt > Date.now()) return true;
        await runAdbCommand(['-s', deviceId, 'push', CLIP_JAR_PATH, '/data/local/tmp/clip.jar'], 30000);
        if (clipJarReady.size >= 100) clipJarReady.clear();
        if (serial) clipJarReady.set(deviceId, { serial, expiresAt: Date.now() + 60000 });
        return true;
    } catch (_) { clipJarReady.delete(deviceId); return false; }
}
function stopAllClipboardProcesses() {
    clipboardGeneration++;
    const session = clipboardSession;
    clipboardSession = null;
    clipJarReady.clear();
    clearTimeout(session?.retry);
    const processes = [activeClipWatchProcess, activeClipboardProcess];
    activeClipWatchProcess = null;
    activeClipboardProcess = null;
    currentClipboardMode = 'off';
    activeClipboardDevice = null;
    for (const proc of processes) { try { proc?.kill(); } catch (_) {} }
}
async function sendClipboardValue(target, b64) {
    if (typeof b64 !== 'string' || !b64 || b64.length > 87384 ||
        Buffer.from(b64, 'base64').toString('base64') !== b64 || Buffer.from(b64, 'base64').length > 65536) {
        throw Object.assign(new Error('Pano metni geçersiz veya 64 KiB sınırını aşıyor. Daha büyük metni dosya olarak aktarın.'), { code: 'CLIPBOARD_TOO_LARGE', status: 400 });
    }
    await resolveTargetDevice(target);
    if (b64.length <= 5464) {
        await runAdbCommand(['-s', target, 'shell', 'CLASSPATH=/data/local/tmp/clip.jar app_process / com.brq.Clip set-b64 ' + b64]);
        return;
    }
    const id = crypto.randomUUID();
    const local = path.join(UPLOADS_DIR, '.clip-' + id + '.tmp');
    const remote = '/data/local/tmp/brq-clip-' + id + '.txt';
    try {
        fs.writeFileSync(local, b64, { encoding: 'ascii', flag: 'wx', mode: 0o600 });
        await runAdbCommand(['-s', target, 'push', local, remote], 30000);
        await runAdbCommand(['-s', target, 'shell', `CLASSPATH=/data/local/tmp/clip.jar app_process / com.brq.Clip set-b64 "$(cat ${remote})"`]);
    } finally {
        try { fs.unlinkSync(local); } catch (_) {}
        try { await runAdbCommand(['-s', target, 'shell', `rm -f ${remote}`]); } catch (_) {}
    }
}
async function drainClipboard(session) {
    if (session.sending || clipboardSession !== session) return;
    session.sending = true;
    try {
        while (session.pending && clipboardSession === session) {
            const value = session.pending;
            session.pending = '';
            if (value === session.lastSent) continue;
            try {
                await sendClipboardValue(session.target, value);
                if (clipboardSession === session) { session.lastSent = value; lastSentClipboardB64 = value; session.failures = 0; }
            } catch (error) {
                if (clipboardSession !== session) return;
                session.pending ||= value;
                if (++session.failures <= 3) session.retry = setTimeout(() => drainClipboard(session), 1000);
                else broadcast({ type: 'CLIPBOARD_ERROR', error: error.message });
                break;
            }
        }
    } finally { session.sending = false; }
}
async function setClipboardMode(mode, deviceId) {
    const requestVersion = ++clipboardRequestVersion;
    if (!['off', 'pc-to-phone', 'phone-to-pc'].includes(mode)) return { success: false, error: 'Geçersiz pano modu' };
    if (mode === 'off') { stopAllClipboardProcesses(); broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'off' }); return { success: true, mode: 'off' }; }
    const target = await resolveTargetDevice(deviceId || config.selectedAdbDevice);
    if (requestVersion !== clipboardRequestVersion) return { success: false, error: 'Pano işlemi iptal edildi.' };
    const binary = mode === 'pc-to-phone' ? CLIPWATCH_BIN : SCRCPY_BIN;
    stopAllClipboardProcesses();
    broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'off' });
    if (!fs.existsSync(binary)) return { success: false, error: 'Pano aracı bulunamadı. Araç kurulumunu kontrol edin.' };
    const generation = clipboardGeneration;
    if (mode === 'pc-to-phone' && !await ensureClipJar(target)) return { success: false, error: 'clip.jar cihaza yüklenemedi. Bağlantıyı kontrol edin.' };
    if (generation !== clipboardGeneration) return { success: false, error: 'Pano işlemi iptal edildi.' };
    const session = { target, pending: '', buffer: '', decoder: new StringDecoder('utf8'), lastSent: '', failures: 0 };
    clipboardSession = session;
    const args = mode === 'phone-to-pc' ? ['-s', target, '--no-video', '--no-audio', '--no-window'] : [];
    try {
        const proc = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        if (mode === 'pc-to-phone') activeClipWatchProcess = proc; else activeClipboardProcess = proc;
        proc.stderr?.on('data', chunk => {
            if (clipboardSession === session && chunk.toString().includes('ERROR:CLIPBOARD')) broadcast({ type: 'CLIPBOARD_ERROR', error: 'Pano okunamıyor. Diğer uygulamaları kontrol edip tekrar kopyalayın.' });
        });
        proc.stdout?.on('data', chunk => {
            if (clipboardSession !== session || mode !== 'pc-to-phone') return;
            session.buffer += session.decoder.write(chunk);
            if (session.buffer.length > 90000) { stopAllClipboardProcesses(); broadcast({ type: 'CLIPBOARD_ERROR', error: 'Pano metni 64 KiB sınırını aşıyor.' }); return; }
            let newline;
            while ((newline = session.buffer.indexOf('\n')) >= 0) {
                const line = session.buffer.slice(0, newline).trim();
                session.buffer = session.buffer.slice(newline + 1);
                if (line.startsWith('CLIP:')) { session.pending = line.slice(5); drainClipboard(session).catch(() => {}); }
            }
        });
        const stopped = () => { if (clipboardSession === session) { stopAllClipboardProcesses(); broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode: 'off' }); } };
        proc.on('exit', stopped);
        proc.on('error', stopped);
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => { stopped(); reject(new Error('Pano aracı başlatma zaman aşımı.')); }, 10000);
            proc.once('spawn', () => { clearTimeout(timer); resolve(); });
            proc.once('error', () => { clearTimeout(timer); reject(new Error('Pano aracı başlatılamadı.')); });
        });
        if (clipboardSession !== session) return { success: false, error: 'Pano işlemi iptal edildi.' };
        currentClipboardMode = mode;
        activeClipboardDevice = target;
        broadcast({ type: 'CLIPBOARD_MODE_CHANGED', mode, deviceId: target });
        return { success: true, mode, deviceId: target };
    } catch (error) {
        if (clipboardSession === session) stopAllClipboardProcesses();
        return { success: false, error: error.message };
    }
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
    const target = await resolveTargetDevice(req.body.deviceId || config.selectedAdbDevice);
    const text = req.body.text;
    if (typeof text !== 'string' || !text || Buffer.byteLength(text, 'utf8') > 65536) return res.status(400).json({ success: false, error: 'Pano metni 1–65536 byte olmalıdır. Daha büyük metni dosya olarak aktarın.' });
    if (!await ensureClipJar(target)) throw Object.assign(new Error('clip.jar cihaza yüklenemedi. Araç kurulumunu ve bağlantıyı kontrol edin.'), { code: 'TOOL_MISSING', status: 503 });
    await sendClipboardValue(target, Buffer.from(text, 'utf8').toString('base64'));
    res.json({ success: true });
});

// Unity Editor PostProcessBuild notification endpoint
app.post('/api/unity-build-done', async (req, res) => {
    const apkPath = req.body.apkPath || req.body.ApkPath;
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
    const cleanup = () => stream.destroy();
    res.on('close', cleanup);
    require('stream').pipeline(stream, res, error => { res.off('close', cleanup); if (error && !res.headersSent) sendApiError(res, new Error('Dosya indirilemedi. Tekrar deneyin.')); });
});

app.get('/download-companion', (req, res) => {
    const companionPath = path.join(PUBLIC_DIR, 'UnityCompanion.apk');
    if (!fs.existsSync(companionPath)) {
        return res.status(404).send('Companion APK bulunamadı');
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="ApkDropCompanion.apk"');
    const stream = fs.createReadStream(companionPath);
    const cleanup = () => stream.destroy();
    res.on('close', cleanup);
    require('stream').pipeline(stream, res, () => res.off('close', cleanup));
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
        sendApiError(res, e);
    }
});

app.use((error, req, res, next) => {
    cleanupUploadParts(req);
    if (error.type === 'entity.parse.failed') {
        error = Object.assign(new Error('Geçersiz JSON. İsteği kontrol edip tekrar deneyin.'), { code: 'INVALID_JSON', status: 400 });
    }
    sendApiError(res, error);
});

// Periodic ADB Device & Battery Monitor (every 4 seconds)
let lastDevicesSnapshotJson = '';
let lastQrUrl = '';
const monitorTimer = setInterval(async () => {
    if (shuttingDown) return;
    try {
        const devices = await getAdbDevices();
        const currentSnapshot = JSON.stringify(devices.map(d => ({
            id: d.id,
            state: d.state,
            battery: d.battery, model: d.model
        })));

        if (currentSnapshot !== lastDevicesSnapshotJson) {
            lastDevicesSnapshotJson = currentSnapshot;
            broadcast({ type: 'DEVICES_UPDATED', devices });

            const primaryIp = getPrimaryIp();
            const qrUrl = `http://${primaryIp}:${PORT}/mobile`;
            if (qrUrl === lastQrUrl) return;
            lastQrUrl = qrUrl;
            const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                width: 320,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            broadcast({ type: 'MOBILE_QR_UPDATED', url: qrUrl, qrDataUrl, ip: primaryIp, availableIps: getAllLocalIps() });
        }
    } catch (e) {}
}, 4000);

// Startup and shutdown share ownership in headless and Electron modes.
function startServer() {
    return new Promise((resolve, reject) => {
        server.once('error', () => reject(new Error('Sunucu açılamadı. PORT kullanımını ve izinleri kontrol edin.')));
        server.listen(PORT, '0.0.0.0', async () => {
            try {
                try { migratePhoneRegistry(); } catch (error) { console.error(error.message); }
                await setupWatcher(config.watchFolder);
                scanFolder(config.watchFolder, 'startup');
                scanFolder(UPLOADS_DIR, 'startup');
                syncTransfersWithDisk();
                writeDashboardSession();
                serverReady = true;
                console.log('BRQ Transfer hazır. Yönetim paneli: masaüstü başlatıcısı veya npm run panel');
                if (process.env.BRQ_OPEN_BROWSER === '1') {
                    const opener = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
                    const proc = spawn(opener, [getDashboardUrl()], { windowsHide: true });
                    proc.on('error', () => console.error('Tarayıcı açılamadı. Yerel panel adresini tarayıcıya girin.'));
                }
                resolve();
            } catch (error) { reject(error); }
        });
    });
}
let shutdownPromise = null;
function shutdown() {
    if (shutdownPromise) return shutdownPromise;
    shuttingDown = true;
    serverReady = false;
    clearInterval(monitorTimer);
    for (const socket of discoverySockets) { try { socket.close(); } catch (_) {} }
    if (currentPairingSession) currentPairingSession.cancelled = true;
    stopScreenStream();
    stopScrcpy();
    stopAllClipboardProcesses();
    clipboardRequestVersion++;
    for (const child of ownedAdbProcesses) { try { child.kill(); } catch (_) {} }
    shutdownPromise = (async () => {
        await Promise.allSettled([watcherChange, currentWatcher?.close(), receivedWatcher?.close()]);
        for (const client of wss.clients) client.terminate();
        await new Promise(resolve => wss.close(resolve));
        server.closeAllConnections?.();
        await new Promise(resolve => server.close(resolve));
    })();
    return shutdownPromise;
}
const startup = startServer();
startup.catch(error => { console.error(error.message); shutdown().finally(() => { process.exitCode = 1; }); });
module.exports = { startup, shutdown, getDashboardUrl };
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => shutdown().finally(() => process.exit(0)));
