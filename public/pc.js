// ==========================================================================
// ApkDrop Engineering Console - Controller with Full i18n & Captures Gallery
// ==========================================================================

// --- Complete i18n Dictionary (Turkish & English) ---
const i18n = {
    tr: {
        // Navigation
        nav_builds: "Paketler",
        nav_devices: "Cihazlar",
        nav_mirror: "Ekran Yansıtma",
        nav_logcat: "Logcat",

        // Topbar
        no_device: "Bağlı Cihaz Yok",
        sound_on: "Ses Açık",
        sound_off: "Ses Kapalı",
        sound_title: "Sesli bildirimleri aç/kapat",
        theme_title: "Temayı değiştir",
        lang_toggle: "EN",
        lang_title: "Switch to English",

        // Builds
        upload_package: "APK Yükle",
        drop_apk_here: "APK dosyasını buraya bırakın",
        or_browse: "veya seçmek için tıklayın",
        build_watcher: "Build İzleyici",
        watch_folder_placeholder: "Örn: C:\\Projelerim\\Builds",
        save: "Kaydet",
        loading_path: "Yol yükleniyor...",
        default_watch_folder: "Varsayılan izleme klasörü",
        automation: "Otomasyon",
        auto_install: "Yeni derlemeleri otomatik yükle",
        auto_launch: "Yükleme sonrası otomatik başlat",
        active_target: "Hedef Cihaz:",
        scanning: "Taranıyor...",
        available_packages: "Hazır Paketler",
        target_prefix: "Hedef:",
        none: "Yok",
        no_packages_detected: "Hazır paket bulunamadı",
        no_packages_sub: "APK sürükleyin veya sol panelden build izleyicisini ayarlayın.",
        source_watcher: "İzleyici",
        source_upload: "Yükleme",
        install_and_launch: "Yükle & Başlat",
        launch: "Başlat",
        stop: "Durdur",
        download: "İndir",

        // Devices
        wireless_pairing: "Kablosuz Eşleme",
        enter_port_label: "5 haneli bağlantı portunu girin:",
        connect: "Bağlan",
        awaiting_scan: "Telefonun taraması bekleniyor...",
        generate_new_qr: "Yeni QR Kod Üret",
        attached_devices: "Bağlı Cihazlar",
        usb_to_tcpip: "USB → TCP/IP (5555)",
        refresh: "Yenile",
        scanning_devices: "Bağlı cihazlar taranıyor...",
        no_devices_attached: "Bağlı cihaz yok. QR kodu taratın veya aşağıdan IP:Port girin.",
        direct_connection: "Doğrudan Bağlantı",
        disconnect: "Bağlantıyı Kes",
        ready: "Hazır",

        // Mirror
        display_stream: "Canlı Yayın",
        idle: "Kapalı",
        live: "Canlı",
        start_stream: "Yayını Başlat",
        stop_stream: "Yayını Durdur",
        capture: "Fotoğraf Çek",
        mirror_inactive: "Canlı Yayın Kapalı",
        mirror_inactive_sub: "Doğrudan donanımsal H.264 video yayını.",
        initialize_mirror: "Yayını Başlat",
        back: "Geri",
        home: "Ana Ekran",
        recents: "Son Uygulamalar",
        power: "Güç",
        captures_title: "Ekran Görüntüleri",
        no_captures: "Henüz görüntü alınmadı",
        no_captures_sub: "Görüntü yakalamak için Capture butonuna tıklayın.",
        save_capture: "Kaydet",
        delete_capture: "Sil",
        preview_modal_title: "Ekran Görüntüsü İnceleme",

        // Logcat
        logcat_diagnostics: "Logcat Teşhisi",
        streaming: "Akıyor",
        start: "Başlat",
        clear: "Temizle",
        copy: "Kopyala",
        export: "Dışa Aktar",
        all_levels: "Tüm Seviyeler",
        error_fatal: "Hata & Fatal",
        warn_error: "Uyarı & Hata",
        info_above: "Bilgi ve Üzeri",
        filter_placeholder: "Tag, mesaj veya paket adı filtrele...",
        autoscroll: "Otomatik Kaydır",
        logcat_ready: "Logcat sistemi hazır. Kayda başlamak için bağlı bir cihaz seçin.",

        // Dynamic Toasts
        toast_only_apk: "Sadece .apk dosyaları kabul edilir",
        toast_uploading: "Yükleniyor:",
        toast_ready: "Paket hazır:",
        toast_installing: "Yükleniyor:",
        toast_installed: "Yüklendi:",
        toast_install_err: "Yükleme hatası:",
        toast_disconnected: "Bağlantı kesildi:",
        toast_no_device: "Bağlı cihaz bulunamadı",
        toast_stream_started: "Canlı yayın başlatıldı",
        toast_stream_stopped: "Canlı yayın durduruldu",
        toast_back_sent: "Geri tuşu gönderildi",
        toast_captured: "Ekran görüntüsü yakalandı",
        toast_saved: "Ekran görüntüsü kaydedildi",
        toast_downloaded: "Ekran görüntüsü indirildi",
        toast_buffer_cleared: "Log penceresi temizlendi",
        toast_copied: "Panoya kopyalandı",
        toast_exported: "Log dosyası kaydedildi",
        toast_watcher_saved: "İzleyici klasörü güncellendi",
        toast_device_refreshed: "Cihaz listesi güncellendi",
        toast_port_required: "5 haneli bağlantı portunu giriniz",
        toast_ip_required: "IP:Port giriniz"
    },
    en: {
        // Navigation
        nav_builds: "Builds",
        nav_devices: "Devices",
        nav_mirror: "Mirror",
        nav_logcat: "Logcat",

        // Topbar
        no_device: "No Device",
        sound_on: "Audio On",
        sound_off: "Audio Off",
        sound_title: "Toggle audio feedback",
        theme_title: "Toggle color theme",
        lang_toggle: "TR",
        lang_title: "Türkçe'ye geç",

        // Builds
        upload_package: "Upload Package",
        drop_apk_here: "Drop .apk here",
        or_browse: "or click to browse files",
        build_watcher: "Build Watcher",
        watch_folder_placeholder: "e.g. C:\\Projects\\Builds\\Android",
        save: "Save",
        loading_path: "Loading path...",
        default_watch_folder: "Default watch folder",
        automation: "Automation",
        auto_install: "Auto-install new builds",
        auto_launch: "Auto-launch after install",
        active_target: "Active Target:",
        scanning: "Scanning...",
        available_packages: "Available Packages",
        target_prefix: "Target:",
        none: "None",
        no_packages_detected: "No packages detected",
        no_packages_sub: "Drop an APK file or configure the build watcher on the left.",
        source_watcher: "Watcher",
        source_upload: "Upload",
        install_and_launch: "Install & Launch",
        launch: "Launch",
        stop: "Stop",
        download: "Download",

        // Devices
        wireless_pairing: "Wireless Pairing",
        enter_port_label: "Enter 5-digit Wireless Port:",
        connect: "Connect",
        awaiting_scan: "Awaiting device scan...",
        generate_new_qr: "Generate New QR",
        attached_devices: "Attached Devices",
        usb_to_tcpip: "USB → TCP/IP (5555)",
        refresh: "Refresh",
        scanning_devices: "Scanning attached devices...",
        no_devices_attached: "No devices attached. Scan QR code or enter IP:Port below.",
        direct_connection: "Direct Connection",
        disconnect: "Disconnect",
        ready: "Ready",

        // Mirror
        display_stream: "Display Stream",
        idle: "Idle",
        live: "Live",
        start_stream: "Start Stream",
        stop_stream: "Stop Stream",
        capture: "Capture",
        mirror_inactive: "Hardware Mirroring Inactive",
        mirror_inactive_sub: "Direct hardware H.264 stream rendered via Media Source Extensions.",
        initialize_mirror: "Initialize Mirror",
        back: "Back",
        home: "Home",
        recents: "Recents",
        power: "Power",
        captures_title: "Captures",
        no_captures: "No captures yet",
        no_captures_sub: "Click Capture to snapshot the display.",
        save_capture: "Save",
        delete_capture: "Delete",
        preview_modal_title: "Snapshot Inspection",

        // Logcat
        logcat_diagnostics: "Logcat Diagnostics",
        streaming: "Streaming",
        start: "Start",
        clear: "Clear",
        copy: "Copy",
        export: "Export",
        all_levels: "All Levels",
        error_fatal: "Error & Fatal",
        warn_error: "Warn & Error",
        info_above: "Info & Above",
        filter_placeholder: "Filter by tag, message, or package...",
        autoscroll: "Autoscroll",
        logcat_ready: "Logcat subsystem ready. Select an attached device to begin capture.",

        // Dynamic Toasts
        toast_only_apk: "Only .apk files allowed",
        toast_uploading: "Uploading:",
        toast_ready: "Package ready:",
        toast_installing: "Installing:",
        toast_installed: "Installed:",
        toast_install_err: "Install error:",
        toast_disconnected: "Disconnected:",
        toast_no_device: "No device connected",
        toast_stream_started: "Mirror stream active",
        toast_stream_stopped: "Stream stopped",
        toast_back_sent: "Back key sent",
        toast_captured: "Frame captured",
        toast_saved: "Snapshot saved",
        toast_downloaded: "Snapshot downloaded",
        toast_buffer_cleared: "Buffer cleared",
        toast_copied: "Copied to clipboard",
        toast_exported: "Log file exported",
        toast_watcher_saved: "Watcher updated",
        toast_device_refreshed: "Device list refreshed",
        toast_port_required: "Enter 5-digit wireless port",
        toast_ip_required: "Enter IP:Port"
    }
};

