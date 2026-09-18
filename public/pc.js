// ==========================================================================
// ApkDrop Engineering Console - Controller with Full i18n & Captures Gallery
// ==========================================================================

// --- Complete i18n Dictionary (Turkish & English) ---
const i18n = {
    tr: {
        // Navigation
        nav_builds: "Paketler & Transfer",
        nav_devices: "Cihazlar",
        nav_mirror: "Ekran Yansıtma",

        // Topbar
        brand_slogan: "Kablolar için fazla üşengeç",
        no_device: "Bağlı Cihaz Yok",
        clipboard_off: "Kapalı",
        clipboard_pc_to_phone: "PC → Mobil",
        clipboard_phone_to_pc: "Mobil → PC",
        clipboard_title_off: "Pano: Kapalı (Tıkla: PC → Mobil)",
        clipboard_title_pc: "Pano: PC → Mobil (Tıkla: Mobil → PC)",
        clipboard_title_phone: "Pano: Mobil → PC (Tıkla: Kapat)",
        battery_title: "Cihaz Bataryası",
        charging: "Şarj Oluyor",
        sound_on: "Ses Açık",
        sound_off: "Ses Kapalı",
        sound_title: "Sesli bildirimleri aç/kapat",
        theme_title: "Temayı değiştir",
        lang_toggle: "EN",
        lang_title: "Switch to English",
        privacy_title: "Gizlilik Modu (Seri No & IP Gizle)",

        // Builds & Transfers
        upload_title: "Dosya & Paket Yükle",
        drop_files_here: "Dosyaları buraya bırakın",
        drop_files_sub: "veya seçmek için tıklayın",
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
        device_transfers: "Dosya Transferleri",
        target_prefix: "Hedef:",
        none: "Yok",
        no_packages_detected: "Hazır paket bulunamadı",
        no_packages_sub: "APK sürükleyin veya sol panelden build izleyicisini ayarlayın.",
        no_transfers: "Henüz dosya aktarılmadı",
        no_transfers_sub: "APK, resim, video, ses veya belge sürükleyip bırakın.",
        source_watcher: "İzleyici",
        source_upload: "Yükleme",
        install_and_launch: "Yükle & Başlat",
        launch: "Başlat",
        stop: "Durdur",
        download: "İndir",
        status_transferred: "Cihaza Aktarıldı",
        status_saved: "Sunucuda Hazır",
        status_received: "PC'ye Alındı",
        status_error: "Aktarım Başarısız",
        dir_pc_to_phone: "PC ➔ Tel",
        dir_phone_to_pc: "Tel ➔ PC",
        open_file: "Aç",
        show_in_folder: "Klasör",
        delete: "Sil",
        mobile_transfer_title: "📱 Telefondan PC'ye Aktar",
        wifi_transfer_badge: "Wi-Fi Web",
        adb_push_badge: "ADB Push",
        mobile_qr_desc: "Telefon kamerasıyla QR kodu tarayın; fotoğraf, video ve belgeleri kablosuz PC'ye gönderin.",
        copy_link: "Linki Kopyala",
        received_folder: "İndirilenler Klasörü",
        open_folder_title: "Gelen dosyalar klasörünü aç",
        network_adapter: "Ağ:",
        open_on_phone: "Telefonda Aç",
        open_on_phone_title: "Mobil Aktarım Sayfasını Telefonda Aç (ADB)",

        // Devices
        wireless_pairing: "Kablosuz Eşleme",
        enter_port_label: "5 haneli bağlantı portunu girin:",
        connect: "Bağlan",
        scan_qr_hint: "Telefonunuzdan \"Cihazı QR koduyla eşle\"yi açıp bu kodu tarayın...",
        awaiting_scan: "Telefonun taraması bekleniyor...",
        pairing_in_progress: "Cihaz algılandı, eşleştiriliyor...",
        pairing_connecting: "Eşleşme başarılı, bağlanılıyor...",
        pairing_timeout: "Eşleşme zaman aşımına uğradı. QR kodu yenileyip tekrar deneyin.",
        or_browse: "veya seçmek için tıklayın",
        generate_new_qr: "Yeni QR Kod Üret",
        attached_devices: "Bağlı Cihazlar",
        usb_to_tcpip: "USB → TCP/IP (5555)",
        usb_to_tcpip_title: "Bağlı USB cihazını TCP/IP 5555 portuna geçir",
        refresh: "Yenile",
        scanning_devices: "Bağlı cihazlar taranıyor...",
        no_devices_attached: "Bağlı cihaz yok. QR kodu taratın veya aşağıdan IP:Port girin.",
        direct_connection: "Doğrudan Bağlantı",
        disconnect: "Bağlantıyı Kes",
        ready: "Hazır",
        error_loading_qr: "QR yüklenemedi",

        // Mirror
        display_stream: "Canlı Yayın",
        idle: "Kapalı",
        live: "Canlı",
        start_stream: "Yayını Başlat",
        stop_stream: "Yayını Durdur",
        capture: "Fotoğraf Çek",
        mirror_inactive: "Canlı Yayın Kapalı",
        mirror_inactive_sub: "Doğrudan donanımsal video yayını.",
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
        modal_preview_title: "Görüntü İnceleme",
        close: "Kapat",

        // Dynamic Toasts
        toast_only_apk: "Sadece .apk dosyaları kabul edilir",
        toast_uploading: "Yükleniyor:",
        toast_transferring: "Cihaza aktarılıyor:",
        toast_transferred: "Cihaza aktarıldı:",
        toast_transfer_saved: "Dosya yüklendi (Cihaz bekleniyor):",
        toast_transfer_error: "Aktarım hatası:",
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
        toast_capturing: "Ekran yakalanıyor...",
        toast_capture_error: "Ekran yakalama hatası",
        toast_saved: "Ekran görüntüsü kaydedildi",
        toast_downloaded: "Ekran görüntüsü indirildi",
        toast_buffer_cleared: "Log penceresi temizlendi",
        toast_copied: "Panoya kopyalandı",
        toast_exported: "Log dosyası kaydedildi",
        toast_watcher_saved: "İzleyici klasörü güncellendi",
        toast_device_refreshed: "Cihaz listesi güncellendi",
        toast_port_required: "5 haneli bağlantı portunu giriniz",
        toast_ip_required: "IP:Port giriniz",
        toast_pairing_ok: "Eşleşme başarılı. Portu giriniz.",
        toast_device_connected: "Cihaz bağlandı",
        toast_launched: "Başlatıldı:",
        toast_launch_failed: "Başlatılamadı:",
        toast_stopped: "Durduruldu:",
        toast_saving_path: "Klasör yolu kaydediliyor...",
        toast_tcpip_switching: "TCP/IP moduna geçiriliyor (5555)...",
        toast_privacy_on: "Gizlilik modu aktif (Bilgiler gizlendi)",
        toast_privacy_off: "Gizlilik modu kapalı",
        toast_clipboard_pc_to_phone: "Pano Modu: PC → Mobil aktif",
        toast_clipboard_phone_to_pc: "Pano Modu: Mobil → PC aktif",
        toast_clipboard_off: "Pano eşitleme kapatıldı",
        toast_connect_first: "Lütfen önce bir cihaz bağlayın",
        toast_screenshot_pulling: "Ekran görüntüsü çekiliyor...",
        toast_screenshot_pulled: "Ekran görüntüsü çekildi:",
        toast_screenshot_pull_err: "Ekran görüntüsü çekilemedi:",
        toast_file_received_from_phone: "Telefondan yeni dosya alındı:",
        toast_transfer_deleted: "Transfer silindi",
        toast_ip_changed: "Ağ kartı seçildi: ",
        toast_opened_on_phone: "Mobil aktarım sayfası telefonda açıldı!"
    },
    en: {
        // Navigation
        nav_builds: "Builds & Transfer",
        nav_devices: "Devices",
        nav_mirror: "Mirror",

        // Topbar
        brand_slogan: "Too lazy for cables",
        no_device: "No Device",
        clipboard_off: "Off",
        clipboard_pc_to_phone: "PC → Mobile",
        clipboard_phone_to_pc: "Mobile → PC",
        clipboard_title_off: "Clipboard: Off (Click: PC → Mobile)",
        clipboard_title_pc: "Clipboard: PC → Mobile (Click: Mobile → PC)",
        clipboard_title_phone: "Clipboard: Mobile → PC (Click: Off)",
        battery_title: "Device Battery",
        charging: "Charging",
        sound_on: "Audio On",
        sound_off: "Audio Off",
        sound_title: "Toggle audio feedback",
        theme_title: "Toggle color theme",
        lang_toggle: "TR",
        lang_title: "Türkçe'ye geç",
        privacy_title: "Privacy Mode (Mask Serial & IP)",

        // Builds & Transfers
        upload_title: "Upload Files & Packages",
        drop_files_here: "Drop files here",
        drop_files_sub: "or click to browse",
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
        device_transfers: "File Transfers",
        target_prefix: "Target:",
        none: "None",
        no_packages_detected: "No packages detected",
        no_packages_sub: "Drop an APK file or configure the build watcher on the left.",
        no_transfers: "No files transferred yet",
        no_transfers_sub: "Drag and drop APK, images, videos, audio or documents.",
        source_watcher: "Watcher",
        source_upload: "Upload",
        install_and_launch: "Install & Launch",
        launch: "Launch",
        stop: "Stop",
        download: "Download",
        status_transferred: "Transferred to Device",
        status_saved: "Ready on Server",
        status_received: "Received on PC",
        status_error: "Transfer Failed",
        dir_pc_to_phone: "PC ➔ Phone",
        dir_phone_to_pc: "Phone ➔ PC",
        open_file: "Open",
        show_in_folder: "Folder",
        delete: "Delete",
        mobile_transfer_title: "📱 Mobile to PC Transfer",
        wifi_transfer_badge: "Wi-Fi Web",
        adb_push_badge: "ADB Push",
        mobile_qr_desc: "Scan QR with your phone camera to send photos, videos, and documents directly to PC over Wi-Fi.",
        copy_link: "Copy Link",
        received_folder: "Received Folder",
        open_folder_title: "Open received files folder",
        network_adapter: "Network:",
        open_on_phone: "Open on Phone",
        open_on_phone_title: "Open Mobile Transfer Webpage on Phone (ADB)",

        // Devices
        wireless_pairing: "Wireless Pairing",
        enter_port_label: "Enter 5-digit Wireless Port:",
        connect: "Connect",
        scan_qr_hint: "On your phone, open 'Pair device with QR code' and scan this code...",
        awaiting_scan: "Awaiting device scan...",
        pairing_in_progress: "Device detected, pairing...",
        pairing_connecting: "Pairing successful, connecting...",
        pairing_timeout: "Pairing timed out. Generate a new QR code and retry.",
        or_browse: "or click to browse",
        generate_new_qr: "Generate New QR",
        attached_devices: "Attached Devices",
        usb_to_tcpip: "USB → TCP/IP (5555)",
        usb_to_tcpip_title: "Switch connected USB device to TCP/IP port 5555",
        refresh: "Refresh",
        scanning_devices: "Scanning attached devices...",
        no_devices_attached: "No devices attached. Scan QR code or enter IP:Port below.",
        direct_connection: "Direct Connection",
        disconnect: "Disconnect",
        ready: "Ready",
        error_loading_qr: "Error loading QR",

        // Mirror
        display_stream: "Display Stream",
        idle: "Idle",
        live: "Live",
        start_stream: "Start Stream",
        stop_stream: "Stop Stream",
        capture: "Capture",
        mirror_inactive: "Hardware Mirroring Inactive",
        mirror_inactive_sub: "Direct hardware video stream.",
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
        modal_preview_title: "Image Preview",
        close: "Close",

        // Dynamic Toasts
        toast_only_apk: "Only .apk files allowed",
        toast_uploading: "Uploading:",
        toast_transferring: "Transferring to device:",
        toast_transferred: "Transferred to device:",
        toast_transfer_saved: "File saved (Awaiting device):",
        toast_transfer_error: "Transfer error:",
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
        toast_capturing: "Capturing display...",
        toast_capture_error: "Capture error",
        toast_saved: "Snapshot saved",
        toast_downloaded: "Snapshot downloaded",
        toast_buffer_cleared: "Buffer cleared",
        toast_copied: "Copied to clipboard",
        toast_exported: "Log file exported",
        toast_watcher_saved: "Watcher updated",
        toast_device_refreshed: "Device list refreshed",
        toast_port_required: "Enter 5-digit wireless port",
        toast_ip_required: "Enter IP:Port",
        toast_pairing_ok: "Pairing successful. Enter port.",
        toast_device_connected: "Device connected",
        toast_launched: "Launched:",
        toast_launch_failed: "Launch failed:",
        toast_stopped: "Stopped:",
        toast_saving_path: "Saving folder path...",
        toast_tcpip_switching: "Switching to TCP/IP (5555)...",
        toast_privacy_on: "Privacy mode enabled (Identifiers masked)",
        toast_privacy_off: "Privacy mode disabled",
        toast_clipboard_pc_to_phone: "Clipboard Mode: PC → Mobile active",
        toast_clipboard_phone_to_pc: "Clipboard Mode: Mobile → PC active",
        toast_clipboard_off: "Clipboard sync turned off",
        toast_connect_first: "Please connect a device first",
        toast_screenshot_pulling: "Pulling screenshot...",
        toast_screenshot_pulled: "Screenshot pulled:",
        toast_screenshot_pull_err: "Failed to pull screenshot:",
        toast_file_received_from_phone: "File received from phone:",
        toast_transfer_deleted: "Transfer deleted",
        toast_ip_changed: "Network adapter switched to: ",
        toast_opened_on_phone: "Mobile transfer page opened on phone!"
    }
};

