// State
let ws = null;
let currentApks = [];
let currentDevices = [];
let selectedDevice = '';
let isSoundEnabled = localStorage.getItem('apkdrop_sound') !== 'false';
let isLogcatRunning = false;
let isWebStreaming = false;
let jmuxerInstance = null;
let phonePhysicalWidth = 1440;
let phonePhysicalHeight = 3040;
let isTouchDown = false;
let touchStartX = 0;
let touchStartY = 0;
let lastPairedIp = '192.168.137.74';

// DOM Elements
const apkListContainer = document.getElementById('apk-list-container');
const apkCountSpan = document.getElementById('apk-count');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const watchFolderInput = document.getElementById('watch-folder-input');
const saveWatchBtn = document.getElementById('save-watch-btn');
const currentWatchLabel = document.getElementById('current-watch-label');
const autoAdbCheckbox = document.getElementById('auto-adb-checkbox');
const autoLaunchCheckbox = document.getElementById('auto-launch-checkbox');
const quickDeviceStatus = document.getElementById('quick-device-status');
const activeDeviceIndicator = document.getElementById('active-device-indicator');

// ADB Elements
const adbQrImg = document.getElementById('adb-qr-img');
const adbPairStatusBadge = document.getElementById('adb-pair-status-badge');
const refreshAdbQrBtn = document.getElementById('refresh-adb-qr-btn');
const quickPortBox = document.getElementById('quick-port-box');
const pairedIpLabel = document.getElementById('paired-ip-label');
const quickPortInput = document.getElementById('quick-port-input');
const quickPortBtn = document.getElementById('quick-port-btn');
const devicesList = document.getElementById('devices-list');
const adbIpInput = document.getElementById('adb-ip-input');
const adbConnectBtn = document.getElementById('adb-connect-btn');
const tcpipBtn = document.getElementById('tcpip-btn');
const refreshDevicesBtn = document.getElementById('refresh-devices-btn');

// In-Browser Screen Stream Elements
const screenVideo = document.getElementById('screen-video');
const screenshotStaticImg = document.getElementById('screenshot-static-img');
const screenEmptyPlaceholder = document.getElementById('screen-empty-placeholder');
const startWebStreamBtn = document.getElementById('start-web-stream-btn');
const stopWebStreamBtn = document.getElementById('stop-web-stream-btn');
const snapScreenshotBtn = document.getElementById('snap-screenshot-btn');
const saveScreenshotAsBtn = document.getElementById('save-screenshot-as-btn');
const screenStreamStatusBadge = document.getElementById('screen-stream-status-badge');
const remoteBar = document.getElementById('remote-bar');

// Logcat Elements
const logcatStatusBadge = document.getElementById('logcat-status-badge');
const startLogcatBtn = document.getElementById('start-logcat-btn');
const stopLogcatBtn = document.getElementById('stop-logcat-btn');
const clearLogcatBtn = document.getElementById('clear-logcat-btn');
const copyLogcatBtn = document.getElementById('copy-logcat-btn');
const exportLogcatBtn = document.getElementById('export-logcat-btn');
const logcatLevelSelect = document.getElementById('logcat-level-select');
const logcatSearchInput = document.getElementById('logcat-search-input');
const logcatAutoscrollCheckbox = document.getElementById('logcat-autoscroll-checkbox');
const terminalWindow = document.getElementById('terminal-window');

// Toast & Sound
const toast = document.getElementById('toast');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundStatus = document.getElementById('sound-status');

