let currentApks = [];
let currentDevices = [];
let selectedDevice = '';
let isSoundEnabled = localStorage.getItem('apkdrop_sound') !== 'false';
let currentLang = localStorage.getItem('apkdrop_lang') || 'tr';
let ws = null;

// Logcat State
let isLogcatRunning = false;
let logcatEntries = [];
const MAX_LOGCAT_ENTRIES = 800;

// Screen Mirror State
let isMirroring = false;
let mirrorFpsCounter = 0;
let lastFpsTime = Date.now();
let mirrorLoopTimeout = null;

// DOM Elements
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundStatus = document.getElementById('sound-status');
const langToggleBtn = document.getElementById('lang-toggle-btn');
const langLabel = document.getElementById('lang-label');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const qrImg = document.getElementById('qr-img');
const mobileUrlLink = document.getElementById('mobile-url-link');
const apkListContainer = document.getElementById('apk-list-container');
const apkCountSpan = document.getElementById('apk-count');
const devicesList = document.getElementById('devices-list');
const refreshDevicesBtn = document.getElementById('refresh-devices-btn');
const tcpipBtn = document.getElementById('tcpip-btn');
const adbIpInput = document.getElementById('adb-ip-input');
const adbConnectBtn = document.getElementById('adb-connect-btn');
const autoAdbCheckbox = document.getElementById('auto-adb-checkbox');
const autoLaunchCheckbox = document.getElementById('auto-launch-checkbox');
const watchFolderInput = document.getElementById('watch-folder-input');
const saveWatchBtn = document.getElementById('save-watch-btn');
const currentWatchLabel = document.getElementById('current-watch-label');
const activeDeviceIndicator = document.getElementById('active-device-indicator');
const toast = document.getElementById('toast');

// ADB QR Pairing Elements
const adbQrImg = document.getElementById('adb-qr-img');
const adbPairStatusBadge = document.getElementById('adb-pair-status-badge');
const refreshAdbQrBtn = document.getElementById('refresh-adb-qr-btn');

// Screen Mirror Elements
const startMirrorBtn = document.getElementById('start-mirror-btn');
const stopMirrorBtn = document.getElementById('stop-mirror-btn');
const snapScreenshotBtn = document.getElementById('snap-screenshot-btn');
const saveScreenshotAsBtn = document.getElementById('save-screenshot-as-btn');
const screenMirrorCanvas = document.getElementById('screen-mirror-canvas');
const screenshotStaticImg = document.getElementById('screenshot-static-img');
const screenEmptyPlaceholder = document.getElementById('screen-empty-placeholder');
const remoteBar = document.getElementById('remote-bar');
const mirrorFpsBadge = document.getElementById('mirror-fps-badge');

// Logcat Elements
const terminalWindow = document.getElementById('terminal-window');
const startLogcatBtn = document.getElementById('start-logcat-btn');
const stopLogcatBtn = document.getElementById('stop-logcat-btn');
const clearLogcatBtn = document.getElementById('clear-logcat-btn');
const copyLogcatBtn = document.getElementById('copy-logcat-btn');
const exportLogcatBtn = document.getElementById('export-logcat-btn');
const logcatLevelSelect = document.getElementById('logcat-level-select');
const logcatSearchInput = document.getElementById('logcat-search-input');
const logcatAutoscrollCheckbox = document.getElementById('logcat-autoscroll-checkbox');
const logcatStatusBadge = document.getElementById('logcat-status-badge');

// Web Audio Chime
function playChime() {
    if (!isSoundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
    } catch (e) {}
}

function showToast(message, color = 'var(--accent-blue)', duration = 4000) {
    toast.textContent = message;
    toast.style.borderColor = color;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// Sound toggle
soundToggleBtn.onclick = () => {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('apkdrop_sound', isSoundEnabled);
    soundStatus.textContent = isSoundEnabled ? 'Ses Açık' : 'Ses Kapalı';
    if (isSoundEnabled) playChime();
};

// Tabs Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) {
            target.style.display = 'block';
            if (btn.getAttribute('data-tab') === 'tab-adb') {
                loadAdbPairingQr();
            }
        }
    };
});