// Global State
let currentLang = localStorage.getItem('apkdrop_lang') || 'tr';
let ws = null;
let currentApks = [];
let currentTransfers = [];
let currentDevices = [];
let selectedDevice = '';
let activeDeployTab = 'apks';
let isPrivacyMode = localStorage.getItem('apkdrop_privacy') === 'true';
let isSoundEnabled = localStorage.getItem('apkdrop_sound') !== 'false';
let isWebStreaming = false;
let jmuxerInstance = null;
let phonePhysicalWidth = 1080;
let phonePhysicalHeight = 2400;
let isTouchDown = false;
let touchStartX = 0;
let touchStartY = 0;
let lastPairedIp = '';
let capturedScreenshots = [];
let currentPairingSession = null;
let currentClipboardMode = 'off';
let currentBattery = null;

// DOM References
const langToggleBtn = document.getElementById('lang-toggle-btn');
const langLabel = document.getElementById('lang-label');
const privacyToggleBtn = document.getElementById('privacy-toggle-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundStatus = document.getElementById('sound-status');
const headerDevicePill = document.getElementById('header-device-pill');
const headerDeviceText = document.getElementById('header-device-text');
const headerBattery = document.getElementById('header-battery');
const batteryText = document.getElementById('battery-text');
const batteryIconSvg = document.getElementById('battery-icon-svg');
const clipboardToggleBtn = document.getElementById('clipboard-toggle-btn');
const clipboardModeLabel = document.getElementById('clipboard-mode-label');

const tabBtnApks = document.getElementById('tab-btn-apks');
const tabBtnTransfers = document.getElementById('tab-btn-transfers');
const transfersQuickActions = document.getElementById('transfers-quick-actions');
const openReceivedFolderBtn = document.getElementById('open-received-folder-btn');
const apkListContainer = document.getElementById('apk-list-container');
const transfersListContainer = document.getElementById('transfers-list-container');
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

const toast = document.getElementById('toast');

// --- Privacy / Streamer Masking Engine ---
function maskIdentifier(str) {
    if (!isPrivacyMode || !str) return str;
    // Mask IP:port like 192.168.1.50:32893 -> 192.168.***.**:*****
    if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/.test(str)) {
        return str.replace(/\b(\d{1,3}\.\d{1,3}\.)\d{1,3}\.\d{1,3}(:\d+)?\b/g, '$1***.***:*****');
    }
    // Mask device serials or model identifiers
    if (str.length > 5) {
        return str.slice(0, 3) + '••••••' + (str.length > 9 ? str.slice(-2) : '');
    }
    return '••••••';
}

