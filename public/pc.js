// ==========================================================================
// ApkDrop Engineering Console - Client Controller
// ==========================================================================

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

// Theme Controller (Dark / Light)
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apkdrop_theme', theme);
}

const initialTheme = localStorage.getItem('apkdrop_theme') || 'dark';
applyTheme(initialTheme);

if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    };
}

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
const headerDevicePill = document.getElementById('header-device-pill');
const headerDeviceText = document.getElementById('header-device-text');

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

// Mirror Elements
const screenVideo = document.getElementById('screen-video');
const screenshotStaticImg = document.getElementById('screenshot-static-img');
const screenEmptyPlaceholder = document.getElementById('screen-empty-placeholder');
const startWebStreamBtn = document.getElementById('start-web-stream-btn');
const stopWebStreamBtn = document.getElementById('stop-web-stream-btn');
const snapScreenshotBtn = document.getElementById('snap-screenshot-btn');
const saveScreenshotAsBtn = document.getElementById('save-screenshot-as-btn');
const screenStreamStatusBadge = document.getElementById('screen-stream-status-badge');
const streamDot = document.getElementById('stream-dot');
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
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {}
}

function showToast(message, color = 'var(--border-focus)', duration = 3500) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.borderColor = color;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// Sound toggle
if (soundToggleBtn) {
    soundToggleBtn.onclick = () => {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem('apkdrop_sound', isSoundEnabled);
        if (soundStatus) soundStatus.textContent = isSoundEnabled ? 'Ses Açık' : 'Ses Kapalı';
        soundToggleBtn.style.opacity = isSoundEnabled ? '1' : '0.4';
        if (isSoundEnabled) playChime();
    };
    soundToggleBtn.style.opacity = isSoundEnabled ? '1' : '0.4';
}

// Navigation Tabs
document.querySelectorAll('.nav-item, .tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-item, .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) {
            target.classList.add('active');
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
    if (adbPairStatusBadge) adbPairStatusBadge.textContent = 'Generating pairing QR...';
    try {
        const res = await fetch('/api/adb/pairing-qr');
        const data = await res.json();
        if (data.success) {
            adbQrImg.src = data.qrDataUrl;
            if (adbPairStatusBadge) adbPairStatusBadge.textContent = data.message || 'Scan QR from Wireless Debugging screen.';
        }
    } catch (e) {
        if (adbPairStatusBadge) adbPairStatusBadge.textContent = 'Failed to generate QR';
    }
}

if (refreshAdbQrBtn) refreshAdbQrBtn.onclick = loadAdbPairingQr;

// Quick Port Connect
if (quickPortBtn) {
    quickPortBtn.onclick = async () => {
        const port = quickPortInput.value.trim();
        if (!port) {
            showToast('Enter 5-digit wireless port', 'var(--danger)');
            return;
        }
        const ip = lastPairedIp || '192.168.137.74';
        showToast(`Connecting to ${ip}:${port}...`);
        try {
            const res = await fetch('/api/adb/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Connected: ${ip}:${port}`, 'var(--success)');
                playChime();
                if (quickPortBox) quickPortBox.style.display = 'none';
                if (adbPairStatusBadge) adbPairStatusBadge.textContent = `Connected: ${ip}:${port}`;
                refreshDevices();
            } else {
                showToast(`Connection failed: ${data.error}`, 'var(--danger)', 5000);
            }
        } catch (e) {
            showToast(`Error: ${e.message}`, 'var(--danger)');
        }
    };
}

// USB to TCP/IP
if (tcpipBtn) {
    tcpipBtn.onclick = async () => {
        showToast('Enabling TCP/IP on port 5555...');
        try {
            const res = await fetch('/api/adb/tcpip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: 5555 })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'var(--success)');
                refreshDevices();
            } else {
                showToast(`Error: ${data.error}`, 'var(--danger)');
            }
        } catch (e) {
            showToast(`Error: ${e.message}`, 'var(--danger)');
        }
    };
}

