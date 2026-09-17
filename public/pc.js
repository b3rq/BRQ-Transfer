let currentApks = [];
let currentDevices = [];
let selectedDevice = '';
let isSoundEnabled = localStorage.getItem('unitydrop_sound') !== 'false';
let currentLang = localStorage.getItem('unitydrop_lang') || 'tr';
let ws = null;
let isLogcatRunning = false;

// i18n Dictionary
const i18n = {
  tr: {
    tagline: 'Unity için Yerel Wi-Fi APK Dağıtım, Kablosuz ADB & Canlı Test Hub\'ı',
    btnMobile: 'Mobil Arayüz',
    tabDeploy: 'Builds & Dağıtım',
    tabAdb: 'Kablosuz ADB & Cihazlar',
    tabDevtools: 'Canlı Test Araçları (Logcat & Ekran)',
    tabGuide: 'Unity & Kurulum Rehberi',
    dropTitle: '📤 APK Sürükle & Bırak',
    dropText: 'APK Dosyasını Buraya Bırakın',
    dropSub: 'veya dosya seçmek için tıklayın',
    watchTitle: '📂 Unity Build Klasörü İzleyici',
    watchDesc: 'Unity\'de APK çıktısını aldığınız klasörü seçin; build bittiğinde otomatik hazır olur:',
    btnSave: 'Kaydet',
    qrTitle: '📱 Telefon Kamerasıyla Bağlan',
    qrDesc: 'Aynı Wi-Fi ağındayken telefon kameranızı tutun:',
    apkListTitle: 'Hazır APK\'lar',
    noApkText: 'Henüz APK bulunmuyor. Unity\'den build alabilir veya yukarıya bir APK sürükleyebilirsiniz.',
    adbTitle: 'Bağlı Cihazlar & Kablosuz ADB',
    soundOn: 'Ses Açık',
    soundOff: 'Ses Kapalı'
  },
  en: {
    tagline: 'Local Wi-Fi APK Distribution, Wireless ADB & Live Testing Hub for Unity',
    btnMobile: 'Mobile Web App',
    tabDeploy: 'Builds & Deploy',
    tabAdb: 'Wireless ADB & Devices',
    tabDevtools: 'Live DevTools (Logcat & Screen)',
    tabGuide: 'Unity & Setup Guide',
    dropTitle: '📤 Drag & Drop APK',
    dropText: 'Drop your APK file here',
    dropSub: 'or click to browse from computer',
    watchTitle: '📂 Unity Build Watcher',
    watchDesc: 'Specify your Unity build folder; new builds are deployed automatically:',
    btnSave: 'Save',
    qrTitle: '📱 Scan with Phone Camera',
    qrDesc: 'Point your camera when connected to the same Wi-Fi:',
    apkListTitle: 'Available APKs',
    noApkText: 'No APKs found yet. Build from Unity or drop an APK above.',
    adbTitle: 'Connected Devices & Wireless ADB',
    soundOn: 'Sound On',
    soundOff: 'Muted'
  }
};

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
const adbIpInput = document.getElementById('adb-ip-input');
const adbConnectBtn = document.getElementById('adb-connect-btn');
const autoAdbCheckbox = document.getElementById('auto-adb-checkbox');
const autoLaunchCheckbox = document.getElementById('auto-launch-checkbox');
const watchFolderInput = document.getElementById('watch-folder-input');
const saveWatchBtn = document.getElementById('save-watch-btn');
const currentWatchLabel = document.getElementById('current-watch-label');
const activeDeviceIndicator = document.getElementById('active-device-indicator');
const toast = document.getElementById('toast');

// DevTools Elements
const terminalWindow = document.getElementById('terminal-window');
const startLogcatBtn = document.getElementById('start-logcat-btn');
const stopLogcatBtn = document.getElementById('stop-logcat-btn');
const clearLogcatBtn = document.getElementById('clear-logcat-btn');
const logcatFilterInput = document.getElementById('logcat-filter-input');
const takeScreenshotBtn = document.getElementById('take-screenshot-btn');
const screenshotImg = document.getElementById('screenshot-img');
const screenshotPlaceholder = document.getElementById('screenshot-placeholder');

// Audio Synthesizer (Chime)
function playChime() {
    if (!isSoundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
        gain2.gain.setValueAtTime(0.25, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.7);
    } catch (e) {
        console.warn('Audio not allowed yet:', e);
    }
}