function escapeHtml(str) {
    return (str || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updatePrivacyUI() {
    if (!privacyToggleBtn) return;
    if (isPrivacyMode) {
        privacyToggleBtn.classList.add('active');
        privacyToggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        `;
    } else {
        privacyToggleBtn.classList.remove('active');
        privacyToggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        `;
    }
}

if (privacyToggleBtn) {
    updatePrivacyUI();
    privacyToggleBtn.onclick = () => {
        isPrivacyMode = !isPrivacyMode;
        localStorage.setItem('apkdrop_privacy', isPrivacyMode);
        updatePrivacyUI();
        showToast(isPrivacyMode ? i18n[currentLang].toast_privacy_on : i18n[currentLang].toast_privacy_off, isPrivacyMode ? '#10b981' : 'var(--text-tertiary)');
        renderDevices();
        renderApks();
        renderTransfers();
    };
}

// --- Segment Switcher (APKs vs Transfers) ---
if (tabBtnApks && tabBtnTransfers) {
    tabBtnApks.onclick = () => {
        activeDeployTab = 'apks';
        tabBtnApks.classList.add('active');
        tabBtnTransfers.classList.remove('active');
        if (apkListContainer) apkListContainer.style.display = 'flex';
        if (transfersListContainer) transfersListContainer.style.display = 'none';
        if (transfersQuickActions) transfersQuickActions.style.display = 'none';
        if (apkCountSpan) apkCountSpan.textContent = currentApks.length;
    };

    tabBtnTransfers.onclick = () => {
        activeDeployTab = 'transfers';
        tabBtnTransfers.classList.add('active');
        tabBtnApks.classList.remove('active');
        if (apkListContainer) apkListContainer.style.display = 'none';
        if (transfersListContainer) transfersListContainer.style.display = 'flex';
        if (transfersQuickActions) transfersQuickActions.style.display = 'flex';
        renderTransfers();
        if (apkCountSpan) apkCountSpan.textContent = currentTransfers.length;
    };
}

// --- i18n Engine ---
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('apkdrop_lang', lang);
    document.documentElement.lang = lang;
    if (i18n[lang] && i18n[lang].brand_slogan) {
        document.title = `BRQ Transfer - ${i18n[lang].brand_slogan}`;
    }

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

    // Update all elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (i18n[lang] && i18n[lang][key]) {
            el.setAttribute('title', i18n[lang][key]);
        }
    });

    // Re-render dynamic components
    renderApks();
    renderTransfers();
    renderDevices();
    renderCapturesList();
    updatePairStatusBadge();
    updateClipboardUI(currentClipboardMode);
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