// Disconnect Device
window.disconnectDevice = async (deviceId) => {
    showToast(`Disconnecting ${deviceId}...`);
    try {
        const res = await fetch('/api/adb/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Disconnected: ${deviceId}`, 'var(--success)');
            refreshDevices();
        } else {
            showToast(`Error: ${data.error}`, 'var(--danger)');
        }
    } catch (e) {
        showToast(`Error: ${e.message}`, 'var(--danger)');
    }
};

// ==========================================
// 📺 60 FPS SCREEN STREAM (JMUXER)
// ==========================================
async function fetchDisplaySize(deviceId) {
    try {
        const res = await fetch(`/api/adb/display-size?deviceId=${encodeURIComponent(deviceId)}`);
        const data = await res.json();
        if (data && data.width && data.height) {
            phonePhysicalWidth = data.width;
            phonePhysicalHeight = data.height;
            const resChip = document.getElementById('stream-res-chip');
            if (resChip) resChip.textContent = `${data.width}x${data.height}`;
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
    if (!target) return showToast('No device connected', 'var(--danger)');

    fetchDisplaySize(target);

    isWebStreaming = true;
    startWebStreamBtn.style.display = 'none';
    stopWebStreamBtn.style.display = 'inline-flex';
    screenEmptyPlaceholder.style.display = 'none';
    screenshotStaticImg.style.display = 'none';
    screenVideo.style.display = 'block';
    remoteBar.style.display = 'flex';
    if (streamDot) streamDot.classList.add('active');
    if (screenStreamStatusBadge) {
        screenStreamStatusBadge.textContent = 'Live (60 FPS)';
        screenStreamStatusBadge.style.color = 'var(--success)';
    }

    initJMuxer();

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_SCREEN_STREAM',
            deviceId: target
        }));
    }

    showToast('Mirror stream active', 'var(--success)');
}

function stopWebScreenStream() {
    isWebStreaming = false;
    startWebStreamBtn.style.display = 'inline-flex';
    stopWebStreamBtn.style.display = 'none';
    if (streamDot) streamDot.classList.remove('active');
    if (screenStreamStatusBadge) {
        screenStreamStatusBadge.textContent = 'Idle';
        screenStreamStatusBadge.style.color = 'var(--text-tertiary)';
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'STOP_SCREEN_STREAM' }));
    }

    if (jmuxerInstance) {
        try { jmuxerInstance.destroy(); } catch (e) {}
        jmuxerInstance = null;
    }

    showToast('Stream stopped');
}

if (startWebStreamBtn) startWebStreamBtn.onclick = startWebScreenStream;
if (stopWebStreamBtn) stopWebStreamBtn.onclick = stopWebScreenStream;

// Touch & Drag on Video
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
    if (e.button !== 0) return;
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
    sendRemoteKey(4);
    showToast('Back key sent', 'var(--accent)', 1200);
};

// Snapshot from Video
snapScreenshotBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('No device connected', 'var(--danger)');

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
        showToast('Frame captured', 'var(--success)');
    } else {
        showToast('Capturing screenshot...');
        const url = `/api/adb/screenshot?deviceId=${encodeURIComponent(target)}&t=${Date.now()}`;
        screenshotStaticImg.src = url;
        screenshotStaticImg.onload = () => {
            if (isWebStreaming) stopWebScreenStream();
            screenEmptyPlaceholder.style.display = 'none';
            screenVideo.style.display = 'none';
            screenshotStaticImg.style.display = 'block';
            remoteBar.style.display = 'flex';
            showToast('Screenshot ready', 'var(--success)');
        };
    }
};