// Toast
function showToast(message, color = 'var(--accent-blue)', duration = 4000) {
    toast.textContent = message;
    toast.style.borderColor = color;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// Language Toggle
function updateLanguage() {
    const texts = i18n[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) el.textContent = texts[key];
    });
    langLabel.textContent = currentLang === 'tr' ? 'EN' : 'TR';
    soundStatus.textContent = isSoundEnabled ? texts.soundOn : texts.soundOff;
}

langToggleBtn.onclick = () => {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    localStorage.setItem('unitydrop_lang', currentLang);
    updateLanguage();
};

soundToggleBtn.onclick = () => {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('unitydrop_sound', isSoundEnabled);
    updateLanguage();
    if (isSoundEnabled) playChime();
};

// Tabs Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) target.style.display = 'block';
    };
});

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
        } else if (data.type === 'LOGCAT_LINE') {
            appendLogcatLine(data.line);
        }
    };

    ws.onclose = () => {
        setTimeout(connectWs, 2000);
    };
}

// Fetch QR Code
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
            ${i18n[currentLang].noApkText}
          </p>
        `;
        return;
    }

    apkListContainer.innerHTML = currentApks.map(apk => `
      <div class="apk-card">
        <div class="apk-header">
          <div class="apk-title">
            <span>🎮</span> ${apk.label || apk.name}
          </div>
          <span class="badge ${apk.source === 'unity-watcher' || apk.source === 'unity-build-hook' ? 'badge-purple' : 'badge-blue'}">
            ${apk.source === 'unity-watcher' || apk.source === 'unity-build-hook' ? '⚡ Unity' : '📥 Dosya'}
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

// Render ADB Devices
function renderDevices() {
    if (currentDevices.length === 0) {
        devicesList.innerHTML = `
          <div style="font-size: 13px; color: var(--text-muted); padding: 12px 0;">
            ⚠️ Bağlı cihaz yok. Telefonunuzu USB ile bağlayın veya aşağıdan kablosuz IP:Port ile bağlanın.
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
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm" onclick="quickScreenshot('${d.id}')">📸 Ekran Al</button>
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
            showToast('✅ Unity klasörü kaydedildi!', 'var(--accent-green)');
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

// Connect Wireless ADB
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

// Logcat DevTools
startLogcatBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');
    if (ws && ws.readyState === WebSocket.OPEN) {
        terminalWindow.innerHTML = '';
        ws.send(JSON.stringify({
            action: 'START_LOGCAT',
            deviceId: target,
            filter: logcatFilterInput.value.trim()
        }));
        isLogcatRunning = true;
        startLogcatBtn.style.display = 'none';
        stopLogcatBtn.style.display = 'inline-flex';
        showToast('📜 Logcat akışı başlatıldı');
    }
};

stopLogcatBtn.onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'STOP_LOGCAT' }));
    }
    isLogcatRunning = false;
    startLogcatBtn.style.display = 'inline-flex';
    stopLogcatBtn.style.display = 'none';
    showToast('⏹️ Logcat durduruldu');
};

clearLogcatBtn.onclick = () => {
    terminalWindow.innerHTML = '';
};

function appendLogcatLine(line) {
    const div = document.createElement('div');
    div.className = 'terminal-line';
    if (line.includes(' E ') || line.includes('Error') || line.includes('Exception') || line.includes('CRASH')) {
        div.classList.add('error');
    } else if (line.includes(' W ') || line.includes('Warning')) {
        div.classList.add('warn');
    } else if (line.includes('Unity')) {
        div.classList.add('unity');
    }
    div.textContent = line;
    terminalWindow.appendChild(div);

    // Keep max 600 lines
    if (terminalWindow.children.length > 600) {
        terminalWindow.removeChild(terminalWindow.firstChild);
    }
    terminalWindow.scrollTop = terminalWindow.scrollHeight;
}

// Screenshot DevTools
window.quickScreenshot = (deviceId) => {
    document.querySelector('[data-tab="tab-devtools"]').click();
    takeScreenshot(deviceId);
};

takeScreenshotBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');
    takeScreenshot(target);
};

function takeScreenshot(deviceId) {
    showToast('📸 Ekran görüntüsü alınıyor...');
    const url = `/api/adb/screenshot?deviceId=${deviceId}&t=${Date.now()}`;
    screenshotImg.src = url;
    screenshotImg.onload = () => {
        screenshotImg.style.display = 'block';
        screenshotPlaceholder.style.display = 'none';
        showToast('✅ Ekran görüntüsü alındı!', 'var(--accent-green)');
    };
    screenshotImg.onerror = () => {
        showToast('Ekran görüntüsü alınamadı', 'var(--accent-red)');
    };
}

// Init
updateLanguage();
loadQrCode();
connectWs();