// --- Mobile to PC Web Transfer QR & Link with Network Adapter Selection ---
async function loadMobileTransferQr() {
    const mobileQrImg = document.getElementById('mobile-transfer-qr');
    const mobileUrlLink = document.getElementById('mobile-transfer-url-link');
    const mobileUrlText = document.getElementById('mobile-transfer-url-text');
    const mobileIpSelect = document.getElementById('mobile-ip-select');
    const openOnPhoneBtn = document.getElementById('open-on-phone-btn');
    if (!mobileQrImg) return;

    try {
        const res = await fetch('/api/qr');
        const data = await res.json();
        if (data && data.qrDataUrl) {
            mobileQrImg.src = data.qrDataUrl;
            if (mobileUrlLink) mobileUrlLink.href = data.url;
            if (mobileUrlText) mobileUrlText.textContent = data.url;
        }

        // Populate IP selector dropdown if available
        if (mobileIpSelect && data.availableIps && data.availableIps.length > 0) {
            mobileIpSelect.innerHTML = data.availableIps.map(item => {
                const isSel = (item.ip === data.ip) ? 'selected' : '';
                const label = `${item.ip} - ${item.friendlyName || item.name}`;
                return `<option value="${item.ip}" ${isSel}>${label}</option>`;
            }).join('');

            mobileIpSelect.onchange = async () => {
                const newIp = mobileIpSelect.value;
                try {
                    await fetch('/api/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ selectedIp: newIp })
                    });
                    showToast(`${i18n[currentLang].toast_ip_changed} ${newIp}`, 'var(--success)');
                    loadMobileTransferQr();
                } catch (err) {}
            };
        }

        // Show "Telefonda Aç" button if an ADB device is connected
        if (openOnPhoneBtn) {
            if (currentDevices && currentDevices.length > 0) {
                openOnPhoneBtn.style.display = 'inline-flex';
                openOnPhoneBtn.onclick = async () => {
                    try {
                        const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
                        const r = await fetch('/api/adb/open-mobile-web', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ deviceId: target })
                        });
                        const resData = await r.json();
                        if (resData.success) {
                            showToast(i18n[currentLang].toast_opened_on_phone, 'var(--success)', 4000);
                        } else {
                            showToast(resData.error || 'Hata', 'var(--danger)');
                        }
                    } catch (err) {
                        showToast(err.message, 'var(--danger)');
                    }
                };
            } else {
                openOnPhoneBtn.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Mobile QR load error:', e);
    }
}

const copyMobileUrlBtn = document.getElementById('copy-mobile-url-btn');
if (copyMobileUrlBtn) {
    copyMobileUrlBtn.onclick = () => {
        const urlText = document.getElementById('mobile-transfer-url-text');
        if (urlText && urlText.textContent && !urlText.textContent.includes('...')) {
            navigator.clipboard.writeText(urlText.textContent);
            showToast(i18n[currentLang].toast_copied, 'var(--success)');
        }
    };
}

// --- ADB QR & Pairing ---
function updatePairStatusBadge() {
    if (!adbPairStatusBadge) return;
    const dict = i18n[currentLang];
    if (!currentPairingSession || currentPairingSession.status === 'waiting_for_scan') {
        adbPairStatusBadge.textContent = dict.scan_qr_hint || dict.awaiting_scan;
        return;
    }
    const ip = currentPairingSession.pairedIp || '';
    switch (currentPairingSession.status) {
        case 'pairing':
            adbPairStatusBadge.textContent = `${dict.pairing_in_progress} ${ip ? `(${ip})` : ''}`.trim();
            break;
        case 'paired':
            adbPairStatusBadge.textContent = `${dict.pairing_connecting} ${ip ? `(${ip})` : ''}`.trim();
            break;
        case 'connected':
            adbPairStatusBadge.textContent = `${dict.toast_device_connected} ${ip ? `(${ip})` : ''}`.trim();
            break;
        case 'paired_need_port':
            adbPairStatusBadge.textContent = `${dict.toast_pairing_ok} ${ip ? `(${ip})` : ''}`.trim();
            break;
        case 'timeout':
            adbPairStatusBadge.textContent = dict.pairing_timeout;
            break;
        default:
            adbPairStatusBadge.textContent = dict.scan_qr_hint || dict.awaiting_scan;
    }
}

async function loadAdbPairingQr() {
    if (!adbQrImg) return;
    currentPairingSession = { status: 'waiting_for_scan' };
    updatePairStatusBadge();
    try {
        const res = await fetch('/api/adb/pairing-qr');
        const data = await res.json();
        if (data.success) {
            adbQrImg.src = data.qrDataUrl;
            currentPairingSession = {
                status: data.status || 'waiting_for_scan',
                pairedIp: data.pairedIp
            };
            updatePairStatusBadge();
        }
    } catch (e) {
        if (adbPairStatusBadge) adbPairStatusBadge.textContent = i18n[currentLang].error_loading_qr;
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
        const ip = lastPairedIp || (currentPairingSession && currentPairingSession.pairedIp) || '';
        if (!ip) {
            showToast(i18n[currentLang].toast_ip_required, 'var(--danger)');
            return;
        }
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
        showToast(i18n[currentLang].toast_tcpip_switching);
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
        maxDelay: 5000,
        fps: 60,
        clearBuffer: true,
        debug: false
    });
    if (screenVideo) {
        screenVideo.playbackRate = 1.0;
        screenVideo.play().catch(() => {});
    }
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

    if (screenVideo) {
        try {
            screenVideo.pause();
            screenVideo.removeAttribute('src');
            screenVideo.load();
        } catch (e) {}
        screenVideo.style.display = 'none';
    }
    if (screenshotStaticImg) screenshotStaticImg.style.display = 'none';
    if (screenEmptyPlaceholder) screenEmptyPlaceholder.style.display = 'flex';
    if (remoteBar) remoteBar.style.display = 'none';

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