// Global State
let currentLang = localStorage.getItem('apkdrop_lang') || 'tr';
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
let capturedScreenshots = [];

// DOM References
const langToggleBtn = document.getElementById('lang-toggle-btn');
const langLabel = document.getElementById('lang-label');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundStatus = document.getElementById('sound-status');
const headerDevicePill = document.getElementById('header-device-pill');
const headerDeviceText = document.getElementById('header-device-text');

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

const screenVideo = document.getElementById('screen-video');
const screenshotStaticImg = document.getElementById('screenshot-static-img');
const screenEmptyPlaceholder = document.getElementById('screen-empty-placeholder');
const startWebStreamBtn = document.getElementById('start-web-stream-btn');
const stopWebStreamBtn = document.getElementById('stop-web-stream-btn');
const snapScreenshotBtn = document.getElementById('snap-screenshot-btn');
const screenStreamStatusBadge = document.getElementById('screen-stream-status-badge');
const streamDot = document.getElementById('stream-dot');
const remoteBar = document.getElementById('remote-bar');

const capturesList = document.getElementById('captures-list');
const capturesCount = document.getElementById('captures-count');

const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');

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
const toast = document.getElementById('toast');

// --- i18n Engine ---
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('apkdrop_lang', lang);
    document.documentElement.lang = lang;

    if (langLabel) {
        langLabel.textContent = lang === 'tr' ? 'EN' : 'TR';
    }
    if (langToggleBtn) {
        langToggleBtn.title = i18n[lang].lang_title;
    }

    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang] && i18n[lang][key]) {
            el.textContent = i18n[lang][key];
        }
    });

    // Update all elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18n[lang] && i18n[lang][key]) {
            el.placeholder = i18n[lang][key];
        }
    });

    // Re-render dynamic components
    renderApks();
    renderDevices();
    renderCapturesList();
}