// Chime generator
function playChime() {
    if (!isSoundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
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

// Quick Port Connect
if (quickPortBtn) {
    quickPortBtn.onclick = async () => {
        const port = quickPortInput.value.trim();
        if (!port) {
            showToast('⚠️ Lütfen telefonunuzda görünen 5 haneli bağlantı portunu yazın!', 'var(--accent-red)');
            return;
        }
        const ip = lastPairedIp || '192.168.137.74';
        showToast(`⚡ ${ip}:${port} adresine bağlanılıyor...`);
        try {
            const res = await fetch('/api/adb/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`🎉 Başarıyla bağlandı! (${ip}:${port})`, 'var(--accent-green)', 6000);
                playChime();
                if (quickPortBox) quickPortBox.style.display = 'none';
                adbPairStatusBadge.className = 'badge';
                adbPairStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
                adbPairStatusBadge.style.color = '#10b981';
                adbPairStatusBadge.textContent = `🎉 Bağlandı: ${ip}:${port}`;
                refreshDevices();
            } else {
                showToast(`Bağlantı hatası: ${data.error}`, 'var(--accent-red)', 6000);
            }
        } catch (e) {
            showToast(`Hata: ${e.message}`, 'var(--accent-red)');
        }
    };
}

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

// ==========================================
// 📺 TARAYICI İÇİ 60 FPS CANLI EKRAN (JMUXER)
// ==========================================
async function fetchDisplaySize(deviceId) {
    try {
        const res = await fetch(`/api/adb/display-size?deviceId=${encodeURIComponent(deviceId)}`);
        const data = await res.json();
        if (data && data.width && data.height) {
            phonePhysicalWidth = data.width;
            phonePhysicalHeight = data.height;
        }
    } catch (e) {}
}

function initJMuxer() {
    if (jmuxerInstance) {
        try { jmuxerInstance.destroy(); } catch (e) {}
    }
    jmuxerInstance = new JMuxer({
        node: 'screen-video',
        mode: 'video',
        flushingTime: 0,
        fps: 60,
        clearBuffer: true,
        debug: false
    });
}

function startWebScreenStream() {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Önce bir Android cihaz bağlamalısınız!', 'var(--accent-red)');

    fetchDisplaySize(target);

    isWebStreaming = true;
    startWebStreamBtn.style.display = 'none';
    stopWebStreamBtn.style.display = 'inline-flex';
    screenEmptyPlaceholder.style.display = 'none';
    screenshotStaticImg.style.display = 'none';
    screenVideo.style.display = 'block';
    remoteBar.style.display = 'flex';
    screenStreamStatusBadge.className = 'badge';
    screenStreamStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
    screenStreamStatusBadge.style.color = '#10b981';
    screenStreamStatusBadge.textContent = '🟢 60 FPS Canlı Akıyor';

    initJMuxer();

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_SCREEN_STREAM',
            deviceId: target
        }));
    }

    showToast('📺 Tarayıcı içi 60 FPS canlı ekran başlatıldı', 'var(--accent-green)');
}

function stopWebScreenStream() {
    isWebStreaming = false;
    startWebStreamBtn.style.display = 'inline-flex';
    stopWebStreamBtn.style.display = 'none';
    screenStreamStatusBadge.className = 'badge badge-purple';
    screenStreamStatusBadge.textContent = 'Durduruldu';

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'STOP_SCREEN_STREAM' }));
    }

    if (jmuxerInstance) {
        try { jmuxerInstance.destroy(); } catch (e) {}
        jmuxerInstance = null;
    }

    showToast('⏹️ Canlı yayın durduruldu');
}

if (startWebStreamBtn) startWebStreamBtn.onclick = startWebScreenStream;
if (stopWebStreamBtn) stopWebStreamBtn.onclick = stopWebScreenStream;

// Interactive Touch & Drag on Video element
function getScaledTouchCoords(e) {
    const rect = screenVideo.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = phonePhysicalWidth / rect.width;
    const scaleY = phonePhysicalHeight / rect.height;

    return {
        x: Math.round(clickX * scaleX),
        y: Math.round(clickY * scaleY)
    };
}

screenVideo.onmousedown = (e) => {
    if (e.button !== 0) return; // Only left click
    isTouchDown = true;
    const coords = getScaledTouchCoords(e);
    touchStartX = coords.x;
    touchStartY = coords.y;
};

screenVideo.onmouseup = (e) => {
    if (!isTouchDown || e.button !== 0) return;
    isTouchDown = false;
    const coords = getScaledTouchCoords(e);

    const dist = Math.hypot(coords.x - touchStartX, coords.y - touchStartY);
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return;

    if (dist < 18) {
        // Simple Tap
        fetch('/api/adb/touch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId: target,
                type: 'tap',
                x: coords.x,
                y: coords.y
            })
        });
    } else {
        // Swipe / Drag
        fetch('/api/adb/touch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId: target,
                type: 'swipe',
                x: touchStartX,
                y: touchStartY,
                x2: coords.x,
                y2: coords.y
            })
        });
    }
};

screenVideo.oncontextmenu = (e) => {
    e.preventDefault();
    // Right click = Back key
    sendRemoteKey(4);
    showToast('◀ Geri (Back)', 'var(--accent-blue)', 1500);
};

// Snapshot from Video
snapScreenshotBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('⚠️ Cihaz bağlı değil', 'var(--accent-red)');

    if (isWebStreaming && screenVideo.style.display !== 'none' && screenVideo.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        screenshotStaticImg.src = canvas.toDataURL('image/png');
        stopWebScreenStream();
        screenEmptyPlaceholder.style.display = 'none';
        screenVideo.style.display = 'none';
        screenshotStaticImg.style.display = 'block';
        remoteBar.style.display = 'flex';
        showToast('✅ Fotoğraf anında yakalandı!', 'var(--accent-green)');
    } else {
        showToast('📸 Ekran görüntüsü alınıyor...');
        const url = `/api/adb/screenshot?deviceId=${encodeURIComponent(target)}&t=${Date.now()}`;
        screenshotStaticImg.src = url;
        screenshotStaticImg.onload = () => {
            if (isWebStreaming) stopWebScreenStream();
            screenEmptyPlaceholder.style.display = 'none';
            screenVideo.style.display = 'none';
            screenshotStaticImg.style.display = 'block';
            remoteBar.style.display = 'flex';
            showToast('✅ Ekran görüntüsü alındı!', 'var(--accent-green)');
        };
    }
};