if (screenVideo) {
    screenVideo.addEventListener('stalled', () => {
        if (isWebStreaming && screenVideo.buffered && screenVideo.buffered.length > 0) {
            const bufEnd = screenVideo.buffered.end(screenVideo.buffered.length - 1);
            if (bufEnd - screenVideo.currentTime > 0.05) {
                screenVideo.currentTime = bufEnd - 0.01;
            }
            screenVideo.play().catch(() => {});
        }
    });
    screenVideo.addEventListener('waiting', () => {
        if (isWebStreaming && screenVideo.buffered && screenVideo.buffered.length > 0) {
            screenVideo.play().catch(() => {});
        }
    });
}

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
        showToast(i18n[currentLang].toast_capturing);
        try {
            const res = await fetch(`/api/adb/screenshot?deviceId=${encodeURIComponent(target)}&t=${Date.now()}`);
            blob = await res.blob();
            dataUrl = URL.createObjectURL(blob);
        } catch (e) {
            showToast(i18n[currentLang].toast_capture_error, 'var(--danger)');
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
                if (screenVideo) {
                    if (screenVideo.paused) {
                        screenVideo.play().catch(() => {});
                    }
                    if (screenVideo.buffered && screenVideo.buffered.length > 0) {
                        const bufEnd = screenVideo.buffered.end(screenVideo.buffered.length - 1);
                        const lag = bufEnd - screenVideo.currentTime;
                        if (lag > 0.25) {
                            screenVideo.playbackRate = 1.25;
                        } else if (lag > 0.10) {
                            screenVideo.playbackRate = 1.10;
                        } else {
                            screenVideo.playbackRate = 1.0;
                        }
                    }
                }
            }
            return;
        }

        const data = JSON.parse(event.data);

        if (data.type === 'INIT') {
            currentApks = data.apks || [];
            currentTransfers = data.transfers || [];
            currentDevices = data.devices || [];
            if (data.config) {
                if (watchFolderInput) watchFolderInput.value = data.config.watchFolder || '';
                if (currentWatchLabel) currentWatchLabel.textContent = data.config.watchFolder || i18n[currentLang].default_watch_folder;
                if (autoAdbCheckbox) autoAdbCheckbox.checked = !!data.config.autoInstallOnAdb;
                if (autoLaunchCheckbox) autoLaunchCheckbox.checked = data.config.autoLaunchAfterInstall !== false;
                selectedDevice = data.config.selectedAdbDevice || '';
            }
            renderApks();
            renderTransfers();
            renderDevices();
            if (data.pairingSession && adbQrImg) {
                adbQrImg.src = data.pairingSession.qrDataUrl;
                handleAdbPairStatus(data.pairingSession);
            }
            if (data.clipboardMode) {
                updateClipboardUI(data.clipboardMode);
            }
            loadMobileTransferQr();
        } else if (data.type === 'NEW_APK') {
            currentApks.unshift(data.apk);
            renderApks();
            playChime();
            showToast(`${i18n[currentLang].toast_ready} ${data.apk.name}`, 'var(--success)');
        } else if (data.type === 'TRANSFER_COMPLETED') {
            if (data.transfers) currentTransfers = data.transfers;
            else if (data.transfer) currentTransfers.unshift(data.transfer);
            renderTransfers();
            playChime();
            const filename = (data.transfer && data.transfer.filename) || '';
            showToast(`${i18n[currentLang].toast_transferred} ${filename}`, 'var(--success)', 4500);
        } else if (data.type === 'TRANSFER_SAVED') {
            if (data.transfers) currentTransfers = data.transfers;
            else if (data.transfer) currentTransfers.unshift(data.transfer);
            renderTransfers();
            const filename = (data.transfer && data.transfer.filename) || '';
            showToast(`${i18n[currentLang].toast_transfer_saved} ${filename}`, 'var(--warning)', 4500);
        } else if (data.type === 'FILE_RECEIVED_FROM_PHONE') {
            if (data.allTransfers) currentTransfers = data.allTransfers;
            else if (data.transfers) currentTransfers = [...data.transfers, ...currentTransfers];
            
            // Switch to Transfers tab so user immediately sees the received file
            if (activeDeployTab !== 'transfers' && tabBtnTransfers) {
                tabBtnTransfers.click();
            } else {
                renderTransfers();
            }
            playChime();
            const count = data.transfers ? data.transfers.length : 1;
            showToast(data.message || `${i18n[currentLang].toast_file_received_from_phone} (${count})`, 'var(--success)', 5000);
        } else if (data.type === 'TRANSFERS_UPDATED') {
            currentTransfers = data.transfers || [];
            renderTransfers();
        } else if (data.type === 'ADB_INSTALL_START') {
            showToast(`${i18n[currentLang].toast_installing} ${data.message}`, 'var(--warning)', 4000);
        } else if (data.type === 'ADB_INSTALL_SUCCESS') {
            showToast(`${i18n[currentLang].toast_installed} ${data.apkName}`, 'var(--success)', 4000);
        } else if (data.type === 'ADB_INSTALL_ERROR') {
            showToast(`${i18n[currentLang].toast_install_err} ${data.error}`, 'var(--danger)', 6000);
        } else if (data.type === 'DEVICES_UPDATED') {
            currentDevices = data.devices || [];
            renderDevices();
            const openOnPhoneBtn = document.getElementById('open-on-phone-btn');
            if (openOnPhoneBtn) {
                openOnPhoneBtn.style.display = (currentDevices && currentDevices.length > 0) ? 'inline-flex' : 'none';
            }
        } else if (data.type === 'MOBILE_QR_UPDATED') {
            const mobileQrImg = document.getElementById('mobile-transfer-qr');
            const mobileUrlLink = document.getElementById('mobile-transfer-url-link');
            const mobileUrlText = document.getElementById('mobile-transfer-url-text');
            const mobileIpSelect = document.getElementById('mobile-ip-select');
            if (mobileQrImg && data.qrDataUrl) mobileQrImg.src = data.qrDataUrl;
            if (mobileUrlLink && data.url) mobileUrlLink.href = data.url;
            if (mobileUrlText && data.url) mobileUrlText.textContent = data.url;
            if (mobileIpSelect && data.availableIps) {
                mobileIpSelect.innerHTML = data.availableIps.map(item => {
                    const isSel = (item.ip === data.ip) ? 'selected' : '';
                    const label = `${item.ip} - ${item.friendlyName || item.name}`;
                    return `<option value="${item.ip}" ${isSel}>${label}</option>`;
                }).join('');
            }
        } else if (data.type === 'CLIPBOARD_MODE_CHANGED' || data.type === 'CLIPBOARD_SYNC_STATUS') {
            updateClipboardUI(data.mode || (data.active ? 'phone-to-pc' : 'off'));
        } else if (data.type === 'ADB_PAIR_STATUS') {
            handleAdbPairStatus(data.session);
        } else if (data.type === 'SCREEN_STREAM_STATUS') {
            if (!data.running && isWebStreaming) {
                stopWebScreenStream();
            }
        }
    };

    ws.onclose = () => {
        setTimeout(connectWs, 2000);
    };
}