if (langToggleBtn) {
    langToggleBtn.onclick = () => {
        const nextLang = currentLang === 'tr' ? 'en' : 'tr';
        setLanguage(nextLang);
    };
}

// --- Theme Controller ---
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

// --- Toast & Chime ---
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

if (soundToggleBtn) {
    soundToggleBtn.onclick = () => {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem('apkdrop_sound', isSoundEnabled);
        soundToggleBtn.style.opacity = isSoundEnabled ? '1' : '0.4';
        if (isSoundEnabled) playChime();
    };
    soundToggleBtn.style.opacity = isSoundEnabled ? '1' : '0.4';
}

// --- Navigation Tabs ---
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

// --- ADB QR & Pairing ---
async function loadAdbPairingQr() {
    if (!adbQrImg) return;
    if (adbPairStatusBadge) adbPairStatusBadge.textContent = i18n[currentLang].awaiting_scan;
    try {
        const res = await fetch('/api/adb/pairing-qr');
        const data = await res.json();
        if (data.success) {
            adbQrImg.src = data.qrDataUrl;
            if (adbPairStatusBadge) adbPairStatusBadge.textContent = data.message || i18n[currentLang].awaiting_scan;
        }
    } catch (e) {
        if (adbPairStatusBadge) adbPairStatusBadge.textContent = 'Error loading QR';
    }
}

if (refreshAdbQrBtn) refreshAdbQrBtn.onclick = loadAdbPairingQr;

if (quickPortBtn) {
    quickPortBtn.onclick = async () => {
        const port = quickPortInput.value.trim();
        if (!port) {
            showToast(i18n[currentLang].toast_port_required, 'var(--danger)');
            return;
        }
        const ip = lastPairedIp || '192.168.137.74';
        showToast(`${ip}:${port}...`);
        try {
            const res = await fetch('/api/adb/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`${ip}:${port}`, 'var(--success)');
                playChime();
                if (quickPortBox) quickPortBox.style.display = 'none';
                if (adbPairStatusBadge) adbPairStatusBadge.textContent = `${ip}:${port}`;
                refreshDevices();
            } else {
                showToast(data.error, 'var(--danger)', 5000);
            }
        } catch (e) {
            showToast(e.message, 'var(--danger)');
        }
    };
}

