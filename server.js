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
        exec(`"${ADB_BIN}" connect ${ip}:${port}`, (err, stdout, stderr) => {
            const out = (stdout || '') + (stderr || '');
            if (err || out.includes('cannot connect') || out.includes('failed to connect')) {
                return reject(new Error(out.trim() || 'Bağlantı kurulamadı'));
            }
            resolve(out.trim());
        });
    });
}

function adbPair(ip, port, code) {
    return new Promise((resolve, reject) => {
        exec(`"${ADB_BIN}" pair ${ip}:${port} ${code}`, (err, stdout, stderr) => {
            const out = (stdout || '') + (stderr || '');
            if (err || out.includes('Failed') || out.includes('error')) {
                return reject(new Error(out.trim() || 'Eşleştirme başarısız'));
            }
            resolve(out.trim());
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

                        // Check mDNS for connect port
                        let connectPort = null;
                        for (let attempt = 0; attempt < 6; attempt++) {
                            await new Promise(r => setTimeout(r, 1000));
                            const mdnsOut = await new Promise(r => exec(`"${ADB_BIN}" mdns services`, (e, o) => r(o || '')));
                            const connectLine = mdnsOut.split('\n').find(l => l.includes('_adb-tls-connect._tcp') && l.includes(ip));
                            if (connectLine) {
                                const cParts = connectLine.trim().split(/\s+/);
                                const cAddr = cParts.find(p => p.includes(':') && !p.includes('_adb'));
                                if (cAddr) {
                                    connectPort = cAddr.substring(cAddr.lastIndexOf(':') + 1);
                                    break;
                                }
                            }
                        }

                        if (connectPort) {
                            console.log(`[ADB QR]: mDNS üzerinden connect port bulundu: ${ip}:${connectPort}`);
                            await new Promise(r => exec(`"${ADB_BIN}" connect ${ip}:${connectPort}`, () => r()));
                            const isConnected = await verifyDeviceConnected(ip);
                            if (isConnected) {
                                session.status = 'connected';
                                session.message = `🎉 Cihaz başarıyla bağlandı! (${ip}:${connectPort})`;
                                const devices = await getAdbDevices();
                                broadcast({ type: 'ADB_PAIR_STATUS', session });
                                broadcast({ type: 'DEVICES_UPDATED', devices });
                                return;
                            }
                        }

                        // If mDNS didn't provide connect port or connect failed, prompt user for phone's port
                        session.status = 'paired_need_port';
                        session.pairedIp = ip;
                        session.message = `✅ Eşleşme tamamlandı! Telefonda görünen 5 haneli bağlantı portunu girin:`;
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

// Re-engineered Logcat streamer with bulletproof termination
let activeLogcatProcess = null;

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function stopLogcatStream() {
    if (activeLogcatProcess) {
        console.log('[Logcat]: Süreç durduruluyor PID:', activeLogcatProcess.pid);
        try {
            if (process.platform === 'win32') {
                exec(`taskkill /pid ${activeLogcatProcess.pid} /T /F`, () => {});
            } else {
                activeLogcatProcess.kill('SIGKILL');
            }
        } catch (e) {
            console.error('Logcat stop error:', e.message);
        }
        activeLogcatProcess = null;
        broadcast({ type: 'LOGCAT_STOPPED' });
    }
}

function startLogcatStream(deviceId, filter = '', level = '') {
    stopLogcatStream();

    const targetArg = deviceId ? ['-s', deviceId] : [];
    const args = [...targetArg, 'logcat', '-v', 'threadtime'];
    console.log('[Logcat]: Başlatılıyor:', ADB_BIN, args.join(' '));

    activeLogcatProcess = spawn(ADB_BIN, args);
    broadcast({ type: 'LOGCAT_STARTED' });

    activeLogcatProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        const lines = text.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            if (filter && !line.toLowerCase().includes(filter.toLowerCase())) continue;

            broadcast({
                type: 'LOGCAT_LINE',
                line: line
            });
        }
    });

    activeLogcatProcess.stderr.on('data', (chunk) => {
        broadcast({ type: 'LOGCAT_LINE', line: `[ADB-STDERR] ${chunk.toString('utf8').trim()}` });
    });

    activeLogcatProcess.on('close', () => {
        console.log('[Logcat]: Kapandı');
        broadcast({ type: 'LOGCAT_STOPPED' });
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
        port: PORT,
        isLogcatRunning: !!activeLogcatProcess,
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
            if (data.action === 'START_LOGCAT') {
                startLogcatStream(data.deviceId, data.filter || '', data.level || '');
            } else if (data.action === 'STOP_LOGCAT') {
                stopLogcatStream();
            } else if (data.action === 'CLEAR_LOGCAT') {
                const targetArg = data.deviceId ? `-s ${data.deviceId}` : '';
                exec(`"${ADB_BIN}" ${targetArg} logcat -c`, () => {
                    broadcast({ type: 'LOGCAT_CLEARED' });
                });
            }
        } catch (e) {
            console.error('WS message error:', e);
        }
    });
});

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
        apkCount: apkList.length,
        isLogcatRunning: !!activeLogcatProcess
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
    if (!deviceId) return res.status(400).json({ error: 'Cihaz ID gerekli' });
    exec(`"${ADB_BIN}" disconnect ${deviceId}`, async (err, stdout, stderr) => {
        const devices = await getAdbDevices();
        if (config.selectedAdbDevice === deviceId) {
            config.selectedAdbDevice = devices.length > 0 ? devices[0].id : '';
            saveConfig();
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

// Remote Key Events (Back=4, Home=3, AppSwitch=187, Power=26)
app.post('/api/adb/keyevent', (req, res) => {
    const { deviceId, code } = req.body;
    const targetArg = deviceId ? `-s ${deviceId}` : '';
    exec(`"${ADB_BIN}" ${targetArg} shell input keyevent ${code}`, (err) => {
        res.json({ success: !err });
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
    res.redirect('/');
});

app.get('/api/qr', async (req, res) => {
    try {
        const ip = getPrimaryIp();
        const url = `http://${ip}:${PORT}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });
        res.json({ url, qrDataUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

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
});