// 💾 Save As File Dialog
saveScreenshotAsBtn.onclick = async () => {
    let blob = null;

    if (screenshotStaticImg.style.display !== 'none' && screenshotStaticImg.src) {
        try {
            const res = await fetch(screenshotStaticImg.src);
            blob = await res.blob();
        } catch (e) {}
    } else if (isWebStreaming && screenVideo.style.display !== 'none' && screenVideo.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    }

    if (!blob) {
        showToast('⚠️ Önce fotoğraf çekmeli veya yayını başlatmalısınız!', 'var(--accent-red)');
        return;
    }

    const defaultFilename = `Ekran_${new Date().toISOString().slice(0,10)}_${Date.now().toString().slice(-4)}.png`;

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
            if (err.name === 'AbortError') return;
        }
    }

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

// WebSocket Connection
function connectWs() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = (event) => {
        // Handle binary H.264 video chunks for jMuxer
        if (event.data instanceof ArrayBuffer) {
            if (jmuxerInstance && isWebStreaming) {
                jmuxerInstance.feed({
                    video: new Uint8Array(event.data)
                });
            }
            return;
        }

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
                handleAdbPairStatus(data.pairingSession);
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
            currentDevices = data.devices || [];
            renderDevices();
        } else if (data.type === 'ADB_PAIR_STATUS') {
            handleAdbPairStatus(data.session);
        } else if (data.type === 'SCREEN_STREAM_STATUS') {
            if (!data.running && isWebStreaming) {
                stopWebScreenStream();
            }
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
    if (!adbPairStatusBadge || !session) return;
    adbPairStatusBadge.textContent = session.message;

    if (session.pairedIp) {
        lastPairedIp = session.pairedIp;
        if (pairedIpLabel) pairedIpLabel.textContent = `${session.pairedIp}:`;
        if (adbIpInput && !adbIpInput.value) adbIpInput.value = `${session.pairedIp}:`;
    }

    if (session.status === 'pairing') {
        adbPairStatusBadge.className = 'badge';
        adbPairStatusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
        adbPairStatusBadge.style.color = '#f59e0b';
    } else if (session.status === 'paired_need_port') {
        adbPairStatusBadge.className = 'badge';
        adbPairStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        adbPairStatusBadge.style.color = '#10b981';
        if (quickPortBox) {
            quickPortBox.style.display = 'block';
            quickPortInput.focus();
        }
        playChime();
        showToast('🎉 Telefon eşleşti! Şimdi ekranda görünen 5 haneli bağlantı portunu girin.', 'var(--accent-green)', 8000);
    } else if (session.status === 'connected') {
        if (quickPortBox) quickPortBox.style.display = 'none';
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
    if (!currentDevices || currentDevices.length === 0) {
        devicesList.innerHTML = `
          <div style="font-size: 13px; color: var(--text-muted); padding: 12px 0;">
            ⚠️ Bağlı cihaz yok. Sol taraftaki <b>QR Kodu</b> telefonunuzdan taratarak veya aşağıdan IP:Port girerek bağlayabilirsiniz.
          </div>
        `;
        activeDeviceIndicator.textContent = 'Cihaz: Yok';
        if (quickDeviceStatus) quickDeviceStatus.textContent = 'Bağlı cihaz yok';
        return;
    }

    if (!selectedDevice || !currentDevices.some(d => d.id === selectedDevice)) {
        selectedDevice = currentDevices[0].id;
    }

    activeDeviceIndicator.textContent = `Cihaz: ${selectedDevice}`;
    if (quickDeviceStatus) {
        const cur = currentDevices.find(d => d.id === selectedDevice) || currentDevices[0];
        quickDeviceStatus.textContent = `✅ ${cur.model} (${cur.id})`;
    }

    devicesList.innerHTML = currentDevices.map(d => `
      <div class="device-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.02);">
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
    renderDevices();
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
    showToast(`Otomatik başlatma: ${autoLaunchCheckbox.checked ? 'Açık' : 'Kapalı'}`);
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
    if (!target) return showToast('⚠️ Logcat için bağlı bir Android cihaz seçilmelidir!', 'var(--accent-red)');

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_LOGCAT',
            deviceId: target,
            level: logcatLevelSelect.value,
            filter: logcatSearchInput.value.trim()
        }));
        setLogcatRunningUI(true);
        showToast('📜 Logcat canlı akışı başlatıldı');
    }
};

stopLogcatBtn.onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'STOP_LOGCAT' }));
    }
    setLogcatRunningUI(false);
    showToast('⏹️ Logcat durduruldu');
};

clearLogcatBtn.onclick = () => {
    terminalWindow.innerHTML = '';
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'CLEAR_LOGCAT', deviceId: target }));
    }
    showToast('🗑️ Log penceresi temizlendi');
};

copyLogcatBtn.onclick = () => {
    const text = Array.from(terminalWindow.querySelectorAll('.log-entry'))
        .map(el => el.innerText)
        .join('\n');
    if (!text) return showToast('Kopyalanacak log yok', 'var(--accent-orange)');
    navigator.clipboard.writeText(text);
    showToast('📋 Loglar panoya kopyalandı!', 'var(--accent-green)');
};

exportLogcatBtn.onclick = () => {
    const text = Array.from(terminalWindow.querySelectorAll('.log-entry'))
        .map(el => el.innerText)
        .join('\n');
    if (!text) return showToast('Dışa aktarılacak log yok', 'var(--accent-orange)');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat_export_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Log dosyası kaydedildi!', 'var(--accent-green)');
};

// Filter change reactions
logcatLevelSelect.onchange = applyLogcatFilter;
logcatSearchInput.oninput = applyLogcatFilter;

function applyLogcatFilter() {
    const level = logcatLevelSelect.value;
    const search = logcatSearchInput.value.toLowerCase().trim();

    const entries = terminalWindow.querySelectorAll('.log-entry');
    entries.forEach(entry => {
        const text = entry.innerText.toLowerCase();
        let matchesLevel = true;

        if (level === 'ERROR') {
            matchesLevel = entry.classList.contains('error');
        } else if (level === 'WARN') {
            matchesLevel = entry.classList.contains('warn') || entry.classList.contains('error');
        } else if (level === 'INFO') {
            matchesLevel = entry.classList.contains('info') || entry.classList.contains('warn') || entry.classList.contains('error');
        }

        const matchesSearch = !search || text.includes(search);
        entry.style.display = (matchesLevel && matchesSearch) ? 'block' : 'none';
    });
}

function handleLogcatLine(rawLine) {
    if (!rawLine) return;

    let type = 'debug';
    if (rawLine.includes(' E ') || rawLine.includes('E/') || rawLine.includes('FATAL') || rawLine.includes('Exception') || rawLine.includes('CRASH')) {
        type = 'error';
    } else if (rawLine.includes(' W ') || rawLine.includes('W/')) {
        type = 'warn';
    } else if (rawLine.includes(' I ') || rawLine.includes('I/')) {
        type = 'info';
    }

    const currentFilterLevel = logcatLevelSelect.value;
    if (currentFilterLevel === 'ERROR' && type !== 'error') return;
    if (currentFilterLevel === 'WARN' && type !== 'error' && type !== 'warn') return;
    if (currentFilterLevel === 'INFO' && type === 'debug') return;

    const search = logcatSearchInput.value.toLowerCase().trim();
    if (search && !rawLine.toLowerCase().includes(search)) return;

    const div = document.createElement('div');
    div.className = `log-entry ${type}`;

    const timeMatch = rawLine.match(/^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)/);
    const timeStr = timeMatch ? timeMatch[1] : '';
    const bodyText = timeMatch ? rawLine.substring(timeMatch[1].length).trim() : rawLine;

    div.innerHTML = `
      ${timeStr ? `<span class="log-time">${timeStr}</span>` : ''}
      <span class="badge" style="font-size: 10px; padding: 1px 6px; margin-right: 6px; ${
          type === 'error' ? 'background: rgba(239, 68, 68, 0.25); color: #f87171;' :
          type === 'warn' ? 'background: rgba(245, 158, 11, 0.25); color: #fbbf24;' :
          type === 'info' ? 'background: rgba(56, 189, 248, 0.25); color: #38bdf8;' :
          'background: rgba(255, 255, 255, 0.05); color: #94a3b8;'
      }">${type.toUpperCase()}</span>
      <span>${escapeHtml(bodyText)}</span>
    `;

    terminalWindow.appendChild(div);

    if (terminalWindow.children.length > 800) {
        terminalWindow.removeChild(terminalWindow.firstChild);
    }

    if (logcatAutoscrollCheckbox.checked) {
        terminalWindow.scrollTop = terminalWindow.scrollHeight;
    }
}

function escapeHtml(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Initialize
connectWs();