// Load ADB Pairing QR
async function loadAdbPairingQr() {
    if (!adbQrImg) return;
    adbPairStatusBadge.className = 'badge badge-purple';
    adbPairStatusBadge.textContent = '⏳ Yeni QR kod hazırlanıyor...';
    try {
        const res = await fetch('/api/adb/pairing-qr');
        const data = await res.json();
        if (data.success) {
            adbQrImg.src = data.qrDataUrl;
            adbPairStatusBadge.textContent = data.message;
        }
    } catch (e) {
        adbPairStatusBadge.textContent = 'QR oluşturulamadı';
    }
}

if (refreshAdbQrBtn) refreshAdbQrBtn.onclick = loadAdbPairingQr;

// USB to TCP/IP
if (tcpipBtn) {
    tcpipBtn.onclick = async () => {
        showToast('🔌 Cihaz kablosuz moda alınıyor (port 5555)...');
        try {
            const res = await fetch('/api/adb/tcpip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: 5555 })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ ${data.message}`, 'var(--accent-green)', 6000);
                refreshDevices();
            } else {
                showToast(`Hata: ${data.error}`, 'var(--accent-red)');
            }
        } catch (e) {
            showToast(`Hata: ${e.message}`, 'var(--accent-red)');
        }
    };
}

// Disconnect Device
window.disconnectDevice = async (deviceId) => {
    showToast(`🔌 ${deviceId} bağlantısı kesiliyor...`);
    try {
        const res = await fetch('/api/adb/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${deviceId} bağlantısı sonlandırıldı`, 'var(--accent-green)');
            refreshDevices();
        } else {
            showToast(`Hata: ${data.error}`, 'var(--accent-red)');
        }
    } catch (e) {
        showToast(`Hata: ${e.message}`, 'var(--accent-red)');
    }
};

// WebSocket Connection
function connectWs() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'INIT') {
            currentApks = data.apks || [];
            currentDevices = data.devices || [];
            renderApks();
            renderDevices();
            if (data.config) {
                watchFolderInput.value = data.config.watchFolder || '';
                currentWatchLabel.textContent = `İzlenen: ${data.config.watchFolder || 'Varsayılan'}`;
                autoAdbCheckbox.checked = !!data.config.autoInstallOnAdb;
                autoLaunchCheckbox.checked = data.config.autoLaunchAfterInstall !== false;
                selectedDevice = data.config.selectedAdbDevice || '';
            }
            if (data.pairingSession && adbQrImg) {
                adbQrImg.src = data.pairingSession.qrDataUrl;
                adbPairStatusBadge.textContent = data.pairingSession.message;
            }
            setLogcatRunningUI(!!data.isLogcatRunning);
        } else if (data.type === 'NEW_APK') {
            currentApks.unshift(data.apk);
            renderApks();
            playChime();
            showToast(`🔥 ${data.message}`, 'var(--accent-green)');
        } else if (data.type === 'ADB_INSTALL_START') {
            showToast(`⏳ ${data.message}`, 'var(--accent-orange)', 5000);
        } else if (data.type === 'ADB_INSTALL_SUCCESS') {
            showToast(`✅ ${data.apkName} başarıyla yüklendi!`, 'var(--accent-green)', 5000);
        } else if (data.type === 'ADB_INSTALL_ERROR') {
            showToast(`❌ ADB Kurulum Hatası: ${data.error}`, 'var(--accent-red)', 7000);
        } else if (data.type === 'DEVICES_UPDATED') {
            currentDevices = data.devices;
            renderDevices();
        } else if (data.type === 'ADB_PAIR_STATUS') {
            handleAdbPairStatus(data.session);
        } else if (data.type === 'LOGCAT_LINE') {
            handleLogcatLine(data.line);
        } else if (data.type === 'LOGCAT_STARTED') {
            setLogcatRunningUI(true);
        } else if (data.type === 'LOGCAT_STOPPED') {
            setLogcatRunningUI(false);
        }
    };

    ws.onclose = () => {
        setTimeout(connectWs, 2000);
    };
}