function handleAdbPairStatus(session) {
    if (!session) return;
    currentPairingSession = session;
    updatePairStatusBadge();

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
        showToast(i18n[currentLang].toast_pairing_ok, 'var(--success)', 5000);
    } else if (session.status === 'connected') {
        if (quickPortBox) quickPortBox.style.display = 'none';
        playChime();
        showToast(i18n[currentLang].toast_device_connected, 'var(--success)', 4000);
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

    apkListContainer.innerHTML = currentApks.map(apk => {
        const safeTitle = escapeHtml(apk.label || apk.name);
        const safePkg = escapeHtml(apk.packageName || '');
        const safeName = escapeHtml(apk.name || '');
        const safeVersionName = escapeHtml(apk.versionName || '1.0');
        const safeVersionCode = escapeHtml(apk.versionCode || '1');
        const safeSize = escapeHtml(apk.size || '');
        const safeMinSdk = escapeHtml(apk.minSdk || '24');
        const safeTargetSdk = escapeHtml(apk.targetSdk || '34');
        const safeId = escapeHtml(apk.id || '');
        const safeDownloadUrl = escapeHtml(apk.downloadUrl || '');
        const timeStr = apk.updatedAt ? new Date(apk.updatedAt).toLocaleTimeString() : '';

        return `
      <div class="apk-card">
        <div class="apk-header">
          <div class="apk-title">${safeTitle}</div>
          <span class="tag-version">${apk.source === 'folder-watcher' ? i18n[currentLang].source_watcher : i18n[currentLang].source_upload}</span>
        </div>

        <div class="apk-pkg mono">${safePkg} &bull; ${safeName}</div>

        <div class="apk-tags">
          <span class="apk-tag-pill">v${safeVersionName} (${safeVersionCode})</span>
          <span class="apk-tag-pill">${safeSize}</span>
          <span class="apk-tag-pill">SDK ${safeMinSdk}-${safeTargetSdk}</span>
          <span class="apk-tag-pill">${timeStr}</span>
        </div>

        <div class="apk-actions">
          <button class="btn btn-primary btn-sm btn-apk-install" data-id="${safeId}" data-name="${safeName}">
            ${i18n[currentLang].install_and_launch}
          </button>
          <button class="btn btn-secondary btn-sm btn-apk-launch" data-pkg="${safePkg}" title="${i18n[currentLang].launch}">
            ${i18n[currentLang].launch}
          </button>
          <button class="btn btn-secondary btn-sm btn-apk-stop" data-pkg="${safePkg}" title="${i18n[currentLang].stop}">
            ${i18n[currentLang].stop}
          </button>
          <a href="${safeDownloadUrl}" class="btn btn-secondary btn-sm" download="${safeName}">
            ${i18n[currentLang].download}
          </a>
        </div>
      </div>
    `;
    }).join('');
}

// Render Transferred Files List
function renderTransfers() {
    if (activeDeployTab === 'transfers' && apkCountSpan) {
        apkCountSpan.textContent = currentTransfers.length;
    }
    if (!transfersListContainer) return;

    if (!currentTransfers || currentTransfers.length === 0) {
        transfersListContainer.innerHTML = `
          <div class="empty-view">
            <p class="empty-title">${i18n[currentLang].no_transfers}</p>
            <p class="empty-sub">${i18n[currentLang].no_transfers_sub}</p>
          </div>
        `;
        return;
    }

    const categoryIcons = {
        image: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        video: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
        audio: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        document: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
    };

    const dict = i18n[currentLang];

    transfersListContainer.innerHTML = currentTransfers.map(t => {
        const icon = categoryIcons[t.category] || categoryIcons.document;
        const isMobileToPc = t.direction === 'mobile-to-pc';
        const targetDev = t.deviceId ? (isPrivacyMode ? maskIdentifier(t.deviceId) : t.deviceId) : '';

        const dirBadge = isMobileToPc
            ? `<span class="badge-dir badge-dir-received">📱 ➔ 💻 ${dict.dir_phone_to_pc}</span>`
            : `<span class="badge-dir badge-dir-sent">💻 ➔ 📱 ${dict.dir_pc_to_phone}</span>`;

        let statusText = '';
        let statusColor = 'var(--success)';

        if (isMobileToPc) {
            statusText = dict.status_received || 'PC\'ye Alındı';
            statusColor = 'var(--success)';
        } else if (t.status === 'transferred') {
            statusText = dict.status_transferred;
            statusColor = 'var(--success)';
        } else if (t.status === 'saved') {
            statusText = dict.status_saved;
            statusColor = 'var(--warning)';
        } else {
            statusText = dict.status_error;
            statusColor = 'var(--danger)';
        }

        const pathDisplay = isMobileToPc
            ? (t.localPath ? escapeHtml(t.localPath.replace(/\\/g, '/')) : 'received/')
            : `${escapeHtml(t.remotePath || t.targetDir || '')} ${targetDev ? `&bull; ${escapeHtml(targetDev)}` : ''}`;

        const safeFilename = escapeHtml(t.filename || '');
        const safeLocalPath = escapeHtml(t.localPath || '');
        const safeId = escapeHtml(String(t.id || ''));

        const actionsHtml = isMobileToPc ? `
          <button class="btn-transfer-action btn-transfer-open" data-filename="${safeFilename}" data-path="${safeLocalPath}" title="${dict.open_file}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ${dict.open_file}
          </button>
          <button class="btn-transfer-action btn-transfer-folder" data-filename="${safeFilename}" data-path="${safeLocalPath}" title="${dict.show_in_folder}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            ${dict.show_in_folder}
          </button>
          <button class="btn-transfer-action btn-transfer-delete" data-id="${safeId}" title="${dict.delete}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            ${dict.delete}
          </button>
        ` : `
          <button class="btn-transfer-action btn-transfer-delete" data-id="${safeId}" title="${dict.delete}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            ${dict.delete}
          </button>
        `;

        return `
          <div class="transfer-card">
            <div class="transfer-left">
              <div class="transfer-icon">${icon}</div>
              <div class="transfer-meta">
                <div class="transfer-name" title="${safeFilename}">${safeFilename}</div>
                <div class="transfer-path mono">${pathDisplay}</div>
              </div>
            </div>
            <div class="transfer-right">
              ${dirBadge}
              <span class="transfer-tag mono">${escapeHtml(t.size || '')}</span>
              <span class="transfer-tag mono">${escapeHtml(t.timestamp || '')}</span>
              <span class="transfer-status" style="color: ${statusColor};">${statusText}</span>
              ${actionsHtml}
            </div>
          </div>
        `;
    }).join('');
}