if (tcpipBtn) {
    tcpipBtn.onclick = async () => {
        showToast('TCP/IP: 5555...');
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
                showToast(data.error, 'var(--danger)');
            }
        } catch (e) {
            showToast(e.message, 'var(--danger)');
        }
    };
}

window.disconnectDevice = async (deviceId) => {
    try {
        const res = await fetch('/api/adb/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`${i18n[currentLang].toast_disconnected} ${deviceId}`, 'var(--success)');
            refreshDevices();
        } else {
            showToast(data.error, 'var(--danger)');
        }
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
};

// --- 60 FPS Video Stream & Controls ---
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
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');

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
        screenStreamStatusBadge.textContent = i18n[currentLang].live;
        screenStreamStatusBadge.style.color = 'var(--success)';
    }

    initJMuxer();

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_SCREEN_STREAM',
            deviceId: target
        }));
    }

    showToast(i18n[currentLang].toast_stream_started, 'var(--success)');
}

function stopWebScreenStream() {
    isWebStreaming = false;
    startWebStreamBtn.style.display = 'inline-flex';
    stopWebStreamBtn.style.display = 'none';
    if (streamDot) streamDot.classList.remove('active');
    if (screenStreamStatusBadge) {
        screenStreamStatusBadge.textContent = i18n[currentLang].idle;
        screenStreamStatusBadge.style.color = 'var(--text-tertiary)';
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'STOP_SCREEN_STREAM' }));
    }

    if (jmuxerInstance) {
        try { jmuxerInstance.destroy(); } catch (e) {}
        jmuxerInstance = null;
    }

    showToast(i18n[currentLang].toast_stream_stopped);
}

if (startWebStreamBtn) startWebStreamBtn.onclick = startWebScreenStream;
if (stopWebStreamBtn) stopWebStreamBtn.onclick = stopWebScreenStream;

// Touch & Mouse on Video
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
    showToast(i18n[currentLang].toast_back_sent, 'var(--accent)', 1200);
};

// ==========================================
// 📸 CAPTURES GALLERY & SAVE PROMPT
// ==========================================
snapScreenshotBtn.onclick = async () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');

    let dataUrl = '';
    let blob = null;

    if (isWebStreaming && screenVideo.style.display !== 'none' && screenVideo.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/png');
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } else {
        showToast('Capturing...');
        try {
            const res = await fetch(`/api/adb/screenshot?deviceId=${encodeURIComponent(target)}&t=${Date.now()}`);
            blob = await res.blob();
            dataUrl = URL.createObjectURL(blob);
        } catch (e) {
            showToast('Capture error', 'var(--danger)');
            return;
        }
    }

    if (!blob || !dataUrl) return;

    const newCapture = {
        id: Date.now(),
        dataUrl,
        blob,
        time: new Date().toLocaleTimeString(),
        resolution: `${phonePhysicalWidth}x${phonePhysicalHeight}`
    };

    capturedScreenshots.unshift(newCapture);
    renderCapturesList();
    playChime();
    showToast(i18n[currentLang].toast_captured, 'var(--success)');
};