function handleAdbPairStatus(session) {
    if (!adbPairStatusBadge) return;
    adbPairStatusBadge.textContent = session.message;

    if (session.status === 'pairing') {
        adbPairStatusBadge.className = 'badge';
        adbPairStatusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
        adbPairStatusBadge.style.color = '#f59e0b';
    } else if (session.status === 'connecting') {
        adbPairStatusBadge.className = 'badge badge-blue';
    } else if (session.status === 'connected') {
        adbPairStatusBadge.className = 'badge';
        adbPairStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        adbPairStatusBadge.style.color = '#10b981';
        playChime();
        showToast('🎉 Android cihazınız başarıyla eşleşti ve bağlandı!', 'var(--accent-green)', 6000);
        refreshDevices();
    } else if (session.status === 'timeout') {
        adbPairStatusBadge.className = 'badge badge-red';
    }
}

// Fetch Mobile QR Code
async function loadQrCode() {
    try {
        const res = await fetch('/api/qr');
        const data = await res.json();
        qrImg.src = data.qrDataUrl;
        mobileUrlLink.href = data.url;
        mobileUrlLink.textContent = data.url;
    } catch (e) {
        console.error('QR alma hatası:', e);
    }
}

// Render APKs
function renderApks() {
    apkCountSpan.textContent = currentApks.length;
    if (currentApks.length === 0) {
        apkListContainer.innerHTML = `
          <p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 32px;">
            Henüz APK bulunmuyor. Derleme alabilir veya yukarıya bir APK sürükleyebilirsiniz.
          </p>
        `;
        return;
    }

    apkListContainer.innerHTML = currentApks.map(apk => `
      <div class="apk-card">
        <div class="apk-header">
          <div class="apk-title">
            <span>📦</span> ${apk.label || apk.name}
          </div>
          <span class="badge ${apk.source === 'folder-watcher' ? 'badge-purple' : 'badge-blue'}">
            ${apk.source === 'folder-watcher' ? '⚡ Otomatik' : '📥 Dosya'}
          </span>
        </div>

        <div class="apk-pkg">${apk.packageName} • ${apk.name}</div>

        <div class="apk-tags">
          <span class="badge" style="background: rgba(255,255,255,0.06); color: #e2e8f0; border-color: rgba(255,255,255,0.1);">
            🏷️ v${apk.versionName || '1.0'} (${apk.versionCode || '1'})
          </span>
          <span class="badge" style="background: rgba(255,255,255,0.06); color: #e2e8f0; border-color: rgba(255,255,255,0.1);">
            📦 ${apk.size}
          </span>
          <span class="badge" style="background: rgba(255,255,255,0.06); color: #e2e8f0; border-color: rgba(255,255,255,0.1);">
            🕒 ${new Date(apk.updatedAt).toLocaleTimeString()}
          </span>
          <span class="badge" style="background: rgba(255,255,255,0.06); color: #e2e8f0; border-color: rgba(255,255,255,0.1);">
            🎯 SDK ${apk.minSdk || '24'}-${apk.targetSdk || '34'}
          </span>
        </div>

        <div class="apk-actions">
          <button class="btn btn-purple btn-sm" onclick="installViaAdb('${apk.id}', '${apk.name}')">
            ⚡ Telefona Yükle & Başlat
          </button>
          <button class="btn btn-outline btn-sm" onclick="launchApp('${apk.packageName}')" title="Uygulamayı Aç">
            ▶️ Başlat
          </button>
          <button class="btn btn-outline btn-sm" onclick="stopApp('${apk.packageName}')" title="Uygulamayı Kapat">
            ⏹️ Durdur
          </button>
          <a href="${apk.downloadUrl}" class="btn btn-outline btn-sm" download="${apk.name}">
            ⬇️ İndir
          </a>
        </div>
      </div>
    `).join('');
}