// Open received file with default Windows app
window.openReceivedFile = async (filename, filePath) => {
    try {
        await fetch('/api/transfers/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, filePath })
        });
    } catch (e) {
        console.error('File open error:', e);
    }
};

// Open received files directory or select file in Windows Explorer
window.openReceivedFolder = async (filename, filePath) => {
    try {
        await fetch('/api/transfers/open-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, filePath })
        });
    } catch (e) {
        console.error('Folder open error:', e);
    }
};

// Delete transfer entry and local file
window.deleteTransfer = async (id) => {
    try {
        const res = await fetch('/api/transfers/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const json = await res.json();
        if (json.transfers) {
            currentTransfers = json.transfers;
            renderTransfers();
        }
        showToast(i18n[currentLang].toast_transfer_deleted, 'var(--warning)', 3000);
    } catch (e) {
        console.error('Delete transfer error:', e);
    }
};

// Safe Event Delegation for APK Actions
if (apkListContainer) {
    apkListContainer.addEventListener('click', (e) => {
        const installBtn = e.target.closest('.btn-apk-install');
        if (installBtn) {
            const id = installBtn.getAttribute('data-id');
            const name = installBtn.getAttribute('data-name');
            if (id && window.installViaAdb) window.installViaAdb(id, name);
            return;
        }
        const launchBtn = e.target.closest('.btn-apk-launch');
        if (launchBtn) {
            const pkg = launchBtn.getAttribute('data-pkg');
            if (pkg && window.launchApp) window.launchApp(pkg);
            return;
        }
        const stopBtn = e.target.closest('.btn-apk-stop');
        if (stopBtn) {
            const pkg = stopBtn.getAttribute('data-pkg');
            if (pkg && window.stopApp) window.stopApp(pkg);
            return;
        }
    });
}

// Safe Event Delegation for Transfer Actions
if (transfersListContainer) {
    transfersListContainer.addEventListener('click', (e) => {
        const openBtn = e.target.closest('.btn-transfer-open');
        if (openBtn) {
            const filename = openBtn.getAttribute('data-filename');
            const filePath = openBtn.getAttribute('data-path');
            window.openReceivedFile(filename, filePath);
            return;
        }
        const folderBtn = e.target.closest('.btn-transfer-folder');
        if (folderBtn) {
            const filename = folderBtn.getAttribute('data-filename');
            const filePath = folderBtn.getAttribute('data-path');
            window.openReceivedFolder(filename, filePath);
            return;
        }
        const deleteBtn = e.target.closest('.btn-transfer-delete');
        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            if (id) window.deleteTransfer(id);
            return;
        }
    });
}

if (openReceivedFolderBtn) {
    openReceivedFolderBtn.onclick = async () => {
        try {
            await fetch('/api/transfers/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
        } catch (e) {
            console.error('Folder open error:', e);
        }
    };
}

// --- Battery Indicator & Header Pill ---
function updateBatteryUI(battery) {
    if (!headerBattery || !batteryText) return;
    if (!battery || battery.level === undefined || battery.level === null) {
        headerBattery.classList.add('hidden');
        return;
    }

    currentBattery = battery;
    headerBattery.classList.remove('hidden', 'battery-high', 'battery-med', 'battery-low', 'battery-charging');

    const lvl = battery.level;
    const isChg = !!battery.isCharging;

    if (isChg) {
        headerBattery.classList.add('battery-charging');
        batteryText.textContent = `${lvl}% ⚡`;
        headerBattery.title = `${i18n[currentLang].battery_title}: ${lvl}% (${i18n[currentLang].charging})`;
    } else {
        batteryText.textContent = `${lvl}%`;
        headerBattery.title = `${i18n[currentLang].battery_title}: ${lvl}%`;
        if (lvl > 50) {
            headerBattery.classList.add('battery-high');
        } else if (lvl > 20) {
            headerBattery.classList.add('battery-med');
        } else {
            headerBattery.classList.add('battery-low');
        }
    }
}

function updateHeaderDevicePill() {
    if (!headerDevicePill || !headerDeviceText) return;
    const onlineDev = currentDevices.find(d => d.id === selectedDevice) || currentDevices[0];
    if (onlineDev && onlineDev.state === 'device') {
        headerDevicePill.classList.add('connected');
        const displayModel = isPrivacyMode ? maskIdentifier(onlineDev.model) : onlineDev.model;
        headerDeviceText.textContent = displayModel;
        headerDevicePill.title = `${onlineDev.model} (${onlineDev.id})`;
        if (onlineDev.battery) {
            updateBatteryUI(onlineDev.battery);
        } else {
            fetchBattery(onlineDev.id);
        }
    } else {
        headerDevicePill.classList.remove('connected');
        headerDeviceText.textContent = i18n[currentLang].no_device;
        headerDevicePill.title = i18n[currentLang].no_device;
        updateBatteryUI(null);
    }
}

async function fetchBattery(deviceId) {
    const target = deviceId || selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return updateBatteryUI(null);
    try {
        const res = await fetch(`/api/adb/battery?deviceId=${encodeURIComponent(target)}`);
        const data = await res.json();
        if (data.success && data.battery) {
            updateBatteryUI(data.battery);
        }
    } catch (e) {}
}

// Periodic Battery Poller (Every 20 seconds)
setInterval(() => {
    if (selectedDevice || (currentDevices[0] && currentDevices[0].id)) {
        fetchBattery();
    }
}, 20000);

// --- 3-Way Clipboard Sync Controller (PC → Mobil / Mobil → PC / Kapalı) ---
function updateClipboardUI(mode) {
    currentClipboardMode = mode || 'off';
    if (!clipboardToggleBtn) return;

    clipboardToggleBtn.classList.remove('mode-off', 'mode-pc-to-phone', 'mode-phone-to-pc');
    clipboardToggleBtn.classList.add(`mode-${currentClipboardMode}`);

    if (clipboardModeLabel) {
        if (currentClipboardMode === 'pc-to-phone') {
            clipboardModeLabel.textContent = i18n[currentLang].clipboard_pc_to_phone;
            clipboardToggleBtn.title = i18n[currentLang].clipboard_title_pc;
        } else if (currentClipboardMode === 'phone-to-pc') {
            clipboardModeLabel.textContent = i18n[currentLang].clipboard_phone_to_pc;
            clipboardToggleBtn.title = i18n[currentLang].clipboard_title_phone;
        } else {
            clipboardModeLabel.textContent = i18n[currentLang].clipboard_off;
            clipboardToggleBtn.title = i18n[currentLang].clipboard_title_off;
        }
    }
}

if (clipboardToggleBtn) {
    clipboardToggleBtn.onclick = async () => {
        const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
        if (!target && currentClipboardMode === 'off') {
            showToast(i18n[currentLang].toast_connect_first, 'var(--danger)');
            return;
        }

        // Cycle: off -> pc-to-phone -> phone-to-pc -> off
        let nextMode = 'off';
        if (currentClipboardMode === 'off') {
            nextMode = 'pc-to-phone';
        } else if (currentClipboardMode === 'pc-to-phone') {
            nextMode = 'phone-to-pc';
        } else {
            nextMode = 'off';
        }

        try {
            const res = await fetch('/api/clipboard/mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: nextMode, deviceId: target })
            });
            const data = await res.json();
            if (data.success) {
                updateClipboardUI(data.mode);
                if (data.mode === 'pc-to-phone') {
                    showToast(i18n[currentLang].toast_clipboard_pc_to_phone, 'var(--accent)');
                } else if (data.mode === 'phone-to-pc') {
                    showToast(i18n[currentLang].toast_clipboard_phone_to_pc, 'var(--success)');
                } else {
                    showToast(i18n[currentLang].toast_clipboard_off);
                }
            } else {
                showToast(data.error || 'İşlem başarısız', 'var(--danger)');
            }
        } catch (e) {
            showToast(e.message, 'var(--danger)');
        }
    };
}

