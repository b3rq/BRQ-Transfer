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

const PORT = process.env.PORT || 4500;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Directories
const BASE_DIR = __dirname;
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const WATCH_DIR = path.join(BASE_DIR, 'watch');
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const CONFIG_FILE = path.join(BASE_DIR, 'config.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

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

// Smart Local IP Detection
function getAllLocalIps() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const name of Object.keys(interfaces)) {
        const isVirtual = /[\*]|vEthernet|Virtual|Host-Only|Loopback|WSL/i.test(name);
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const isHotspot = iface.address.startsWith('192.168.137.');
                let priority = 1;
                if (!isVirtual && !isHotspot) priority = 3;
                else if (!isVirtual && isHotspot) priority = 2;
                else priority = 0;

                candidates.push({ ip: iface.address, name, priority });
            }
        }
    }

    candidates.sort((a, b) => b.priority - a.priority);
    return candidates;
}

function getPrimaryIp() {
    if (config.selectedIp) return config.selectedIp;
    const ips = getAllLocalIps();
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

// In-Memory APK list
let apkList = [];

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Parse APK Badging via aapt
function extractApkMetadata(apkPath) {
    return new Promise((resolve) => {
        exec(`"${AAPT_BIN}" dump badging "${apkPath}"`, { maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
            if (err || !stdout) {
                return resolve({
                    packageName: 'com.game.unity',
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
                packageName: pkgMatch ? pkgMatch[1] : 'com.game.unity',
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

        console.log(`[Yeni APK]: ${meta.label} (${fileName}) v${meta.versionName} (${apkItem.size}) [Kaynak: ${source}]`);
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
        ignoreInitial: true, // We scan explicitly on startup
        awaitWriteFinish: {
            stabilityThreshold: 1200,
            pollInterval: 300
        }
    });

    currentWatcher.on('add', filePath => {
        if (filePath.toLowerCase().endsWith('.apk')) {
            registerApk(filePath, 'unity-watcher');
        }
    });

    currentWatcher.on('change', filePath => {
        if (filePath.toLowerCase().endsWith('.apk')) {
            registerApk(filePath, 'unity-watcher');
        }
    });
}

// ADB Management functions
function getAdbDevices() {
    return new Promise((resolve) => {
        exec(`"${ADB_BIN}" devices -l`, (err, stdout, stderr) => {
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
            resolve(devices);
        });
    });
}

function adbConnect(ip, port = 5555) {
    return new Promise((resolve, reject) => {
        exec(`"${ADB_BIN}" connect ${ip}:${port}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve(stdout.trim());
        });
    });
}

function adbPair(ip, port, code) {
    return new Promise((resolve, reject) => {
        exec(`"${ADB_BIN}" pair ${ip}:${port} ${code}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve(stdout.trim());
        });
    });
}

function launchAppViaAdb(deviceId, packageName) {
    return new Promise((resolve) => {
        const targetArg = deviceId ? `-s ${deviceId}` : '';
        const cmd = `"${ADB_BIN}" ${targetArg} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`;
        exec(cmd, (err, stdout) => {
            resolve({ success: !err, output: stdout });
        });
    });
}

function installApkViaAdb(deviceId, apkPath, apkMeta = null) {
    broadcast({
        type: 'ADB_INSTALL_START',
        deviceId,
        apkName: path.basename(apkPath),
        message: `${path.basename(apkPath)} cihaza aktarılıyor ve kuruluyor...`
    });

    const targetArg = deviceId ? `-s ${deviceId}` : '';
    const cmd = `"${ADB_BIN}" ${targetArg} install -r -d -t "${apkPath}"`;

    console.log('[ADB Kurulum Başladı]:', cmd);
    exec(cmd, async (err, stdout, stderr) => {
        if (err || (stdout && stdout.includes('Failure'))) {
            const errorMsg = stdout || stderr || (err ? err.message : 'Bilinmeyen hata');
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

// WebSocket broadcast & Logcat streaming
let activeLogcatProcess = null;

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

wss.on('connection', async (ws) => {
    const devices = await getAdbDevices();
    ws.send(JSON.stringify({
        type: 'INIT',
        apks: apkList,
        devices: devices,
        config: config,
        localIp: getPrimaryIp(),
        availableIps: getAllLocalIps(),
        port: PORT
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'START_LOGCAT') {
                startLogcatStream(data.deviceId, data.filter || '');
            } else if (data.action === 'STOP_LOGCAT') {
                stopLogcatStream();
            } else if (data.action === 'CLEAR_LOGCAT') {
                const targetArg = data.deviceId ? `-s ${data.deviceId}` : '';
                exec(`"${ADB_BIN}" ${targetArg} logcat -c`);
            }
        } catch (e) {
            console.error('WS message parse error:', e);
        }
    });
});

function startLogcatStream(deviceId, filter) {
    stopLogcatStream();
    const targetArg = deviceId ? ['-s', deviceId] : [];
    const args = [...targetArg, 'logcat', '-v', 'time'];
    activeLogcatProcess = spawn(ADB_BIN, args);

    activeLogcatProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            if (filter && !line.toLowerCase().includes(filter.toLowerCase())) continue;
            broadcast({
                type: 'LOGCAT_LINE',
                line: line.trim()
            });
        }
    });

    activeLogcatProcess.stderr.on('data', (chunk) => {
        broadcast({ type: 'LOGCAT_LINE', line: `[STDERR] ${chunk.toString('utf8').trim()}` });
    });

    activeLogcatProcess.on('close', () => {
        broadcast({ type: 'LOGCAT_STOPPED' });
    });
}

function stopLogcatStream() {
    if (activeLogcatProcess) {
        try { activeLogcatProcess.kill(); } catch (e) {}
        activeLogcatProcess = null;
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Multer Storage for drag and drop
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// REST Routes
app.get('/api/status', async (req, res) => {
    const devices = await getAdbDevices();
    res.json({
        localIp: getPrimaryIp(),
        availableIps: getAllLocalIps(),
        port: PORT,
        devices,
        config,
        apkCount: apkList.length
    });
});

app.get('/api/apks', (req, res) => {
    res.json(apkList);
});

app.post('/api/upload', upload.single('apk'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Dosya yüklenemedi' });
    }
    const item = await registerApk(req.file.path, 'drag-drop');
    res.json({ success: true, apk: item });
});

app.post('/api/unity-build-done', async (req, res) => {
    const { apkPath } = req.body;
    if (!apkPath || !fs.existsSync(apkPath)) {
        return res.status(400).json({ error: 'Geçersiz APK yolu' });
    }
    console.log('[Unity Webhook]: Yeni build tamamlandı:', apkPath);
    const item = await registerApk(apkPath, 'unity-build-hook');
    res.json({ success: true, apk: item });
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
    broadcast({ type: 'CONFIG_UPDATED', config });
    res.json({ success: true, config });
});

app.get('/api/adb/devices', async (req, res) => {
    const devices = await getAdbDevices();
    res.json(devices);
});

app.post('/api/adb/connect', async (req, res) => {
    const { ip, port } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP adresi gerekli' });
    try {
        const result = await adbConnect(ip, port || 5555);
        const devices = await getAdbDevices();
        broadcast({ type: 'DEVICES_UPDATED', devices });
        res.json({ success: true, result, devices });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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
    if (!packageName) return res.status(400).json({ error: 'Paket adı gerekli' });
    const result = await launchAppViaAdb(deviceId, packageName);
    res.json(result);
});

app.post('/api/adb/stop', (req, res) => {
    const { deviceId, packageName } = req.body;
    const targetArg = deviceId ? `-s ${deviceId}` : '';
    exec(`"${ADB_BIN}" ${targetArg} shell am force-stop ${packageName}`, (err, stdout) => {
        res.json({ success: !err, output: stdout });
    });
});

app.post('/api/adb/uninstall', (req, res) => {
    const { deviceId, packageName } = req.body;
    const targetArg = deviceId ? `-s ${deviceId}` : '';
    exec(`"${ADB_BIN}" ${targetArg} uninstall ${packageName}`, (err, stdout) => {
        res.json({ success: !err, output: stdout });
    });
});

app.get('/api/adb/screenshot', (req, res) => {
    const { deviceId } = req.query;
    const targetArg = deviceId ? ['-s', deviceId] : [];
    const proc = spawn(ADB_BIN, [...targetArg, 'exec-out', 'screencap', '-p']);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    proc.stdout.pipe(res);
    proc.stderr.on('data', (chunk) => {
        console.error('Screenshot error:', chunk.toString());
    });
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
    res.setHeader('Content-Disposition', 'attachment; filename="UnityCompanion.apk"');
    const stream = fs.createReadStream(companionPath);
    stream.pipe(res);
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'mobile.html'));
});

app.get('/api/qr', async (req, res) => {
    try {
        const ip = getPrimaryIp();
        const mobileUrl = `http://${ip}:${PORT}/mobile`;
        const qrDataUrl = await QRCode.toDataURL(mobileUrl, {
            width: 320,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });
        res.json({ url: mobileUrl, qrDataUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
    const ip = getPrimaryIp();
    console.log('==================================================');
    console.log(`🚀 UnityDrop Hub & Wireless ADB V2`);
    console.log(`💻 PC Yönetim Paneli : http://localhost:${PORT}`);
    console.log(`📱 Telefon Linki    : http://${ip}:${PORT}/mobile`);
    console.log(`📂 İzlenen Klasör   : ${config.watchFolder}`);
    console.log('==================================================');

    setupWatcher(config.watchFolder);
    scanFolder(config.watchFolder, 'unity-watcher');
    scanFolder(UPLOADS_DIR, 'upload');
});