// Render ADB Devices with Disconnect button
function renderDevices() {
    if (currentDevices.length === 0) {
        devicesList.innerHTML = `
          <div style="font-size: 13px; color: var(--text-muted); padding: 12px 0;">
            ⚠️ Bağlı cihaz yok. Sol taraftaki <b>QR Kodu</b> telefonunuzdan taratarak veya aşağıdan IP:Port girerek bağlayabilirsiniz.
          </div>
        `;
        activeDeviceIndicator.textContent = 'Cihaz: Yok';
        return;
    }

    if (!selectedDevice && currentDevices.length > 0) {
        selectedDevice = currentDevices[0].id;
    }

    activeDeviceIndicator.textContent = `Cihaz: ${selectedDevice}`;

    devicesList.innerHTML = currentDevices.map(d => `
      <div class="device-item">
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="radio" name="adb-device" value="${d.id}" ${d.id === selectedDevice ? 'checked' : ''} onchange="changeSelectedDevice('${d.id}')">
          <div>
            <div style="font-weight: 700; font-size: 14px;">${d.model}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${d.id} • ${d.isWifi ? '📶 Kablosuz Wi-Fi' : '🔌 USB'}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-danger btn-sm" onclick="disconnectDevice('${d.id}')" title="Bağlantıyı Kes / Sil">
            ❌ Bağlantıyı Kes
          </button>
          <span class="badge" style="font-size: 11px;">Hazır</span>
        </div>
      </div>
    `).join('');
}

window.changeSelectedDevice = (id) => {
    selectedDevice = id;
    activeDeviceIndicator.textContent = `Cihaz: ${selectedDevice}`;
    saveSettings();
};

window.installViaAdb = async (apkId, apkName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) {
        showToast('⚠️ Önce bir Android cihaz bağlamalısınız!', 'var(--accent-red)');
        return;
    }
    showToast(`⚡ ${apkName} -> ${target} yükleniyor...`);
    try {
        const res = await fetch('/api/adb/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, apkId })
        });
        const data = await res.json();
        if (!data.success) showToast(`Hata: ${data.error}`, 'var(--accent-red)');
    } catch (e) {
        showToast(`Hata: ${e.message}`, 'var(--accent-red)');
    }
};

window.launchApp = async (packageName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');
    try {
        const res = await fetch('/api/adb/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, packageName })
        });
        const data = await res.json();
        showToast(data.success ? `▶️ ${packageName} başlatıldı` : `Başlatılamadı: ${data.output}`);
    } catch (e) {
        showToast(`Hata: ${e.message}`, 'var(--accent-red)');
    }
};

window.stopApp = async (packageName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');
    await fetch('/api/adb/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: target, packageName })
    });
    showToast(`⏹️ ${packageName} durduruldu`);
};

// Remote Keycode
window.sendRemoteKey = async (code) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');
    await fetch('/api/adb/keyevent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: target, code })
    });
};

// Settings
async function saveSettings() {
    await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            watchFolder: watchFolderInput.value.trim(),
            autoInstallOnAdb: autoAdbCheckbox.checked,
            autoLaunchAfterInstall: autoLaunchCheckbox.checked,
            selectedAdbDevice: selectedDevice
        })
    });
}

saveWatchBtn.onclick = async () => {
    const val = watchFolderInput.value.trim();
    if (!val) return;
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ watchFolder: val })
        });
        const data = await res.json();
        if (data.success) {
            currentWatchLabel.textContent = `İzlenen: ${val}`;
            showToast('✅ Klasör kaydedildi!', 'var(--accent-green)');
        } else {
            showToast(`Hata: ${data.error}`, 'var(--accent-red)');
        }
    } catch (e) {
        showToast(`Hata: ${e.message}`, 'var(--accent-red)');
    }
};