function renderCapturesList() {
    if (capturesCount) capturesCount.textContent = capturedScreenshots.length;
    if (!capturesList) return;

    if (capturedScreenshots.length === 0) {
        capturesList.innerHTML = `
          <div class="empty-view captures-empty">
            <p class="empty-title">${i18n[currentLang].no_captures}</p>
            <p class="empty-sub">${i18n[currentLang].no_captures_sub}</p>
          </div>
        `;
        return;
    }

    capturesList.innerHTML = capturedScreenshots.map(c => `
      <div class="capture-item" data-id="${c.id}">
        <div class="capture-thumb-box" onclick="openImageModal('${c.id}')" title="Click to view">
          <img src="${c.dataUrl}" class="capture-thumb" alt="Capture">
        </div>
        <div class="capture-footer">
          <div class="capture-info">
            <span class="capture-time">${c.time}</span>
            <span class="capture-meta">${c.resolution}</span>
          </div>
          <div class="capture-btn-group">
            <button class="btn-card-icon" onclick="saveCaptureFile('${c.id}')" title="${i18n[currentLang].save_capture}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="btn-card-icon danger" onclick="deleteCapture('${c.id}')" title="${i18n[currentLang].delete_capture}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
}

window.saveCaptureFile = async (id) => {
    const item = capturedScreenshots.find(c => c.id == id);
    if (!item) return;

    const defaultFilename = `screenshot_${new Date(item.id).toISOString().replace(/[:.]/g, '-')}.png`;

    // Native Save As Dialog
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
            await writable.write(item.blob);
            await writable.close();
            showToast(i18n[currentLang].toast_saved, 'var(--success)');
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback Download
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(i18n[currentLang].toast_downloaded, 'var(--success)');
};

window.deleteCapture = (id) => {
    capturedScreenshots = capturedScreenshots.filter(c => c.id != id);
    renderCapturesList();
};

window.openImageModal = (id) => {
    const item = capturedScreenshots.find(c => c.id == id);
    if (!item || !imageModal) return;
    modalImg.src = item.dataUrl;
    if (modalTitle) modalTitle.textContent = `${i18n[currentLang].preview_modal_title} (${item.time} - ${item.resolution})`;
    imageModal.style.display = 'flex';
};

if (modalCloseBtn) {
    modalCloseBtn.onclick = () => {
        if (imageModal) imageModal.style.display = 'none';
    };
}

if (imageModal) {
    imageModal.onclick = (e) => {
        if (e.target === imageModal) imageModal.style.display = 'none';
    };
}

// Direct IP Connect
if (adbConnectBtn) {
    adbConnectBtn.onclick = async () => {
        const target = adbIpInput.value.trim();
        if (!target) return showToast(i18n[currentLang].toast_ip_required, 'var(--danger)');
        const parts = target.split(':');
        const ip = parts[0];
        const port = parts[1] || '5555';

        showToast(`${ip}:${port}...`);
        try {
            const res = await fetch('/api/adb/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`${ip}:${port}`, 'var(--success)');
                playChime();
                refreshDevices();
            } else {
                showToast(data.error, 'var(--danger)', 5000);
            }
        } catch (e) {
            showToast(e.message, 'var(--danger)');
        }
    };
}

// WebSocket Controller
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
                currentWatchLabel.textContent = data.config.watchFolder || i18n[currentLang].default_watch_folder;
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
            showToast(`${i18n[currentLang].toast_ready} ${data.apk.name}`, 'var(--success)');
        } else if (data.type === 'ADB_INSTALL_START') {
            showToast(`${i18n[currentLang].toast_installing} ${data.message}`, 'var(--warning)', 4000);
        } else if (data.type === 'ADB_INSTALL_SUCCESS') {
            showToast(`${i18n[currentLang].toast_installed} ${data.apkName}`, 'var(--success)', 4000);
        } else if (data.type === 'ADB_INSTALL_ERROR') {
            showToast(`${i18n[currentLang].toast_install_err} ${data.error}`, 'var(--danger)', 6000);
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
        showToast('Pairing OK. Enter port.', 'var(--success)', 5000);
    } else if (session.status === 'connected') {
        if (quickPortBox) quickPortBox.style.display = 'none';
        playChime();
        showToast('Device connected', 'var(--success)', 4000);
        refreshDevices();
    }
}

// Render APKs with active i18n
function renderApks() {
    if (apkCountSpan) apkCountSpan.textContent = currentApks.length;
    if (!apkListContainer) return;

    if (currentApks.length === 0) {
        apkListContainer.innerHTML = `
          <div class="empty-view">
            <p class="empty-title">${i18n[currentLang].no_packages_detected}</p>
            <p class="empty-sub">${i18n[currentLang].no_packages_sub}</p>
          </div>
        `;
        return;
    }

    apkListContainer.innerHTML = currentApks.map(apk => `
      <div class="apk-card">
        <div class="apk-header">
          <div class="apk-title">${apk.label || apk.name}</div>
          <span class="tag-version">${apk.source === 'folder-watcher' ? i18n[currentLang].source_watcher : i18n[currentLang].source_upload}</span>
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
            ${i18n[currentLang].install_and_launch}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="launchApp('${apk.packageName}')" title="${i18n[currentLang].launch}">
            ${i18n[currentLang].launch}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="stopApp('${apk.packageName}')" title="${i18n[currentLang].stop}">
            ${i18n[currentLang].stop}
          </button>
          <a href="${apk.downloadUrl}" class="btn btn-secondary btn-sm" download="${apk.name}">
            ${i18n[currentLang].download}
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
        headerDeviceText.textContent = i18n[currentLang].no_device;
    }
}