// Save As File Dialog
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
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } else {
        const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
        if (!target) return showToast('No device connected', 'var(--danger)');
        try {
            showToast('Generating snapshot...');
            const res = await fetch(`/api/adb/screenshot?deviceId=${encodeURIComponent(target)}&t=${Date.now()}`);
            blob = await res.blob();
        } catch (e) {}
    }

    if (!blob) return showToast('No frame available to save', 'var(--danger)');

    const defaultFilename = `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: 'PNG Image',
                    accept: { 'image/png': ['.png'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            showToast('Snapshot saved', 'var(--success)');
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
    showToast('Snapshot downloaded', 'var(--success)');
};

// Direct IP Connect
if (adbConnectBtn) {
    adbConnectBtn.onclick = async () => {
        const target = adbIpInput.value.trim();
        if (!target) return showToast('Enter IP:Port', 'var(--danger)');
        const parts = target.split(':');
        const ip = parts[0];
        const port = parts[1] || '5555';

        showToast(`Connecting to ${ip}:${port}...`);
        try {
            const res = await fetch('/api/adb/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Connected: ${ip}:${port}`, 'var(--success)');
                playChime();
                refreshDevices();
            } else {
                showToast(`Error: ${data.error}`, 'var(--danger)', 5000);
            }
        } catch (e) {
            showToast(`Error: ${e.message}`, 'var(--danger)');
        }
    };
}

// WebSocket Connection
function connectWs() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log('[WebSocket] Connected');
    };

    ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
            if (jmuxerInstance && isWebStreaming) {
                jmuxerInstance.feed({ video: new Uint8Array(event.data) });
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
                currentWatchLabel.textContent = data.config.watchFolder || 'Default watch folder';
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
            showToast(`Package indexed: ${data.apk.name}`, 'var(--success)');
        } else if (data.type === 'ADB_INSTALL_START') {
            showToast(`Installing: ${data.message}`, 'var(--warning)', 4000);
        } else if (data.type === 'ADB_INSTALL_SUCCESS') {
            showToast(`Installed: ${data.apkName}`, 'var(--success)', 4000);
        } else if (data.type === 'ADB_INSTALL_ERROR') {
            showToast(`Install error: ${data.error}`, 'var(--danger)', 6000);
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

    if (session.status === 'paired_need_port') {
        if (quickPortBox) {
            quickPortBox.style.display = 'block';
            quickPortInput.focus();
        }
        playChime();
        showToast('Pairing recognized. Enter 5-digit port.', 'var(--success)', 6000);
    } else if (session.status === 'connected') {
        if (quickPortBox) quickPortBox.style.display = 'none';
        playChime();
        showToast('Device paired and connected', 'var(--success)', 4000);
        refreshDevices();
    }
}

// Render APKs
function renderApks() {
    if (apkCountSpan) apkCountSpan.textContent = currentApks.length;
    if (currentApks.length === 0) {
        apkListContainer.innerHTML = `
          <div class="empty-view">
            <p class="empty-title">No packages detected</p>
            <p class="empty-sub">Drop an APK file or configure the build watcher on the left.</p>
          </div>
        `;
        return;
    }

    apkListContainer.innerHTML = currentApks.map(apk => `
      <div class="apk-card">
        <div class="apk-header">
          <div class="apk-title">${apk.label || apk.name}</div>
          <span class="tag-version">${apk.source === 'folder-watcher' ? 'Watcher' : 'Upload'}</span>
        </div>

        <div class="apk-pkg mono">${apk.packageName} &bull; ${apk.name}</div>

        <div class="apk-tags">
          <span class="apk-tag-pill">v${apk.versionName || '1.0'} (${apk.versionCode || '1'})</span>
          <span class="apk-tag-pill">${apk.size}</span>
          <span class="apk-tag-pill">SDK ${apk.minSdk || '24'}-${apk.targetSdk || '34'}</span>
          <span class="apk-tag-pill">${new Date(apk.updatedAt).toLocaleTimeString()}</span>
        </div>

        <div class="apk-actions">
          <button class="btn btn-primary btn-sm" onclick="installViaAdb('${apk.id}', '${apk.name}')">
            Install & Launch
          </button>
          <button class="btn btn-secondary btn-sm" onclick="launchApp('${apk.packageName}')" title="Launch app">
            Launch
          </button>
          <button class="btn btn-secondary btn-sm" onclick="stopApp('${apk.packageName}')" title="Force stop app">
            Stop
          </button>
          <a href="${apk.downloadUrl}" class="btn btn-secondary btn-sm" download="${apk.name}">
            Download
          </a>
        </div>
      </div>
    `).join('');
}