autoAdbCheckbox.onchange = () => {
    saveSettings();
    showToast(`Otomatik yükleme: ${autoAdbCheckbox.checked ? 'Açık' : 'Kapalı'}`);
};

autoLaunchCheckbox.onchange = () => {
    saveSettings();
    showToast(`Otomatik oyun başlatma: ${autoLaunchCheckbox.checked ? 'Açık' : 'Kapalı'}`);
};

// Connect Wireless ADB Manual
adbConnectBtn.onclick = async () => {
    const target = adbIpInput.value.trim();
    if (!target) return;
    let [ip, port] = target.split(':');
    showToast(`📶 ${target} bağlanılıyor...`);
    try {
        const res = await fetch('/api/adb/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, port: port || 5555 })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${data.result}`, 'var(--accent-green)');
            refreshDevices();
        } else {
            showToast(`❌ Bağlantı hatası: ${data.error}`, 'var(--accent-red)');
        }
    } catch (e) {
        showToast(`Hata: ${e.message}`, 'var(--accent-red)');
    }
};

refreshDevicesBtn.onclick = refreshDevices;

async function refreshDevices() {
    const res = await fetch('/api/adb/devices');
    currentDevices = await res.json();
    renderDevices();
    showToast('🔄 Cihaz listesi güncellendi');
}

// Drag and drop upload
dropzone.onclick = () => fileInput.click();

fileInput.onchange = () => {
    if (fileInput.files.length > 0) uploadFile(fileInput.files[0]);
};

dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
};

dropzone.ondragleave = () => dropzone.classList.remove('dragover');

dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) uploadFile(e.dataTransfer.files[0]);
};

async function uploadFile(file) {
    if (!file.name.toLowerCase().endsWith('.apk')) {
        showToast('⚠️ Lütfen yalnızca .apk dosyası seçin!', 'var(--accent-red)');
        return;
    }
    showToast(`📤 ${file.name} yükleniyor...`);
    const formData = new FormData();
    formData.append('apk', file);
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) showToast(`✅ ${file.name} hazırlandı!`, 'var(--accent-green)');
    } catch (e) {
        showToast(`Hata: ${e.message}`, 'var(--accent-red)');
    }
}

// ==========================================
// 📺 CANLI EKRAN YANSITMA (LIVE SCREEN MIRROR)
// ==========================================
startMirrorBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Önce bir cihaz bağlamalısınız!', 'var(--accent-red)');

    isMirroring = true;
    startMirrorBtn.style.display = 'none';
    stopMirrorBtn.style.display = 'inline-flex';
    screenEmptyPlaceholder.style.display = 'none';
    screenshotStaticImg.style.display = 'none';
    screenMirrorCanvas.style.display = 'block';
    remoteBar.style.display = 'flex';
    mirrorFpsBadge.style.display = 'inline-flex';

    showToast('📺 Canlı ekran yayını başlatıldı');
    updateMirrorFrame();
};

stopMirrorBtn.onclick = () => {
    isMirroring = false;
    clearTimeout(mirrorLoopTimeout);
    startMirrorBtn.style.display = 'inline-flex';
    stopMirrorBtn.style.display = 'none';
    mirrorFpsBadge.style.display = 'none';
    showToast('⏹️ Canlı yayın durduruldu');
};