// Render ADB Devices with active i18n & Privacy Masking
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

    if (activeDeviceIndicator) {
        const masked = isPrivacyMode ? maskIdentifier(selectedDevice) : selectedDevice;
        activeDeviceIndicator.textContent = `${i18n[currentLang].target_prefix} ${masked}`;
    }
    if (quickDeviceStatus) {
        const cur = currentDevices.find(d => d.id === selectedDevice) || currentDevices[0];
        const displayModel = isPrivacyMode ? maskIdentifier(cur.model) : cur.model;
        const displayId = isPrivacyMode ? maskIdentifier(cur.id) : cur.id;
        quickDeviceStatus.textContent = `${displayModel} (${displayId})`;
    }

    devicesList.innerHTML = currentDevices.map(d => {
        const displayModel = isPrivacyMode ? maskIdentifier(d.model) : d.model;
        const displayId = isPrivacyMode ? maskIdentifier(d.id) : d.id;
        return `
          <div class="device-card">
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="radio" name="adb-device" value="${d.id}" ${d.id === selectedDevice ? 'checked' : ''} onchange="changeSelectedDevice('${d.id}')">
              <div>
                <div style="font-weight: 600; font-size: 13px;">${displayModel}</div>
                <div style="font-size: 11px; color: var(--text-tertiary);" class="mono">${displayId} &bull; ${d.isWifi ? 'Wi-Fi' : 'USB'}</div>
              </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="disconnectDevice('${d.id}')" title="${i18n[currentLang].disconnect}">
                ${i18n[currentLang].disconnect}
              </button>
              <span class="count-badge" style="color: var(--success);">${i18n[currentLang].ready}</span>
            </div>
          </div>
        `;
    }).join('');
}

window.changeSelectedDevice = (id) => {
    selectedDevice = id;
    if (activeDeviceIndicator) {
        const masked = isPrivacyMode ? maskIdentifier(selectedDevice) : selectedDevice;
        activeDeviceIndicator.textContent = `${i18n[currentLang].target_prefix} ${masked}`;
    }
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
        showToast(data.success ? `${i18n[currentLang].toast_launched} ${packageName}` : `${i18n[currentLang].toast_launch_failed} ${data.output}`);
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
    showToast(`${i18n[currentLang].toast_stopped} ${packageName}`);
};

window.sendRemoteKey = async (keyCode) => {
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (!target) return;
    try {
        await fetch('/api/adb/key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, keyCode, code: keyCode })
        });
    } catch (e) {
        console.error('Remote key error:', e);
    }
};

// Settings Save
saveWatchBtn.onclick = async () => {
    const watchFolder = watchFolderInput.value.trim();
    showToast(i18n[currentLang].toast_saving_path);
    const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            watchFolder,
            autoInstallOnAdb: autoAdbCheckbox ? autoAdbCheckbox.checked : false,
            autoLaunchAfterInstall: autoLaunchCheckbox ? autoLaunchCheckbox.checked : true
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

if (autoAdbCheckbox) autoAdbCheckbox.onchange = saveSettings;
if (autoLaunchCheckbox) autoLaunchCheckbox.onchange = saveSettings;

async function saveSettings() {
    await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            watchFolder: watchFolderInput.value.trim(),
            autoInstallOnAdb: autoAdbCheckbox ? autoAdbCheckbox.checked : false,
            autoLaunchAfterInstall: autoLaunchCheckbox ? autoLaunchCheckbox.checked : true,
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

// Drag & Drop (Universal File Transfer & APK)
dropzone.onclick = () => fileInput.click();

fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(f => uploadFile(f));
    }
};

dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
};

dropzone.ondragleave = () => dropzone.classList.remove('dragover');

dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach(f => uploadFile(f));
    }
};

async function uploadFile(file) {
    const isApk = file.name.toLowerCase().endsWith('.apk');
    showToast(isApk ? `${i18n[currentLang].toast_uploading} ${file.name}...` : `${i18n[currentLang].toast_transferring} ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    const target = selectedDevice || (currentDevices[0] && currentDevices[0].id);
    if (target) formData.append('deviceId', target);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            playChime();
            if (data.isApk) {
                showToast(`${i18n[currentLang].toast_ready} ${file.name}`, 'var(--success)');
            } else {
                const dest = (data.transfer && data.transfer.targetDir) || '/sdcard/Download';
                showToast(`${i18n[currentLang].toast_transferred} ${file.name} → ${dest}`, 'var(--success)', 4500);
                if (data.transfer && !currentTransfers.some(t => t.id === data.transfer.id)) {
                    currentTransfers.unshift(data.transfer);
                    renderTransfers();
                }
            }
        } else {
            showToast(data.error || i18n[currentLang].toast_transfer_error, 'var(--danger)');
        }
    } catch (e) {
        showToast(e.message, 'var(--danger)');
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
renderTransfers();
loadMobileTransferQr();