function updateHeaderDevicePill() {
    if (!headerDevicePill || !headerDeviceText) return;
    if (currentDevices && currentDevices.length > 0) {
        const cur = currentDevices.find(d => d.id === selectedDevice) || currentDevices[0];
        headerDevicePill.classList.add('connected');
        headerDeviceText.textContent = `${cur.model || cur.id}`;
    } else {
        headerDevicePill.classList.remove('connected');
        headerDeviceText.textContent = 'No Device';
    }
}

// Render ADB Devices
function renderDevices() {
    updateHeaderDevicePill();

    if (!currentDevices || currentDevices.length === 0) {
        devicesList.innerHTML = `
          <div class="loading-state">
            No devices attached. Scan QR code or enter IP:Port below.
          </div>
        `;
        if (activeDeviceIndicator) activeDeviceIndicator.textContent = 'Target: None';
        if (quickDeviceStatus) quickDeviceStatus.textContent = 'None';
        return;
    }

    if (!selectedDevice || !currentDevices.some(d => d.id === selectedDevice)) {
        selectedDevice = currentDevices[0].id;
    }

    if (activeDeviceIndicator) activeDeviceIndicator.textContent = `Target: ${selectedDevice}`;
    if (quickDeviceStatus) {
        const cur = currentDevices.find(d => d.id === selectedDevice) || currentDevices[0];
        quickDeviceStatus.textContent = `${cur.model} (${cur.id})`;
    }

    devicesList.innerHTML = currentDevices.map(d => `
      <div class="device-card">
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="radio" name="adb-device" value="${d.id}" ${d.id === selectedDevice ? 'checked' : ''} onchange="changeSelectedDevice('${d.id}')">
          <div>
            <div style="font-weight: 600; font-size: 13px;">${d.model}</div>
            <div style="font-size: 11px; color: var(--text-tertiary);" class="mono">${d.id} &bull; ${d.isWifi ? 'Wi-Fi' : 'USB'}</div>
          </div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="btn btn-secondary btn-sm" onclick="disconnectDevice('${d.id}')" title="Disconnect device">
            Disconnect
          </button>
          <span class="count-badge" style="color: var(--success);">Ready</span>
        </div>
      </div>
    `).join('');
}

window.changeSelectedDevice = (id) => {
    selectedDevice = id;
    if (activeDeviceIndicator) activeDeviceIndicator.textContent = `Target: ${selectedDevice}`;
    renderDevices();
    saveSettings();
};

window.installViaAdb = async (apkId, apkName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('No device connected', 'var(--danger)');
    showToast(`Deploying ${apkName}...`);
    try {
        const res = await fetch('/api/adb/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, apkId })
        });
        const data = await res.json();
        if (!data.success) showToast(`Error: ${data.error}`, 'var(--danger)');
    } catch (e) {
        showToast(`Error: ${e.message}`, 'var(--danger)');
    }
};

window.launchApp = async (packageName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('No device connected', 'var(--danger)');
    try {
        const res = await fetch('/api/adb/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, packageName })
        });
        const data = await res.json();
        showToast(data.success ? `Launched: ${packageName}` : `Failed: ${data.output}`);
    } catch (e) {
        showToast(`Error: ${e.message}`, 'var(--danger)');
    }
};

window.stopApp = async (packageName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('No device connected', 'var(--danger)');
    await fetch('/api/adb/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: target, packageName })
    });
    showToast(`Stopped: ${packageName}`);
};

window.sendRemoteKey = async (keyCode) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return;
    fetch('/api/adb/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: target, keyCode })
    });
};