function updateMirrorFrame() {
    if (!isMirroring) return;
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) {
        stopMirrorBtn.click();
        return;
    }

    const img = new Image();
    img.onload = () => {
        if (!isMirroring) return;
        const ctx = screenMirrorCanvas.getContext('2d');
        if (screenMirrorCanvas.width !== img.naturalWidth || screenMirrorCanvas.height !== img.naturalHeight) {
            screenMirrorCanvas.width = img.naturalWidth;
            screenMirrorCanvas.height = img.naturalHeight;
        }
        ctx.drawImage(img, 0, 0);

        mirrorFpsCounter++;
        const now = Date.now();
        if (now - lastFpsTime >= 1000) {
            mirrorFpsBadge.textContent = `${mirrorFpsCounter} FPS`;
            mirrorFpsCounter = 0;
            lastFpsTime = now;
        }

        mirrorLoopTimeout = setTimeout(updateMirrorFrame, 40);
    };
    img.onerror = () => {
        if (isMirroring) mirrorLoopTimeout = setTimeout(updateMirrorFrame, 500);
    };
    img.src = `/api/adb/screenshot?deviceId=${target}&t=${Date.now()}`;
}

// High-Res Snapshot Button
snapScreenshotBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');

    showToast('📸 Ekran görüntüsü alınıyor...');
    const url = `/api/adb/screenshot?deviceId=${target}&t=${Date.now()}`;
    screenshotStaticImg.src = url;
    screenshotStaticImg.onload = () => {
        if (isMirroring) stopMirrorBtn.click();
        screenEmptyPlaceholder.style.display = 'none';
        screenMirrorCanvas.style.display = 'none';
        screenshotStaticImg.style.display = 'block';
        remoteBar.style.display = 'flex';
        showToast('✅ Ekran görüntüsü alındı!', 'var(--accent-green)');
    };
};

// 💾 RESMİ FARKLI KAYDET (SAVE AS) - DIALOG ASKS WHERE TO SAVE
saveScreenshotAsBtn.onclick = async () => {
    let blob = null;

    if (screenshotStaticImg.style.display !== 'none' && screenshotStaticImg.src) {
        try {
            const res = await fetch(screenshotStaticImg.src);
            blob = await res.blob();
        } catch (e) {}
    } else if (screenMirrorCanvas.style.display !== 'none' && screenMirrorCanvas.width > 0) {
        blob = await new Promise(resolve => screenMirrorCanvas.toBlob(resolve, 'image/png'));
    }

    if (!blob) {
        showToast('⚠️ Önce ekran görüntüsü almalı veya canlı yayını başlatmalısınız!', 'var(--accent-red)');
        return;
    }

    const defaultFilename = `Ekran_${new Date().toISOString().slice(0,10)}_${Date.now().toString().slice(-4)}.png`;

    // Modern Chrome/Edge showSaveFilePicker
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: 'PNG Resmi',
                    accept: { 'image/png': ['.png'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            showToast('💾 Resim seçtiğiniz konuma başarıyla kaydedildi!', 'var(--accent-green)');
            return;
        } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled
        }
    }

    // Standard download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('💾 Resim İndirilenler klasörüne kaydedildi!', 'var(--accent-green)');
};

// ==========================================
// 📜 RE-ENGINEERED SMART LOGCAT
// ==========================================
function setLogcatRunningUI(running) {
    isLogcatRunning = running;
    if (running) {
        startLogcatBtn.style.display = 'none';
        stopLogcatBtn.style.display = 'inline-flex';
        logcatStatusBadge.className = 'badge';
        logcatStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        logcatStatusBadge.style.color = '#10b981';
        logcatStatusBadge.textContent = '● Canlı Akıyor';
    } else {
        startLogcatBtn.style.display = 'inline-flex';
        stopLogcatBtn.style.display = 'none';
        logcatStatusBadge.className = 'badge badge-purple';
        logcatStatusBadge.textContent = 'Durduruldu';
    }
}

startLogcatBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_LOGCAT',
            deviceId: target
        }));
        setLogcatRunningUI(true);
        showToast('📜 Logcat başlatıldı');
    }
};

stopLogcatBtn.onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'STOP_LOGCAT' }));
    }
    setLogcatRunningUI(false);
    showToast('⏹️ Logcat tamamen durduruldu');
};