// Render ADB Devices with active i18n
function renderDevices() {
    updateHeaderDevicePill();
    if (!devicesList) return;

    if (!currentDevices || currentDevices.length === 0) {
        devicesList.innerHTML = `
          <div class="loading-state">
            ${i18n[currentLang].no_devices_attached}
          </div>
        `;
        if (activeDeviceIndicator) activeDeviceIndicator.textContent = `${i18n[currentLang].target_prefix} ${i18n[currentLang].none}`;
        if (quickDeviceStatus) quickDeviceStatus.textContent = i18n[currentLang].none;
        return;
    }

    if (!selectedDevice || !currentDevices.some(d => d.id === selectedDevice)) {
        selectedDevice = currentDevices[0].id;
    }

    if (activeDeviceIndicator) activeDeviceIndicator.textContent = `${i18n[currentLang].target_prefix} ${selectedDevice}`;
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
          <button class="btn btn-secondary btn-sm" onclick="disconnectDevice('${d.id}')" title="${i18n[currentLang].disconnect}">
            ${i18n[currentLang].disconnect}
          </button>
          <span class="count-badge" style="color: var(--success);">${i18n[currentLang].ready}</span>
        </div>
      </div>
    `).join('');
}

window.changeSelectedDevice = (id) => {
    selectedDevice = id;
    if (activeDeviceIndicator) activeDeviceIndicator.textContent = `${i18n[currentLang].target_prefix} ${selectedDevice}`;
    renderDevices();
    saveSettings();
};

window.installViaAdb = async (apkId, apkName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');
    showToast(`${i18n[currentLang].toast_installing} ${apkName}...`);
    try {
        const res = await fetch('/api/adb/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, apkId })
        });
        const data = await res.json();
        if (!data.success) showToast(data.error, 'var(--danger)');
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
};

window.launchApp = async (packageName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');
    try {
        const res = await fetch('/api/adb/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, packageName })
        });
        const data = await res.json();
        showToast(data.success ? `Launched: ${packageName}` : `Failed: ${data.output}`);
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
};

window.stopApp = async (packageName) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');
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
    showToast('Saving path...');
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
        showToast(i18n[currentLang].toast_watcher_saved, 'var(--success)');
        currentWatchLabel.textContent = watchFolder || i18n[currentLang].default_watch_folder;
    } else {
        showToast(data.error, 'var(--danger)');
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
    showToast(i18n[currentLang].toast_device_refreshed);
}

// Drag & Drop
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
        showToast(i18n[currentLang].toast_only_apk, 'var(--danger)');
        return;
    }
    showToast(`${i18n[currentLang].toast_uploading} ${file.name}...`);
    const formData = new FormData();
    formData.append('apk', file);
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) showToast(`${i18n[currentLang].toast_ready} ${file.name}`, 'var(--success)');
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
}

// --- Logcat Terminal ---
function setLogcatRunningUI(running) {
    isLogcatRunning = running;
    if (running) {
        startLogcatBtn.style.display = 'none';
        stopLogcatBtn.style.display = 'inline-flex';
        logcatStatusBadge.textContent = i18n[currentLang].streaming;
        logcatStatusBadge.style.color = 'var(--success)';
    } else {
        startLogcatBtn.style.display = 'inline-flex';
        stopLogcatBtn.style.display = 'none';
        logcatStatusBadge.textContent = i18n[currentLang].idle;
        logcatStatusBadge.style.color = 'var(--text-tertiary)';
    }
}

startLogcatBtn.onclick = () => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_LOGCAT',
            deviceId: target,
            level: logcatLevelSelect.value,
            filter: logcatSearchInput.value.trim()
        }));
        setLogcatRunningUI(true);
        showToast('Logcat started');
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
    showToast(i18n[currentLang].toast_buffer_cleared);
};

copyLogcatBtn.onclick = () => {
    const text = Array.from(terminalWindow.querySelectorAll('.log-entry'))
        .map(el => el.innerText)
        .join('\n');
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(i18n[currentLang].toast_copied, 'var(--success)');
};

exportLogcatBtn.onclick = () => {
    const text = Array.from(terminalWindow.querySelectorAll('.log-entry'))
        .map(el => el.innerText)
        .join('\n');
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(i18n[currentLang].toast_exported, 'var(--success)');
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

// Initial language setup & connect
setLanguage(currentLang);
connectWs();
renderCapturesList();