// Settings Save
saveWatchBtn.onclick = async () => {
    const watchFolder = watchFolderInput.value.trim();
    showToast('Saving watcher path...');
    const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            watchFolder,
            autoInstallOnAdb: autoAdbCheckbox.checked,
            autoLaunchAfterInstall: autoLaunchCheckbox.checked
        })
    });
    const data = await res.json();
    if (data.success) {
        showToast('Watcher updated', 'var(--success)');
        currentWatchLabel.textContent = watchFolder || 'Default watch folder';
    } else {
        showToast(`Failed: ${data.error}`, 'var(--danger)');
    }
};

autoAdbCheckbox.onchange = saveSettings;
autoLaunchCheckbox.onchange = saveSettings;

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

refreshDevicesBtn.onclick = refreshDevices;

async function refreshDevices() {
    const res = await fetch('/api/adb/devices');
    currentDevices = await res.json();
    renderDevices();
    showToast('Device list refreshed');
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
        showToast('Only .apk files allowed', 'var(--danger)');
        return;
    }
    showToast(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append('apk', file);
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) showToast(`Package ready: ${file.name}`, 'var(--success)');
    } catch (e) {
        showToast(`Error: ${e.message}`, 'var(--danger)');
    }
}

// ==========================================
// 📜 LOGCAT CONTROLLER
// ==========================================
function setLogcatRunningUI(running) {
    isLogcatRunning = running;
    if (running) {
        startLogcatBtn.style.display = 'none';
        stopLogcatBtn.style.display = 'inline-flex';
        logcatStatusBadge.textContent = 'Streaming';
        logcatStatusBadge.style.color = 'var(--success)';
    } else {
        startLogcatBtn.style.display = 'inline-flex';
        stopLogcatBtn.style.display = 'none';
        logcatStatusBadge.textContent = 'Idle';
        logcatStatusBadge.style.color = 'var(--text-tertiary)';
    }
}

startLogcatBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast('No device connected for Logcat', 'var(--danger)');

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_LOGCAT',
            deviceId: target,
            level: logcatLevelSelect.value,
            filter: logcatSearchInput.value.trim()
        }));
        setLogcatRunningUI(true);
        showToast('Logcat stream started');
    }
};

stopLogcatBtn.onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'STOP_LOGCAT' }));
    }
    setLogcatRunningUI(false);
    showToast('Logcat stopped');
};

clearLogcatBtn.onclick = () => {
    terminalWindow.innerHTML = '';
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'CLEAR_LOGCAT', deviceId: target }));
    }
    showToast('Buffer cleared');
};

copyLogcatBtn.onclick = () => {
    const text = Array.from(terminalWindow.querySelectorAll('.log-entry'))
        .map(el => el.innerText)
        .join('\n');
    if (!text) return showToast('Buffer empty', 'var(--warning)');
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'var(--success)');
};

exportLogcatBtn.onclick = () => {
    const text = Array.from(terminalWindow.querySelectorAll('.log-entry'))
        .map(el => el.innerText)
        .join('\n');
    if (!text) return showToast('Buffer empty', 'var(--warning)');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Log file exported', 'var(--success)');
};

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
        entry.style.display = (matchesLevel && matchesSearch) ? 'flex' : 'none';
    });
}

function handleLogcatLine(rawLine) {
    if (!rawLine) return;

    let type = 'debug';
    let tag = 'DBG';
    if (rawLine.includes(' E ') || rawLine.includes('E/') || rawLine.includes('FATAL') || rawLine.includes('Exception') || rawLine.includes('CRASH')) {
        type = 'error';
        tag = 'ERR';
    } else if (rawLine.includes(' W ') || rawLine.includes('W/')) {
        type = 'warn';
        tag = 'WRN';
    } else if (rawLine.includes(' I ') || rawLine.includes('I/')) {
        type = 'info';
        tag = 'INF';
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
      <span class="log-tag">${tag}</span>
      <span class="log-msg">${escapeHtml(bodyText)}</span>
    `;

    terminalWindow.appendChild(div);

    if (terminalWindow.children.length > 900) {
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

// Start
connectWs();