clearLogcatBtn.onclick = () => {
    logcatEntries = [];
    terminalWindow.innerHTML = '';
    if (ws && ws.readyState === WebSocket.OPEN) {
        const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
        if (target) ws.send(JSON.stringify({ action: 'CLEAR_LOGCAT', deviceId: target }));
    }
    showToast('🗑️ Loglar temizlendi');
};

copyLogcatBtn.onclick = () => {
    const text = logcatEntries.map(e => e.raw).join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Loglar panoya kopyalandı!', 'var(--accent-green)');
    });
};

exportLogcatBtn.onclick = () => {
    const text = logcatEntries.map(e => e.raw).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat_${new Date().toISOString().slice(0,10)}_${Date.now().toString().slice(-4)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Log dosyası indirildi!', 'var(--accent-green)');
};

// Filter changes
logcatLevelSelect.onchange = reFilterLogs;
logcatSearchInput.oninput = reFilterLogs;

function parseLogLine(raw) {
    // threadtime format: 09-17 23:45:12.123 1234 5678 I Tag: Message
    const match = raw.match(/^\S+\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+\d+\s+\d+\s+([VDIWEF])\s+([^:]+):\s*(.*)$/);
    if (match) {
        return {
            time: match[1],
            levelChar: match[2],
            tag: match[3].trim(),
            msg: match[4],
            raw
        };
    }
    // Fallback
    let levelChar = 'I';
    if (/ E |FATAL|Exception|Error|CRASH/i.test(raw)) levelChar = 'E';
    else if (/ W |Warning/i.test(raw)) levelChar = 'W';
    else if (/ D /i.test(raw)) levelChar = 'D';

    return {
        time: '',
        levelChar,
        tag: '',
        msg: raw,
        raw
    };
}

function handleLogcatLine(raw) {
    const parsed = parseLogLine(raw);
    logcatEntries.push(parsed);
    if (logcatEntries.length > MAX_LOGCAT_ENTRIES) {
        logcatEntries.shift();
    }

    if (matchesFilter(parsed)) {
        renderSingleLog(parsed);
    }
}

function matchesFilter(item) {
    const selectedLevel = logcatLevelSelect.value;
    if (selectedLevel === 'ERROR') {
        if (item.levelChar !== 'E' && item.levelChar !== 'F') return false;
    } else if (selectedLevel === 'WARN') {
        if (item.levelChar !== 'E' && item.levelChar !== 'F' && item.levelChar !== 'W') return false;
    } else if (selectedLevel === 'INFO') {
        if (item.levelChar === 'D' || item.levelChar === 'V') return false;
    }

    const query = logcatSearchInput.value.trim().toLowerCase();
    if (query) {
        const full = `${item.tag} ${item.msg}`.toLowerCase();
        if (!full.includes(query)) return false;
    }

    return true;
}

function renderSingleLog(item) {
    const div = document.createElement('div');
    div.className = 'log-entry';

    if (item.levelChar === 'E' || item.levelChar === 'F') div.classList.add('error');
    else if (item.levelChar === 'W') div.classList.add('warn');
    else div.classList.add('info');

    let html = '';
    if (item.time) html += `<span class="log-time">${item.time}</span>`;
    if (item.tag) html += `<span class="log-tag">[${item.tag}]</span>`;
    html += `<span class="log-msg">${escapeHtml(item.msg || item.raw)}</span>`;

    div.innerHTML = html;
    terminalWindow.appendChild(div);

    if (terminalWindow.children.length > MAX_LOGCAT_ENTRIES) {
        terminalWindow.removeChild(terminalWindow.firstChild);
    }

    if (logcatAutoscrollCheckbox.checked) {
        terminalWindow.scrollTop = terminalWindow.scrollHeight;
    }
}

function reFilterLogs() {
    terminalWindow.innerHTML = '';
    const filtered = logcatEntries.filter(matchesFilter);
    for (const item of filtered) {
        renderSingleLog(item);
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Init
loadQrCode();
connectWs();
loadAdbPairingQr();