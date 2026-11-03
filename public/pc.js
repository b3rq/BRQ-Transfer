// ==========================================================================
// ApkDrop Engineering Console - Controller with Full i18n & Captures Gallery
// ==========================================================================

// --- Complete i18n Dictionary (Turkish & English) ---
const i18n = {
    tr: {
        skip_content: "İçeriğe geç",
        deploy_heading: "Dosya Transferleri",
        deploy_description: "Dosyalarınızı telefon ve PC arasında aktarın, durumlarını takip edin.",
        devices_heading: "Cihazlarınız",
        devices_description: "Telefonunuzu bağlayın ve işlemler için hedef cihazı seçin.",
        mirror_heading: "Ekran yansıtma",
        mirror_description: "Bağlı cihazın ekranını görüntüleyin, kontrol edin ve görüntü yakalayın.",
        choose_apk: "APK seç",
        // Navigation
        nav_builds: "Dosya Transferleri",
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
        save: "Kaydet",
        automation: "Otomasyon",
        auto_install: "Yeni derlemeleri otomatik yükle",
        auto_launch: "Yükleme sonrası otomatik başlat",
        active_target: "Hedef Cihaz:",
        scanning: "Taranıyor...",
        device_transfers: "Dosya Transferleri",
        target_prefix: "Hedef:",
        none: "Yok",
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
        dir_pc_to_phone: "PC → Telefon",
        dir_phone_to_pc: "Telefon → PC",
        transfer_location: "Dosya konumu",
        open_file: "Aç",
        show_in_folder: "Klasör",
        delete: "Sil",
        mobile_transfer_title: "Telefondan PC'ye aktar",
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
        code_pairing_hint: "Telefonda Kablosuz hata ayıklamayı açın. Telefonunuzu seçip Eşle / Bağlan'a basın. Yetki gerekiyorsa eşleşme kodu istenir.",
        pairing_first_time: "Telefonda “Eşleşme koduyla cihaz eşleştir” ekranını açıp güncel kodu girin. Telefon bulunamazsa aşağıdan eşleşme IP:Port bilgisini ekleyin.",
        pair_or_connect: "Eşle / Bağlan",
        code_pairing_method: "Eşleşme kodu ile eşle",
        ip_connection_method: "IP adresi ile bağlan",
        pairing_use_address: "IP:Port bilgisini kendim gireceğim",
        ip_connection_hint: "Kablosuz hata ayıklama ana ekranındaki güncel IP:Port bilgisini girin. İlk eşleşme için kod veya QR kullanın.",
        pairing_retry_hint: "Bağlantı kurulamadı. Telefonda bu bilgisayarı unuttuysanız güncel eşleşme kodunu girin. IP veya bağlantı portu da değişmiş olabilir.",
        pairing_device: "Telefon",
        saved_phones: "Kayıtlı Telefonlar",
        saved_phones_info: "Kayıtlı telefonlar hakkında bilgi",
        saved_phones_hint: "Silinen telefon BRQ'da yeniden kod veya QR ile eşleştirme ister. Android'deki bilgisayar yetkisini de kaldırmak için telefondan bu bilgisayarı unutun.",
        no_saved_phones: "Kayıtlı telefon yok.",
        forget_phone: "Sil",
        forget_all_phones: "Tümünü sil",
        forget_phone_confirm: "Bu telefonun kaydı silinsin ve bağlantısı kesilsin mi? BRQ'da tekrar bağlamak için eşleşme kodu gerekecek.",
        forget_all_phones_confirm: "Tüm kayıtlı telefonlar silinsin ve bağlantıları kesilsin mi? BRQ'da tekrar bağlamak için eşleşme kodu gerekecek.",
        phones_forgotten: "Telefon kaydı silindi. Tekrar bağlamak için yeniden eşleştirin.",
        pairing_code_label: "6 haneli eşleşme kodu",
        pairing_required_title: "İlk bağlantı · Eşleştirme gerekli",
        required_field: "Zorunlu",
        pair_with_code: "Eşleştir",
        discover_phones: "Telefon Bul",
        pairing_idle: "Telefon aramak için Telefon Bul'a basın.",
        pairing_searching: "Telefonlar aranıyor…",
        pairing_found: "Telefon bulundu. Seçip devam edin.",
        pairing_multiple: "Birden fazla telefon bulundu. Kendi telefonunuzu seçin.",
        pairing_missing: "Telefon bulunamadı. Telefonu bilgisayarla aynı ağa bağlayın, Kablosuz hata ayıklamayı açıp bu ağa izin verin ve Telefon Bul'a basın.",
        pairing_discovery_error: "Ağ keşfi çalışmıyor. ADB / Platform-Tools, ağ bağlantısı, VPN ve güvenlik duvarı ayarlarını kontrol edip yeniden deneyin.",
        pairing_select: "Telefon seçin",
        pairing_code_invalid: "6 haneli eşleşme kodunu girin.",
        pairing_address_invalid: "Eşleşme kodu ekranındaki IP:Port bilgisini girin.",
        pairing_failed: "Eşleştirme tamamlanamadı. Telefonda kod ekranını açık tutup güncel kodla yeniden deneyin.",
        pairing_ready: "Bağlantıyı Kes ile durdurduğunuz telefonu aynı ağdayken Tekrar Bağlan ile bağlayabilirsiniz.",
        manual_pairing_hint: "Eşleşme kodu ekranındaki IP adresi ve portu kullanın. Ana ekrandaki bağlantı portu farklıdır.",
        pairing_address_label: "Eşleşme IP:Port",
        qr_pairing_alternative: "QR koduyla eşleştir",
        enter_port_label: "5 haneli bağlantı portunu girin:",
        connect: "Bağlan",
        scan_qr_hint: "Telefonunuzdan \"Cihazı QR koduyla eşle\"yi açıp bu kodu tarayın...",
        awaiting_scan: "Telefonun taraması bekleniyor...",
        pairing_in_progress: "Cihaz algılandı, eşleştiriliyor...",
        pairing_connecting: "Eşleşme başarılı, bağlanılıyor...",
        pairing_timeout: "Eşleşme zaman aşımına uğradı. Telefonda eşleşme kodu ekranını açıp güncel kodla yeniden deneyin.",
        or_browse: "veya seçmek için tıklayın",
        generate_new_qr: "Yeni QR Kod Üret",
        attached_devices: "Bağlı Cihazlar",
        refresh: "Yenile",
        scanning_devices: "Bağlı cihazlar taranıyor...",
        no_devices_attached: "Bağlı cihaz yok. Telefon Bul ile telefonunuzu seçin veya USB ile bağlayın.",
        direct_connection: "Doğrudan Bağlantı",
        disconnect: "Bağlantıyı Kes",
        reconnect: "Tekrar Bağlan",
        disconnected: "Bağlantı kesildi",
        disconnecting: "Kesiliyor…",
        device_offline: "Çevrimdışı",
        device_unauthorized: "Yetki gerekli",
        usb_disconnect_hint: "Kabloyu çıkarın",
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
        no_captures_sub: "Bağlı cihazdan görüntü almak için Fotoğraf Çek butonunu kullanın.",
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
        toast_pairing_ok: "Eşleşti, otomatik bağlantı bulunamadı. Kablosuz hata ayıklama ana ekranındaki bağlantı portunu girin.",
        toast_device_connected: "Cihaz bağlandı",
        toast_launched: "Başlatıldı:",
        toast_launch_failed: "Başlatılamadı:",
        toast_stopped: "Durduruldu:",
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
        skip_content: "Skip to content",
        deploy_heading: "File Transfers",
        deploy_description: "Transfer files between your phone and PC and track their status.",
        devices_heading: "Your devices",
        devices_description: "Connect your phone and choose the target device for your actions.",
        mirror_heading: "Screen mirror",
        mirror_description: "View and control your connected device, and capture screenshots.",
        choose_apk: "Choose APK",
        // Navigation
        nav_builds: "File Transfers",
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
        save: "Save",
        automation: "Automation",
        auto_install: "Auto-install new builds",
        auto_launch: "Auto-launch after install",
        active_target: "Active Target:",
        scanning: "Scanning...",
        device_transfers: "File Transfers",
        target_prefix: "Target:",
        none: "None",
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
        transfer_location: "File location",
        open_file: "Open",
        show_in_folder: "Folder",
        delete: "Delete",
        mobile_transfer_title: "Phone to PC transfer",
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
        code_pairing_hint: "Enable Wireless debugging on your phone. Select it and press Connect. A pairing code is requested on first connection.",
        pairing_first_time: "Open “Pair device with pairing code” on your phone and enter the current code. If discovery fails, enter the pairing IP:Port below.",
        pair_or_connect: "Pair / Connect",
        code_pairing_method: "Pair with pairing code",
        ip_connection_method: "Connect by IP address",
        pairing_use_address: "Enter IP:Port manually",
        ip_connection_hint: "Enter the current IP:Port from the main Wireless debugging screen. Use a code or QR for initial pairing.",
        pairing_retry_hint: "Connection failed. If you forgot this computer on your phone, enter a new pairing code. The IP or connection port may also have changed.",
        pairing_device: "Phone",
        saved_phones: "Saved Phones",
        saved_phones_info: "About saved phones",
        saved_phones_hint: "Deleted phones require pairing again with a code or QR in BRQ. To also revoke Android's host authorization, forget this computer on the phone.",
        no_saved_phones: "No saved phones.",
        forget_phone: "Delete",
        forget_all_phones: "Delete all",
        forget_phone_confirm: "Delete this saved phone and disconnect it? Connecting again in BRQ will require a pairing code.",
        forget_all_phones_confirm: "Delete all saved phones and disconnect them? Connecting again in BRQ will require a pairing code.",
        phones_forgotten: "Phone record deleted. Pair again to reconnect.",
        pairing_code_label: "6-digit pairing code",
        pairing_required_title: "First connection · Pairing required",
        required_field: "Required",
        pair_with_code: "Pair",
        discover_phones: "Find Phone",
        pairing_idle: "Click Find Phone to search for phones.",
        pairing_searching: "Searching for phones…",
        pairing_found: "Phone found. Press Connect.",
        pairing_multiple: "Multiple phones found. Select your phone.",
        pairing_missing: "No phone found. Connect your phone to the same network as your PC, enable Wireless debugging, allow this network, and press Find Phone.",
        pairing_discovery_error: "Network discovery is unavailable. Check ADB / Platform-Tools, your network, VPN, and firewall settings, then retry.",
        pairing_select: "Select a phone",
        pairing_code_invalid: "Enter the 6-digit pairing code.",
        pairing_address_invalid: "Enter the IP:Port shown in the pairing code dialog.",
        pairing_failed: "Pairing could not finish. Keep the pairing dialog open and retry with the current code.",
        pairing_ready: "After using Disconnect, use Reconnect while the phone is on the same network.",
        manual_pairing_hint: "Use the IP address and port from the pairing code dialog. The connection port on the main screen is different.",
        pairing_address_label: "Pairing IP:Port",
        qr_pairing_alternative: "Pair with QR code",
        enter_port_label: "Enter 5-digit Wireless Port:",
        connect: "Connect",
        scan_qr_hint: "On your phone, open 'Pair device with QR code' and scan this code...",
        awaiting_scan: "Awaiting device scan...",
        pairing_in_progress: "Device detected, pairing...",
        pairing_connecting: "Pairing successful, connecting...",
        pairing_timeout: "Pairing timed out. Open the pairing code screen on your phone and retry with the current code.",
        or_browse: "or click to browse",
        generate_new_qr: "Generate New QR",
        attached_devices: "Attached Devices",
        refresh: "Refresh",
        scanning_devices: "Scanning attached devices...",
        no_devices_attached: "No devices attached. Select your phone using Find Phone, or connect via USB.",
        direct_connection: "Direct Connection",
        disconnect: "Disconnect",
        reconnect: "Reconnect",
        disconnected: "Disconnected",
        disconnecting: "Disconnecting…",
        device_offline: "Offline",
        device_unauthorized: "Authorization required",
        usb_disconnect_hint: "Unplug USB cable",
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
        toast_pairing_ok: "Paired, but automatic connection was unavailable. Enter the connection port from the main Wireless debugging screen.",
        toast_device_connected: "Device connected",
        toast_launched: "Launched:",
        toast_launch_failed: "Launch failed:",
        toast_stopped: "Stopped:",
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
let currentTransfers = [];
let currentDevices = [];
let devicesRequestVersion = 0;
const disconnectingDevices = new Set();
let selectedDevice = '';
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
let pairingServices = [];
let savedPhones = [];
let forgettingPhones = false;
let pairingDiscoveryState = 'pairing_idle';
let pairingDiscoveryInProgress = false;
let pairingDiscoveryFeedbackTimer = null;
let codePairingInProgress = false;
let qrPairingRequestId = 0;
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

const openReceivedFolderBtn = document.getElementById('open-received-folder-btn');
const transfersListContainer = document.getElementById('transfers-list-container');
const transferCountSpan = document.getElementById('transfer-count');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const autoAdbCheckbox = document.getElementById('auto-adb-checkbox');
const autoLaunchCheckbox = document.getElementById('auto-launch-checkbox');
const quickDeviceStatus = document.getElementById('quick-device-status');
const activeDeviceIndicator = document.getElementById('active-device-indicator');

const adbQrImg = document.getElementById('adb-qr-img');
const adbPairStatusBadge = document.getElementById('adb-pair-status-badge');
const refreshAdbQrBtn = document.getElementById('refresh-adb-qr-btn');
const codePairingForm = document.getElementById('adb-code-form');
const pairingDeviceSelect = document.getElementById('pairing-device-select');
const pairingCodeInput = document.getElementById('pairing-code-input');
const pairingCodeBtn = document.getElementById('pairing-code-btn');
const pairingDiscoveryStatus = document.getElementById('pairing-discovery-status');
const discoverPairingBtn = document.getElementById('discover-pairing-btn');
const connectPhoneBtn = document.getElementById('connect-phone-btn');
const pairingCodeFields = document.getElementById('pairing-code-fields');
const manualPairingDetails = document.getElementById('manual-pairing-details');
const pairingAddressInput = document.getElementById('pairing-address-input');
const qrPairingDetails = document.getElementById('qr-pairing-details');
const pairingUseAddress = document.getElementById('pairing-use-address');
let pairingMethod = 'discover';
const quickPortBox = document.getElementById('quick-port-box');
const pairedIpLabel = document.getElementById('paired-ip-label');
const quickPortInput = document.getElementById('quick-port-input');
const quickPortBtn = document.getElementById('quick-port-btn');
const devicesList = document.getElementById('devices-list');
const adbIpInput = document.getElementById('adb-ip-input');
const adbConnectBtn = document.getElementById('adb-connect-btn');
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

function setPrivacyText(element, text) {
    if (!element) return;
    element.dataset.privacyText = text;
    element.textContent = maskIdentifier(text);
}

function applyPrivacyVisibility() {
    for (const id of ['mobile-transfer-qr', 'adb-qr-img']) {
        const element = document.getElementById(id);
        if (element) element.style.visibility = isPrivacyMode ? 'hidden' : '';
    }
    for (const input of [adbIpInput, pairingAddressInput, pairingCodeInput]) {
        if (input) input.type = isPrivacyMode ? 'password' : 'text';
    }
    const mobileIpSelect = document.getElementById('mobile-ip-select');
    const textElements = [document.getElementById('mobile-transfer-url-text'), pairedIpLabel,
        ...Array.from(mobileIpSelect?.options || [])];
    for (const element of textElements) {
        if (element?.dataset.privacyText !== undefined) {
            element.textContent = maskIdentifier(element.dataset.privacyText);
        }
    }
}
function updatePrivacyUI() {
    applyPrivacyVisibility();
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

        renderTransfers();
        renderPairingDiscovery();
        renderSavedPhones();
        updatePairStatusBadge();
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

    renderTransfers();
    renderDevices();
    renderCapturesList();
    updatePairStatusBadge();
    renderPairingDiscovery();
    renderSavedPhones();
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
        osc.onended = () => ctx.close().catch(() => {});
        osc.stop(now + 0.35);
    } catch (e) {}
}

let toastTimer;
function showToast(message, color = 'var(--border-focus)', duration = 3500) {
    if (!toast) return;
    toast.textContent = typeof message === 'object' ? message?.message || 'İşlem tamamlanamadı.' : message;
    clearTimeout(toastTimer);
    toast.style.borderColor = color;
    toast.style.display = 'block';
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, duration);
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
        document.querySelectorAll('.nav-item, .tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
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
    bindOpenOnPhone();

    try {
        const res = await requestResponse('/api/qr');
        const data = await res.json();
        if (data && data.qrDataUrl) {
            mobileQrImg.src = data.qrDataUrl;
            if (mobileUrlLink) mobileUrlLink.href = data.url;
            setPrivacyText(mobileUrlText, data.url);
        }

        // Populate IP selector dropdown if available
        if (mobileIpSelect && data.availableIps && data.availableIps.length > 0) {
            mobileIpSelect.innerHTML = data.availableIps.map(item => {
                const isSel = (item.ip === data.ip) ? 'selected' : '';
                const label = `${item.ip} - ${item.friendlyName || item.name}`;
                return `<option value="${escapeHtml(item.ip)}" data-privacy-text="${escapeHtml(label)}" ${isSel}>${escapeHtml(maskIdentifier(label))}</option>`;
            }).join('');

            mobileIpSelect.onchange = async () => {
                const newIp = mobileIpSelect.value;
                try {
                    await requestResponse('/api/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ selectedIp: newIp })
                    });
                    showToast(i18n[currentLang].toast_ip_changed, 'var(--success)');
                    loadMobileTransferQr();
                } catch (err) { showToast(err.message, 'var(--danger)'); }
            };
        }

        if (openOnPhoneBtn) openOnPhoneBtn.style.display = currentDevices.length ? 'inline-flex' : 'none';
    } catch (e) {
        console.error('Mobile QR load error:', e);
    }
}

function bindOpenOnPhone() {
    const button = document.getElementById('open-on-phone-btn');
    if (!button || button.onclick) return;
    button.onclick = async () => {
        if (!selectedDevice) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');
        try { await requestJson('/api/adb/open-mobile-web', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: selectedDevice }) }); showToast(i18n[currentLang].toast_opened_on_phone); }
        catch (error) { showToast(error.message, 'var(--danger)'); }
    };
}
const copyMobileUrlBtn = document.getElementById('copy-mobile-url-btn');
if (copyMobileUrlBtn) {
    copyMobileUrlBtn.onclick = () => {
        const urlText = document.getElementById('mobile-transfer-url-text');
        const url = urlText?.dataset.privacyText;
        if (url) {
            navigator.clipboard.writeText(url).then(() => showToast(i18n[currentLang].toast_copied, 'var(--success)')).catch(() => showToast(currentLang === 'tr' ? 'Panoya yazma izni verilmedi.' : 'Clipboard access denied.', 'var(--danger)'));
        }
    };
}

// --- Saved wireless phones ---
function renderSavedPhones() {
    const list = document.getElementById('saved-phones-list');
    const forgetAll = document.getElementById('forget-all-phones-btn');
    if (!list || !forgetAll) return;
    const dict = i18n[currentLang];
    forgetAll.disabled = forgettingPhones || savedPhones.length === 0;
    list.replaceChildren();
    if (!savedPhones.length) {
        const empty = document.createElement('div');
        empty.className = 'loading-state';
        empty.textContent = dict.no_saved_phones;
        list.appendChild(empty);
        return;
    }
    savedPhones.forEach((phone, index) => {
        const card = document.createElement('div');
        card.className = 'device-card saved-phone-card';
        const info = document.createElement('div');
        info.className = 'saved-phone-info';
        const name = document.createElement('div');
        name.className = 'saved-phone-name';
        const names = [...new Set([phone.deviceName, phone.model].filter(Boolean))];
        name.textContent = names.length ? names.map(value => maskIdentifier(value)).join(' · ') : `${dict.pairing_device} ${index + 1}`;
        const address = document.createElement('div');
        address.className = 'saved-phone-address mono';
        address.textContent = maskIdentifier(phone.ip || phone.deviceId || phone.serial || '');
        info.appendChild(name);
        info.appendChild(address);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-danger btn-sm';
        button.textContent = dict.forget_phone;
        button.disabled = forgettingPhones;
        button.onclick = () => forgetSavedPhones(phone.serviceName || phone.phoneId);
        card.appendChild(info);
        card.appendChild(button);
        list.appendChild(card);
    });
}

async function forgetSavedPhones(serviceName) {
    if (forgettingPhones || codePairingInProgress) return;
    const dict = i18n[currentLang];
    if (!window.confirm(serviceName ? dict.forget_phone_confirm : dict.forget_all_phones_confirm)) return;
    forgettingPhones = true;
    devicesRequestVersion++;
    renderSavedPhones();
    try {
        const response = await requestResponse('/api/adb/forget', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceName ? { serviceName } : { all: true })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error?.message || data.error || dict.pairing_failed);
        savedPhones = data.knownDevices;
        currentDevices = data.devices;
        selectedDevice = data.selectedAdbDevice || '';
        currentPairingSession = null;
        lastPairedIp = '';
        if (quickPortBox) quickPortBox.style.display = 'none';
        updatePairStatusBadge();
        renderDevices();
        showToast(dict.phones_forgotten, 'var(--success)');
    } catch (e) {
        showToast(e.message, 'var(--danger)', 6000);
    } finally {
        forgettingPhones = false;
        devicesRequestVersion++;
        renderSavedPhones();
    }
}

document.getElementById('forget-all-phones-btn').onclick = () => forgetSavedPhones();

// --- ADB QR & Pairing ---
function updatePairingFormState() {
    const needsCode = !pairingCodeFields.hidden;
    const needsAddress = needsCode && pairingUseAddress.checked;
    pairingCodeInput.required = needsCode;
    pairingCodeInput.disabled = !needsCode;
    pairingAddressInput.required = needsAddress;
    pairingAddressInput.disabled = !needsAddress;
    connectPhoneBtn.hidden = pairingMethod !== 'discover' || needsCode;
    pairingCodeBtn.hidden = !needsCode;
}

function renderPairingDiscovery() {
    if (!pairingDeviceSelect) return;
    updatePairingFormState();
    const dict = i18n[currentLang];
    const manualDiscoveryInProgress = discoverPairingBtn.dataset.discoveryState === 'loading';
    discoverPairingBtn.disabled = manualDiscoveryInProgress;
    discoverPairingBtn.setAttribute('aria-busy', String(manualDiscoveryInProgress));
    document.getElementById('discover-pairing-label').textContent = dict.discover_phones;
    const optionsKey = JSON.stringify([currentLang, isPrivacyMode, pairingServices]);
    pairingDiscoveryStatus.textContent = dict[pairingDiscoveryState];
    connectPhoneBtn.disabled = codePairingInProgress || pairingUseAddress.checked || pairingServices.length === 0;
    if (pairingDeviceSelect.dataset.optionsKey === optionsKey) return;
    pairingDeviceSelect.dataset.optionsKey = optionsKey;
    const selected = pairingDeviceSelect.value;
    pairingDeviceSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = dict.pairing_select;
    pairingDeviceSelect.appendChild(placeholder);
    pairingServices.forEach((service, index) => {
        const option = document.createElement('option');
        option.value = service.ip;
        const model = (service.model || '').trim();
        const deviceName = (service.deviceName || '').trim();
        const names = [deviceName, model].filter((name, position, values) => name &&
            values.findIndex(value => value.toLocaleLowerCase() === name.toLocaleLowerCase()) === position);
        const label = names.length ? names.map(name => maskIdentifier(name)).join(' · ') : `${dict.pairing_device} ${index + 1}`;
        option.textContent = `${label} · ${maskIdentifier(service.ip)}`;
        pairingDeviceSelect.appendChild(option);
    });
    if (pairingServices.some(s => s.ip === selected)) pairingDeviceSelect.value = selected;
    else if (!selected && pairingServices.length === 1) pairingDeviceSelect.value = pairingServices[0].ip;
    if (selected && selected !== pairingDeviceSelect.value && pairingMethod === 'discover') {
        pairingCodeInput.value = '';
    }
}

async function discoverPairingPhones() {
    if (codePairingInProgress || !['discover', 'code'].includes(pairingMethod)) return;
    if (discoverPairingBtn.dataset.discoveryState !== 'loading') {
        clearTimeout(pairingDiscoveryFeedbackTimer);
        discoverPairingBtn.dataset.discoveryState = 'loading';
        pairingDiscoveryState = 'pairing_searching';
        renderPairingDiscovery();
    }
    if (pairingDiscoveryInProgress) return;
    pairingDiscoveryInProgress = true;
    const version = devicesRequestVersion;
    renderPairingDiscovery();
    try {
        const response = await requestResponse('/api/adb/wireless-phones');
        const data = await response.json();
        if (version !== devicesRequestVersion) return;
        if (!response.ok || !data.success) throw new Error('Discovery unavailable');
        pairingServices = data.services || [];
        pairingDiscoveryState = pairingServices.length > 1 ? 'pairing_multiple' :
            pairingServices.length === 1 ? 'pairing_found' : 'pairing_missing';
    } catch (e) {
        if (version !== devicesRequestVersion) return;
        pairingServices = [];
        pairingDiscoveryState = 'pairing_discovery_error';
    } finally {
        pairingDiscoveryInProgress = false;
        if (discoverPairingBtn.dataset.discoveryState === 'loading') {
            discoverPairingBtn.dataset.discoveryState = 'complete';
            pairingDiscoveryFeedbackTimer = setTimeout(() => {
                discoverPairingBtn.dataset.discoveryState = 'idle';
            }, 240);
        }
        renderPairingDiscovery();
        renderDevices();
    }
}

if (discoverPairingBtn) discoverPairingBtn.onclick = () => discoverPairingPhones();

pairingDeviceSelect.onchange = () => {
    pairingCodeInput.value = '';
    pairingCodeFields.hidden = pairingMethod !== 'code';
    updatePairingFormState();
};

pairingUseAddress.onchange = () => {
    manualPairingDetails.hidden = !pairingUseAddress.checked;
    pairingAddressInput.disabled = !pairingUseAddress.checked;
    pairingDeviceSelect.disabled = pairingUseAddress.checked;
    renderPairingDiscovery();
};

async function selectPairingMethod(method) {
    if (codePairingInProgress || ['pairing', 'paired'].includes(currentPairingSession?.status)) return;
    if (pairingMethod === 'qr' && method !== 'qr') {
        qrPairingRequestId++;
        try {
            const response = await requestResponse('/api/adb/pairing-cancel', { method: 'POST' });
            if (!response.ok) return;
        } catch (e) {
            return showToast(e.message, 'var(--danger)');
        }
        currentPairingSession = null;
        updatePairStatusBadge();
    }
    pairingMethod = method;
    document.querySelectorAll('[data-pairing-method]').forEach(button => {
        const active = button.dataset.pairingMethod === method;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    codePairingForm.hidden = !['discover', 'code'].includes(method);
    qrPairingDetails.hidden = method !== 'qr';
    document.getElementById('ip-connection-fields').hidden = method !== 'ip';
    document.getElementById('pairing-discovery-fields').hidden = !['discover', 'code'].includes(method);
    connectPhoneBtn.hidden = method !== 'discover';
    document.getElementById('pairing-address-choice').hidden = method !== 'code';
    pairingCodeFields.hidden = method !== 'code';
    pairingCodeInput.value = '';
    pairingUseAddress.checked = false;
    manualPairingDetails.hidden = true;
    pairingAddressInput.disabled = true;
    pairingDeviceSelect.disabled = false;
    updatePairStatusBadge();
    if (method === 'qr') await loadAdbPairingQr();
}

document.querySelectorAll('[data-pairing-method]').forEach(button => {
    button.onclick = () => selectPairingMethod(button.dataset.pairingMethod);
});

connectPhoneBtn.onclick = async () => {
    if (codePairingInProgress || pairingUseAddress.checked) return;
    const service = pairingServices.find(s => s.ip === pairingDeviceSelect.value);
    if (!service) return showToast(i18n[currentLang].pairing_select, 'var(--danger)');
    codePairingInProgress = true;
    connectPhoneBtn.disabled = true;
    pairingDeviceSelect.disabled = true;
    pairingCodeBtn.disabled = true;
    refreshAdbQrBtn.disabled = true;
    renderDevices();
    try {
        const response = await requestResponse('/api/adb/connect', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceName: service.name })
        });
        const data = await response.json();
        if (response.ok && data.needsPairing) {
            pairingCodeFields.hidden = false;
            updatePairingFormState();
            pairingCodeInput.focus();
            document.getElementById('pairing-address-choice').hidden = false;
            showToast(i18n[currentLang][data.reason === 'connection_failed' ? 'pairing_retry_hint' : 'pairing_first_time'], 'var(--accent)', 7000);
            return;
        }
        if (!response.ok || !data.success) throw new Error(data.error?.message || data.error || i18n[currentLang].pairing_failed);
        pairingCodeFields.hidden = true;
        updatePairingFormState();
        pairingCodeInput.value = '';
        service.reconnectable = false;
        currentDevices = data.devices;
        currentPairingSession = { mode: 'code', status: 'connected', pairedIp: service.ip };
        updatePairStatusBadge();
        renderDevices();
        showToast(i18n[currentLang].toast_device_connected, 'var(--success)');
    } catch (e) {
        showToast(e.message, 'var(--danger)', 6000);
    } finally {
        codePairingInProgress = false;
        pairingDeviceSelect.disabled = pairingUseAddress.checked;
        pairingCodeBtn.disabled = false;
        refreshAdbQrBtn.disabled = false;
        connectPhoneBtn.disabled = pairingUseAddress.checked || pairingServices.length === 0;
        renderDevices();
    }
};

window.reconnectDevice = async (serviceName) => {
    if (codePairingInProgress || disconnectingDevices.size > 0 || forgettingPhones) return;
    const service = pairingServices.find(phone => phone.name === serviceName && phone.reconnectable);
    if (!service) return showToast(i18n[currentLang].pairing_missing, 'var(--danger)');
    pairingDeviceSelect.value = service.ip;
    pairingUseAddress.checked = false;
    pairingUseAddress.onchange();
    pairingCodeInput.value = '';
    pairingCodeFields.hidden = true;
    updatePairingFormState();
    await connectPhoneBtn.onclick();
};

if (codePairingForm) codePairingForm.onsubmit = async event => {
    event.preventDefault();
    if (codePairingInProgress) return;
    if (pairingCodeFields.hidden) return connectPhoneBtn.click();
    const dict = i18n[currentLang];
    const code = pairingCodeInput.value.trim();
    if (pairingMethod === 'code' && !pairingUseAddress.checked && pairingServices.length > 1 && !pairingDeviceSelect.value) {
        return showToast(dict.pairing_select, 'var(--danger)');
    }
    if (!/^\d{6}$/.test(code)) return showToast(dict.pairing_code_invalid, 'var(--danger)');
    const payload = { code };
    if (pairingUseAddress.checked) {
        const address = pairingAddressInput.value.trim().match(/^(?:\[([^\]]+)\]|([^:\s]+)):(\d{1,5})$/);
        if (!address || Number(address[3]) < 1 || Number(address[3]) > 65535) {
            return showToast(dict.pairing_address_invalid, 'var(--danger)');
        }
        payload.ip = address[1] || address[2];
        payload.port = address[3];
    } else {
        const service = pairingServices.find(s => s.ip === pairingDeviceSelect.value);
        if (service) payload.serviceName = service.name;
        else if (pairingMethod !== 'code') return showToast(dict.pairing_select, 'var(--danger)');
    }
    codePairingInProgress = true;
    pairingCodeBtn.disabled = true;
    connectPhoneBtn.disabled = true;
    pairingDeviceSelect.disabled = true;
    refreshAdbQrBtn.disabled = true;
    currentPairingSession = { mode: 'code', status: 'pairing' };
    updatePairStatusBadge();
    try {
        const response = await requestResponse('/api/adb/pair', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error?.message || data.error || dict.pairing_failed);
        // WebSocket usually delivers this first; avoid duplicate success sounds/toasts.
        if (currentPairingSession?.status !== data.session.status) handleAdbPairStatus(data.session);
    } catch (e) {
        currentPairingSession = { mode: 'code', status: 'error' };
        updatePairStatusBadge();
        showToast(e.message, 'var(--danger)', 6000);
    } finally {
        pairingCodeInput.value = '';
        codePairingInProgress = false;
        pairingCodeBtn.disabled = false;
        connectPhoneBtn.disabled = pairingUseAddress.checked || pairingServices.length === 0;
        pairingDeviceSelect.disabled = pairingUseAddress.checked;
        refreshAdbQrBtn.disabled = false;
    }
};

function updatePairStatusBadge() {
    if (!adbPairStatusBadge) return;
    const dict = i18n[currentLang];
    if (!currentPairingSession || (currentPairingSession.status === 'waiting_for_scan' && pairingMethod !== 'qr')) {
        adbPairStatusBadge.textContent = dict.pairing_ready;
        return;
    }
    const ip = maskIdentifier(currentPairingSession.pairedIp || '');
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
        case 'error':
            adbPairStatusBadge.textContent = dict.pairing_failed;
            break;
        default:
            adbPairStatusBadge.textContent = dict.scan_qr_hint || dict.awaiting_scan;
    }
}

async function loadAdbPairingQr() {
    if (!adbQrImg || codePairingInProgress) return;
    const requestId = ++qrPairingRequestId;
    currentPairingSession = { mode: 'qr', status: 'waiting_for_scan' };
    updatePairStatusBadge();
    refreshAdbQrBtn.disabled = true;
    try {
        const res = await requestResponse('/api/adb/pairing-qr');
        const data = await res.json();
        if (requestId !== qrPairingRequestId || pairingMethod !== 'qr') return;
        if (res.ok && data.success) {
            adbQrImg.src = data.qrDataUrl;
            currentPairingSession = {
                mode: 'qr',
                status: data.status || 'waiting_for_scan',
                pairedIp: data.pairedIp
            };
            updatePairStatusBadge();
        } else throw new Error(data.error?.message || data.error);
    } catch (e) {
        if (requestId === qrPairingRequestId && adbPairStatusBadge) adbPairStatusBadge.textContent = i18n[currentLang].error_loading_qr;
    } finally {
        if (requestId === qrPairingRequestId) refreshAdbQrBtn.disabled = false;
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
            const res = await requestResponse('/api/adb/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.success) {
                showToast(maskIdentifier(`${ip}:${port}`), 'var(--success)');
                playChime();
                if (quickPortBox) quickPortBox.style.display = 'none';
                if (adbPairStatusBadge) adbPairStatusBadge.textContent = maskIdentifier(`${ip}:${port}`);
                refreshDevices();
            } else {
                showToast(data.error, 'var(--danger)', 5000);
            }
        } catch (e) {
            showToast(e.message, 'var(--danger)');
        }
    };
}

window.disconnectDevice = async (deviceId) => {
    if (disconnectingDevices.has(deviceId)) return;
    disconnectingDevices.add(deviceId);
    devicesRequestVersion++;
    renderDevices();
    try {
        const res = await requestResponse('/api/adb/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
        });
        const data = await res.json();
        if (Array.isArray(data.devices)) currentDevices = data.devices;
        if (res.ok && data.success) {
            selectedDevice = data.selectedAdbDevice || '';
            currentPairingSession = null;
            lastPairedIp = '';
            if (quickPortBox) quickPortBox.style.display = 'none';
            updatePairStatusBadge();
            showToast(`${i18n[currentLang].toast_disconnected} ${deviceId}`, 'var(--success)');
        } else {
            showToast(data.error, 'var(--danger)');
        }
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    } finally {
        disconnectingDevices.delete(deviceId);
        devicesRequestVersion++;
        renderDevices();
    }
};

// --- 60 FPS Video Stream & Controls ---
async function fetchDisplaySize(deviceId) {
    try {
        const res = await requestResponse(`/api/adb/display-size?deviceId=${encodeURIComponent(deviceId)}`);
        const data = await res.json();
        if (deviceId === displayedStreamDevice && data && data.width && data.height) {
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

let displayedStreamDevice = '';
function startWebScreenStream() {
    const target = selectedDevice;
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');

    displayedStreamDevice = target;
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
        screenStreamStatusBadge.textContent = currentLang === 'tr' ? 'Başlatılıyor…' : 'Starting…';
        screenStreamStatusBadge.style.color = 'var(--success)';
    }

    initJMuxer();

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'START_SCREEN_STREAM',
            deviceId: target
        }));
    }


}

function stopWebScreenStream(notifyServer = true) {
    displayedStreamDevice = '';
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

    if (notifyServer && ws && ws.readyState === WebSocket.OPEN) {
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

    if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return null;
    const videoWidth = screenVideo.videoWidth || phonePhysicalWidth;
    const videoHeight = screenVideo.videoHeight || phonePhysicalHeight;
    const scale = Math.min(rect.width / videoWidth, rect.height / videoHeight);
    const contentWidth = videoWidth * scale;
    const contentHeight = videoHeight * scale;
    const offsetX = (rect.width - contentWidth) / 2;
    const offsetY = (rect.height - contentHeight) / 2;
    if (clickX < offsetX || clickY < offsetY || clickX >= offsetX + contentWidth || clickY >= offsetY + contentHeight) return null;
    const rotated = (videoWidth > videoHeight) !== (phonePhysicalWidth > phonePhysicalHeight);
    const scaleX = (rotated ? phonePhysicalHeight : phonePhysicalWidth) / contentWidth;
    const scaleY = (rotated ? phonePhysicalWidth : phonePhysicalHeight) / contentHeight;

    return {
        x: Math.round((clickX - offsetX) * scaleX),
        y: Math.round((clickY - offsetY) * scaleY)
    };
}

screenVideo.onmousedown = (e) => {
    if (e.button !== 0) return;
    isTouchDown = true;
    const coords = getScaledTouchCoords(e);
    if (!coords) { isTouchDown = false; return; }
    touchStartX = coords.x;
    touchStartY = coords.y;
};

screenVideo.onmouseup = (e) => {
    if (!isTouchDown || e.button !== 0) return;
    isTouchDown = false;
    const coords = getScaledTouchCoords(e);
    if (!coords) return;

    const dist = Math.hypot(coords.x - touchStartX, coords.y - touchStartY);
    const target = displayedStreamDevice;
    if (!target) return;

    if (dist < 18) {
        requestResponse('/api/adb/touch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId: target,
                type: 'tap',
                x: coords.x,
                y: coords.y
            })
        }).catch(error => showToast(error.message, 'var(--danger)'));
    } else {
        requestResponse('/api/adb/touch', {
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
        }).catch(error => showToast(error.message, 'var(--danger)'));
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
    const target = selectedDevice;
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');

    let dataUrl = '';
    let blob = null;

    if (isWebStreaming && screenVideo.style.display !== 'none' && screenVideo.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } else {
        showToast(i18n[currentLang].toast_capturing);
        try {
            const res = await requestResponse(`/api/adb/screenshot?deviceId=${encodeURIComponent(target)}&t=${Date.now()}`, { responseType: 'blob' });
            if (!res.ok || !res.headers.get('content-type')?.includes('image/png')) throw new Error('Geçersiz ekran görüntüsü');
            blob = await res.blob();
        } catch (e) {
            showToast(i18n[currentLang].toast_capture_error, 'var(--danger)');
            return;
        }
    }

    if (!blob || blob.size < 24) return showToast(i18n[currentLang].toast_capture_error, 'var(--danger)');
    let decoded;
    try { decoded = await createImageBitmap(blob); } catch (_) { return showToast(i18n[currentLang].toast_capture_error, 'var(--danger)'); }
    const resolution = `${decoded.width}x${decoded.height}`; decoded.close();
    dataUrl = URL.createObjectURL(blob);

    const newCapture = {
        id: crypto.randomUUID(),
        capturedAt: Date.now(),
        dataUrl,
        blob,
        time: new Date().toLocaleTimeString(),
        resolution
    };

    capturedScreenshots.unshift(newCapture);
    if (capturedScreenshots.length > 50) URL.revokeObjectURL(capturedScreenshots.pop().dataUrl);
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
      <div class="capture-item" data-id="${escapeHtml(c.id)}">
        <button type="button" class="capture-thumb-box" data-capture-action="open" title="${i18n[currentLang].preview_modal_title}">
          <img src="${c.dataUrl}" class="capture-thumb" alt="Capture">
        </button>
        <div class="capture-footer">
          <div class="capture-info">
            <span class="capture-time">${escapeHtml(c.time)}</span>
            <span class="capture-meta">${escapeHtml(c.resolution)}</span>
          </div>
          <div class="capture-btn-group">
            <button class="btn-card-icon" data-capture-action="save" title="${i18n[currentLang].save_capture}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="btn-card-icon danger" data-capture-action="delete" title="${i18n[currentLang].delete_capture}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
}

capturesList?.addEventListener('click', event => {
    const action = event.target.closest('[data-capture-action]');
    const item = action?.closest('.capture-item');
    if (!item) return;
    if (action.dataset.captureAction === 'open') window.openImageModal(item.dataset.id);
    else if (action.dataset.captureAction === 'save') window.saveCaptureFile(item.dataset.id);
    else if (action.dataset.captureAction === 'delete') window.deleteCapture(item.dataset.id);
});

window.saveCaptureFile = async (id) => {
    const item = capturedScreenshots.find(c => c.id == id);
    if (!item) return;

    const defaultFilename = `screenshot_${new Date(item.capturedAt || item.id).toISOString().replace(/[:.]/g, '-')}.png`;

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
    const item = capturedScreenshots.find(c => c.id == id);
    if (item?.dataUrl.startsWith('blob:')) URL.revokeObjectURL(item.dataUrl);
    capturedScreenshots = capturedScreenshots.filter(c => c.id != id);
    renderCapturesList();
};

let previewTrigger = null;
window.openImageModal = (id) => {
    const item = capturedScreenshots.find(c => c.id == id);
    if (!item || !imageModal) return;
    modalImg.src = item.dataUrl;
    if (modalTitle) modalTitle.textContent = `${i18n[currentLang].preview_modal_title} (${item.time} - ${item.resolution})`;
    imageModal.style.display = 'flex';
    previewTrigger = document.activeElement;
    document.body.classList.add('modal-open');
    modalCloseBtn?.focus?.();
};

function closeImageModal() {
    if (imageModal) imageModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    if (previewTrigger?.isConnected) previewTrigger.focus();
}

if (modalCloseBtn) {
    modalCloseBtn.onclick = closeImageModal;
}

if (imageModal) {
    imageModal.onclick = (e) => {
        if (e.target === imageModal) closeImageModal();
    };
    imageModal.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeImageModal();
        } else if (event.key === 'Tab') {
            // The close button is the preview's only interactive control.
            event.preventDefault();
            modalCloseBtn?.focus?.();
        }
    });
}

// Direct IP Connect
if (adbConnectBtn) {
    adbConnectBtn.onclick = async () => {
        const target = adbIpInput.value.trim();
        if (!target) return showToast(i18n[currentLang].toast_ip_required, 'var(--danger)');
        const address = target.match(/^(?:\[([^\]]+)\]|([^:\s]+))(?::(\d{1,5}))?$/);
        if (!address || (address[3] && (Number(address[3]) < 1 || Number(address[3]) > 65535))) {
            return showToast(i18n[currentLang].toast_ip_required, 'var(--danger)');
        }
        const ip = address[1] || address[2];
        const port = address[3] || '5555';

        showToast(`${maskIdentifier(ip)}...`);
        try {
            const res = await requestResponse('/api/adb/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.needsPairing) {
                await selectPairingMethod('code');
                const service = pairingServices.find(service => service.ip === ip);
                if (service) pairingDeviceSelect.value = service.ip;
                else {
                    pairingUseAddress.checked = true;
                    pairingUseAddress.onchange();
                    pairingAddressInput.value = `${ip.includes(':') ? `[${ip}]` : ip}:`;
                }
                pairingCodeInput.focus();
                showToast(i18n[currentLang].pairing_first_time, 'var(--accent)', 7000);
                return;
            }
            if (data.success) {
                showToast(maskIdentifier(`${ip}:${port}`), 'var(--success)');
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
let wsReconnectTimer;
let wsReconnectAttempts = 0;
let pageClosing = false;
const terminalOperations = new Set();
function connectWs() {
    clearTimeout(wsReconnectTimer);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    const socket = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        wsReconnectAttempts = 0;
        console.log('[WebSocket] Connected');
    };

    ws.onmessage = (event) => {
        if (socket !== ws) return;
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

        let data;
        try { data = JSON.parse(event.data); } catch (_) { return; }
        if (!data || typeof data.type !== 'string') return;
        if (['TRANSFER_COMPLETED', 'TRANSFER_FAILED', 'ADB_INSTALL_SUCCESS', 'ADB_INSTALL_ERROR'].includes(data.type)) {
            const operationId = data.operationId || data.transfer?.id;
            if (operationId && terminalOperations.has(operationId)) return;
            if (operationId) terminalOperations.add(operationId);
            if (terminalOperations.size > 1000) terminalOperations.delete(terminalOperations.values().next().value);
        }

        if (data.type === 'INIT') {
            currentTransfers = data.transfers || [];
            currentDevices = data.devices || [];
            if (data.config) applyServerConfig(data.config);

            renderTransfers();
            renderDevices();
            if (data.pairingSession && adbQrImg) {
                if (data.pairingSession.qrDataUrl) adbQrImg.src = data.pairingSession.qrDataUrl;
                handleAdbPairStatus(data.pairingSession);
            }
            if (data.clipboardMode) {
                updateClipboardUI(data.clipboardMode);
            }
            loadMobileTransferQr();
        } else if (data.type === 'NEW_APK') {

            playChime();
            showToast(`${i18n[currentLang].toast_ready} ${data.apk.name}`, 'var(--success)');
        } else if (data.type === 'TRANSFER_PROGRESS') {
            const transfer = currentTransfers.find(item => item.id === data.id && item.operationId === data.operationId);
            if (transfer?.status === 'transferring' && Number.isFinite(data.progress)) {
                transfer.progress = Math.max(transfer.progress || 0, Math.min(99, Math.max(0, Math.floor(data.progress))));
                renderTransfers();
            }
        } else if (data.type === 'TRANSFER_FAILED') {
            currentTransfers = data.transfers || currentTransfers; renderTransfers();
            showToast(data.transfer?.error || 'Aktarım başarısız. Dosya PC’de korunuyor.', 'var(--danger)');
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
            
            renderTransfers();
            playChime();
            const count = data.transfers ? data.transfers.length : 1;
            showToast(data.message || `${i18n[currentLang].toast_file_received_from_phone} (${count})`, 'var(--success)', 5000);
        } else if (data.type === 'TRANSFERS_UPDATED') {
            currentTransfers = data.transfers || [];
            renderTransfers();
        } else if (data.type === 'ADB_INSTALL_START') {
            showToast(`${i18n[currentLang].toast_installing} ${data.apkName || ""}`, 'var(--warning)', 4000);
        } else if (data.type === 'ADB_INSTALL_SUCCESS') {
            showToast(`${i18n[currentLang].toast_installed} ${data.apkName}`, 'var(--success)', 4000);
        } else if (data.type === 'ADB_INSTALL_ERROR' || data.type === 'ADB_LAUNCH_ERROR') {
            showToast(`${i18n[currentLang].toast_install_err} ${data.error}`, 'var(--danger)', 6000);
        } else if (data.type === 'DEVICES_UPDATED') {
            if (disconnectingDevices.size > 0) return;
            devicesRequestVersion++;
            currentDevices = data.devices || [];
            renderDevices();
            const openOnPhoneBtn = document.getElementById('open-on-phone-btn');
            if (openOnPhoneBtn) {
                openOnPhoneBtn.style.display = (currentDevices && currentDevices.length > 0) ? 'inline-flex' : 'none';
            }
        } else if (data.type === 'CONFIG_UPDATED') {
            applyServerConfig(data.config);
        } else if (data.type === 'MOBILE_QR_UPDATED') {
            const mobileQrImg = document.getElementById('mobile-transfer-qr');
            const mobileUrlLink = document.getElementById('mobile-transfer-url-link');
            const mobileUrlText = document.getElementById('mobile-transfer-url-text');
            const mobileIpSelect = document.getElementById('mobile-ip-select');
            if (mobileQrImg && data.qrDataUrl) mobileQrImg.src = data.qrDataUrl;
            if (mobileUrlLink && data.url) mobileUrlLink.href = data.url;
            if (data.url) setPrivacyText(mobileUrlText, data.url);
            if (mobileIpSelect && data.availableIps) {
                mobileIpSelect.innerHTML = data.availableIps.map(item => {
                    const isSel = (item.ip === data.ip) ? 'selected' : '';
                    const label = `${item.ip} - ${item.friendlyName || item.name}`;
                    return `<option value="${escapeHtml(item.ip)}" data-privacy-text="${escapeHtml(label)}" ${isSel}>${escapeHtml(maskIdentifier(label))}</option>`;
                }).join('');
            }
        } else if (['WATCHER_ERROR', 'PERSISTENCE_ERROR', 'CLIPBOARD_ERROR'].includes(data.type)) {
            showToast(data.error, 'var(--danger)', 6000);
        } else if (data.type === 'CLIPBOARD_MODE_CHANGED' || data.type === 'CLIPBOARD_SYNC_STATUS') {
            updateClipboardUI(data.mode || (data.active ? 'phone-to-pc' : 'off'));
        } else if (data.type === 'ADB_PAIR_STATUS') {
            handleAdbPairStatus(data.session);
        } else if (data.type === 'SCREEN_STREAM_STATUS') {
            if (data.running && data.deviceId === displayedStreamDevice && screenStreamStatusBadge) screenStreamStatusBadge.textContent = i18n[currentLang].live;
            if (!data.running && isWebStreaming) {
                stopWebScreenStream(false);
            }
            if (data.error) showToast(data.error, 'var(--danger)');
        }
    };

    ws.onerror = () => socket.close();
    ws.onclose = () => {
        if (socket !== ws || pageClosing) return;
        currentDevices = [];
        renderDevices();
        if (isWebStreaming) stopWebScreenStream(false);
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = setTimeout(connectWs, Math.min(30000, 1000 * 2 ** Math.min(wsReconnectAttempts++, 5)));
    };
}

function handleAdbPairStatus(session) {
    if (!session) {
        currentPairingSession = null;
        lastPairedIp = '';
        if (quickPortBox) quickPortBox.style.display = 'none';
        updatePairStatusBadge();
        return;
    }
    currentPairingSession = session;
    updatePairStatusBadge();
    const busy = session.status === 'pairing' || session.status === 'paired';
    if (pairingCodeBtn) pairingCodeBtn.disabled = busy || codePairingInProgress;
    if (refreshAdbQrBtn) refreshAdbQrBtn.disabled = busy || codePairingInProgress;
    if (quickPortBox) quickPortBox.style.display = session.status === 'paired_need_port' ? 'block' : 'none';

    if (session.pairedIp) {
        lastPairedIp = session.pairedIp;
        setPrivacyText(pairedIpLabel, `${session.pairedIp}:`);
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
        if (pairingCodeFields) pairingCodeFields.hidden = true;
        updatePairingFormState();
        if (quickPortBox) quickPortBox.style.display = 'none';
        playChime();
        showToast(i18n[currentLang].toast_device_connected, 'var(--success)', 4000);
        refreshDevices();
    }
}

// Render APKs with active i18n
// Render Transferred Files List
function renderTransfers() {
    if (transferCountSpan) {
        transferCountSpan.textContent = currentTransfers.length;
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

        const dirBadge = isMobileToPc
            ? `<span class="badge-dir badge-dir-received">${dict.dir_phone_to_pc}</span>`
            : `<span class="badge-dir badge-dir-sent">${dict.dir_pc_to_phone}</span>`;

        let statusText = '';
        let statusColor = 'var(--success)';
        const progress = t.status === 'transferred' ? 100 : Math.min(99, Math.max(0, Math.floor(Number(t.progress) || 0)));
        const showProgress = !isMobileToPc && t.status === 'transferring';

        if (isMobileToPc) {
            statusText = dict.status_received || 'PC\'ye Alındı';
            statusColor = 'var(--success)';
        } else if (t.status === 'transferred') {
            statusText = `${dict.status_transferred} · 100%`;
            statusColor = 'var(--success)';
        } else if (t.status === 'queued') {
            statusText = currentLang === 'tr' ? 'Sırada' : 'Queued';
            statusColor = 'var(--warning)';
        } else if (t.status === 'transferring') {
            statusText = `${currentLang === 'tr' ? 'Telefona aktarılıyor' : 'Sending to phone'} · ${progress}%`;
            statusColor = 'var(--warning)';
        } else if (t.status === 'interrupted') {
            statusText = currentLang === 'tr' ? 'Kesildi; yeniden gönderin' : 'Interrupted; resend';
            statusColor = 'var(--warning)';
        } else if (t.status === 'saved') {
            statusText = dict.status_saved;
            statusColor = 'var(--warning)';
        } else {
            statusText = dict.status_error;
            statusColor = 'var(--danger)';
        }

        const filePath = (isMobileToPc ? t.localPath || 'received/' : t.remotePath || t.targetDir || '').replace(/\\/g, '/');
        const pathDisplay = escapeHtml(maskIdentifier(filePath));
        const folderPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath.slice(0, filePath.lastIndexOf('/'));
        const folderName = escapeHtml(maskIdentifier(folderPath.split('/').filter(Boolean).pop() || dict.transfer_location));

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
          ${['error', 'interrupted', 'saved'].includes(t.status) && t.phoneSerial ? `<button class="btn-transfer-action btn-transfer-retry" data-id="${safeId}">${currentLang === 'tr' ? 'Yeniden dene' : 'Retry'}</button>` : ''}
          <button class="btn-transfer-action btn-transfer-delete" data-id="${safeId}" title="${dict.delete}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            ${dict.delete}
          </button>
        `;

        return `
          <div class="transfer-card">
            <div class="transfer-left">
              <div class="transfer-icon" aria-hidden="true">${icon}</div>
              <div class="transfer-meta">
                <div class="transfer-name" title="${safeFilename}">${safeFilename}</div>
                <div class="transfer-facts">
                  ${dirBadge}
                  ${t.size ? `<span class="transfer-size">${escapeHtml(t.size)}</span>` : ''}
                  ${t.timestamp ? `<span class="transfer-time">${escapeHtml(t.timestamp)}</span>` : ''}
                </div>
                ${filePath ? `<details class="transfer-location"><summary><span>${escapeHtml(dict.transfer_location)}: ${folderName}</span></summary><div class="transfer-path mono">${pathDisplay}</div></details>` : ''}
              </div>
            </div>
            <div class="transfer-footer">
              <span class="transfer-status" style="color: ${statusColor};">${statusText}</span>
              <div class="transfer-right">${actionsHtml}</div>
            </div>
            ${showProgress ? `<progress class="transfer-progress" max="100" value="${progress}" aria-label="${escapeHtml(statusText)}">${progress}%</progress>` : ''}
          </div>
        `;
    }).join('');
}

// Open received file with default Windows app
window.retryTransfer = async id => {
    try {
        await requestJson('/api/transfers/retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        showToast(currentLang === 'tr' ? 'Aktarım kuyruğa alındı…' : 'Transfer queued…');
    } catch (error) { showToast(error.message, 'var(--danger)'); }
};

window.openReceivedFile = async (filename, filePath) => {
    try {
        await requestJson('/api/transfers/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentTransfers.find(t => t.localPath === filePath && t.filename === filename)?.id })
        });
    } catch (e) {
        console.error('File open error:', e);
    }
};

// Open received files directory or select file in Windows Explorer
window.openReceivedFolder = async (filename, filePath) => {
    try {
        const transfer = currentTransfers.find(t => t.localPath === filePath && t.filename === filename);
        if (!transfer) throw new Error(currentLang === 'tr' ? 'Dosya kaydı bulunamadı. Listeyi yenileyin.' : 'File record not found. Refresh the list.');
        await requestJson('/api/transfers/open-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: transfer.id })
        });
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
};

// Delete transfer entry and local file
window.deleteTransfer = async (id) => {
    try {
        const json = await requestJson('/api/transfers/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (json.transfers) {
            currentTransfers = json.transfers;
            renderTransfers();
        }
        showToast(i18n[currentLang].toast_transfer_deleted, 'var(--warning)', 3000);
    } catch (e) {
        console.error('Delete transfer error:', e);
    }
};

// Safe Event Delegation for Transfer Actions
if (transfersListContainer) {
    transfersListContainer.addEventListener('click', (e) => {
        const retryBtn = e.target.closest('.btn-transfer-retry');
        if (retryBtn) { window.retryTransfer(retryBtn.getAttribute('data-id')); return; }
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
            await requestResponse('/api/transfers/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
        } catch (e) {
            showToast(e.message, 'var(--danger)');
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
    const onlineDev = currentDevices.find(d => d.id === selectedDevice || d.transports?.some(t => t.id === selectedDevice));
    if (onlineDev && onlineDev.state === 'device') {
        headerDevicePill.classList.add('connected');
        const displayModel = isPrivacyMode ? maskIdentifier(onlineDev.model) : onlineDev.model;
        headerDeviceText.textContent = displayModel;
        headerDevicePill.title = `${maskIdentifier(onlineDev.model)} (${maskIdentifier(onlineDev.id)})`;
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
    const target = deviceId || selectedDevice;
    if (!target) return updateBatteryUI(null);
    try {
        const res = await requestResponse(`/api/adb/battery?deviceId=${encodeURIComponent(target)}`);
        const data = await res.json();
        if (target === selectedDevice && data.success && data.battery) {
            updateBatteryUI(data.battery);
        }
    } catch (e) {}
}

// Periodic Battery Poller (Every 20 seconds)
setInterval(() => {
    if (selectedDevice) {
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
        const target = selectedDevice;
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
            const res = await requestResponse('/api/clipboard/mode', {
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
    currentDevices = currentDevices.flatMap(device => {
        const transports = device.transports || [device];
        const visible = transports.filter(transport => transport.state !== 'offline' ||
            !(transport.isWifi || transport.id.includes(':') || transport.id.includes('._adb-tls-connect._tcp')));
        if (visible.length === transports.length) return [device];
        if (!visible.length) return [];
        const primary = visible.find(transport => transport.state === 'device') || visible[0];
        return [{ ...device, ...primary, transportId: primary.id, transports: visible }];
    });
    updateHeaderDevicePill();
    if (!devicesList) return;
    devicesList.replaceChildren();
    const reconnectablePhones = pairingServices.filter(phone => phone.reconnectable &&
        !currentDevices.some(device => (device.transports || [device]).some(transport =>
            transport.id === phone.name || transport.id.replace(/\.$/, '') === `${phone.name}.${phone.type}` ||
            transport.id === `${phone.ip.includes(':') ? '[' + phone.ip + ']' : phone.ip}:${phone.port}`)));
    if (!currentDevices?.length && !reconnectablePhones.length) {
        const empty = document.createElement('div'); empty.className = 'loading-state'; empty.textContent = i18n[currentLang].no_devices_attached;
        devicesList.appendChild(empty);
    }
    const selected = currentDevices.find(d => d.id === selectedDevice || d.transports?.some(t => t.id === selectedDevice));
    if (activeDeviceIndicator) {
        const deviceName = [selected?.deviceName, selected?.model].find(name => name?.trim() &&
            name !== selected?.id && name !== selectedDevice && !/^adb-|\._adb-|^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/i.test(name));
        activeDeviceIndicator.hidden = !deviceName;
        activeDeviceIndicator.textContent = deviceName ? `${i18n[currentLang].target_prefix} ${maskIdentifier(deviceName)}` : '';
    }
    if (quickDeviceStatus) quickDeviceStatus.textContent = selected ? maskIdentifier(selected.model) : i18n[currentLang].no_device;
    for (const device of currentDevices) {
        const card = document.createElement('div'); card.className = 'device-card';
        const info = document.createElement('div');
        const title = document.createElement('div'); title.textContent = maskIdentifier(device.model); info.appendChild(title);
        for (const transport of device.transports || [device]) {
            const label = document.createElement('label');
            const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'adb-device'; radio.value = transport.id;
            radio.checked = transport.id === selectedDevice;
            radio.disabled = transport.state !== 'device' || disconnectingDevices.has(transport.id);
            radio.onchange = () => window.changeSelectedDevice(transport.id);
            label.appendChild(radio);
            const text = document.createElement('span'); text.textContent = (transport.isWifi || transport.id.includes(':') || transport.id.includes('._adb-tls-connect._tcp')) ? 'Wi-Fi' : 'USB'; label.appendChild(text);
            info.appendChild(label);
            if (transport.isWifi || transport.id.includes(':') || transport.id.includes('._adb-tls-connect._tcp')) {
                const button = document.createElement('button'); button.className = 'btn btn-secondary btn-sm';
                button.textContent = i18n[currentLang].disconnect;
                button.disabled = disconnectingDevices.size > 0 || codePairingInProgress || forgettingPhones;
                button.onclick = () => window.disconnectDevice(transport.id);
                info.appendChild(button);
            }
        }
        card.appendChild(info);
        const state = document.createElement('span'); state.className = 'count-badge';
        state.textContent = i18n[currentLang][device.state === 'device' ? 'ready' : device.state === 'unauthorized' ? 'device_unauthorized' : 'device_offline'];
        card.appendChild(state); devicesList.appendChild(card);
    }
    for (const phone of reconnectablePhones) {
        const card = document.createElement('div'); card.className = 'device-card';
        const info = document.createElement('div');
        const title = document.createElement('div'); title.textContent = maskIdentifier(phone.model || i18n[currentLang].pairing_device);
        const address = document.createElement('div'); address.textContent = 'Wi-Fi';
        const button = document.createElement('button'); button.className = 'btn btn-primary btn-sm';
        button.textContent = i18n[currentLang].reconnect;
        button.disabled = codePairingInProgress || disconnectingDevices.size > 0 || forgettingPhones;
        button.onclick = () => window.reconnectDevice(phone.name);
        info.appendChild(title); info.appendChild(address); info.appendChild(button);
        const state = document.createElement('span'); state.className = 'count-badge';
        state.textContent = i18n[currentLang].disconnected;
        card.appendChild(info); card.appendChild(state); devicesList.appendChild(card);
    }
}

window.changeSelectedDevice = (id) => {
    if (isWebStreaming) stopWebScreenStream();
    selectedDevice = id;
    renderDevices();
    saveSettings({ selectedAdbDevice: id });
};

window.installViaAdb = async (apkId, apkName) => {
    const target = selectedDevice;
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');
    showToast(`${i18n[currentLang].toast_installing} ${apkName}...`);
    try {
        const res = await requestResponse('/api/adb/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, apkId })
        });
        const data = await res.json();
        if (!data.success) showToast(data.error, 'var(--danger)');
    } catch (e) {
        if (e.operationId) {
            if (terminalOperations.has(e.operationId)) return;
            terminalOperations.add(e.operationId);
            if (terminalOperations.size > 1000) terminalOperations.delete(terminalOperations.values().next().value);
        }
        showToast(e.message, 'var(--danger)');
    }
};

window.launchApp = async (packageName) => {
    const target = selectedDevice;
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');
    try {
        await requestJson('/api/adb/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, packageName })
        });
        showToast(`${i18n[currentLang].toast_launched} ${packageName}`);
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
};

window.stopApp = async (packageName) => {
    const target = selectedDevice;
    if (!target) return showToast(i18n[currentLang].toast_no_device, 'var(--danger)');
    try {
    await requestJson('/api/adb/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: target, packageName })
    });
    showToast(`${i18n[currentLang].toast_stopped} ${packageName}`);
    } catch (error) { showToast(error.message, 'var(--danger)'); }
};

window.sendRemoteKey = async (keyCode) => {
    const target = displayedStreamDevice || selectedDevice;
    if (!target) return;
    try {
        await requestResponse('/api/adb/key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: target, keyCode, code: keyCode })
        });
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
};

if (autoAdbCheckbox) autoAdbCheckbox.onchange = () => saveSettings({ autoInstallOnAdb: autoAdbCheckbox.checked });
if (autoLaunchCheckbox) autoLaunchCheckbox.onchange = () => saveSettings({ autoLaunchAfterInstall: autoLaunchCheckbox.checked });

let settingsVersion = 0;
let confirmedSelectedDevice = '';
let confirmedConfigRevision = -1;
let latestServerConfig = null;
let settingsPending = false;
function applyServerConfig(value) {
    if (!value || (value.revision || 0) < confirmedConfigRevision) return;
    confirmedConfigRevision = value.revision || 0;
    latestServerConfig = value;
    savedPhones = value.knownWirelessDevices || []; renderSavedPhones();
    if (!settingsPending) {
        selectedDevice = value.selectedAdbDevice || '';
        confirmedSelectedDevice = selectedDevice;
        if (autoAdbCheckbox) autoAdbCheckbox.checked = !!value.autoInstallOnAdb;
        if (autoLaunchCheckbox) autoLaunchCheckbox.checked = value.autoLaunchAfterInstall !== false;
    }
    renderDevices();
}
async function requestResponse(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (options.responseType === 'blob' && response.ok) {
            const blob = await response.blob();
            return { ok: response.ok, headers: response.headers, blob: async () => blob };
        }
        let data;
        try { data = await response.json(); } catch (_) { throw new Error('Sunucudan geçerli yanıt alınamadı. Tekrar deneyin.'); }
        if (!data || typeof data !== 'object') throw new Error('Sunucudan geçerli yanıt alınamadı. Hub bağlantısını kontrol edin.');
        if (!response.ok || (data.success === false && !data.needsPairing)) throw Object.assign(new Error(data.error?.message || (typeof data.error === 'string' ? data.error : 'İşlem tamamlanamadı. Tekrar deneyin.')), { operationId: data.operationId });
        return { ok: response.ok, status: response.status, json: async () => data };
    } catch (error) {
        if (error.name === 'AbortError') throw new Error(currentLang === 'tr' ? 'İşlem iptal edildi veya zaman aşımına uğradı. Bağlantıyı kontrol edin.' : 'Request cancelled or timed out. Check the connection.');
        if (error.name === 'TypeError') throw new Error(currentLang === 'tr' ? 'Hub’a ulaşılamadı. Sunucunun açık olduğunu kontrol edip paneli yeniden açın.' : 'Hub is unavailable. Check the server and reopen the dashboard.');
        throw error;
    } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel); }
}
async function requestJson(url, options = {}) {
    return (await requestResponse(url, options)).json();
}
async function saveSettings(patch) {
    const version = ++settingsVersion;
    settingsPending = true;
    try {
        const data = await requestJson('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
        if (version === settingsVersion) {
            settingsPending = false;
            applyServerConfig((latestServerConfig?.revision || 0) > (data.config.revision || 0) ? latestServerConfig : data.config);
        }
    } catch (error) {
        if (version !== settingsVersion) return;
        settingsPending = false;
        if (latestServerConfig) applyServerConfig(latestServerConfig);
        else selectedDevice = confirmedSelectedDevice;
        renderDevices();
        showToast(error.message, 'var(--danger)');
    }
}

refreshDevicesBtn.onclick = refreshDevices;

async function refreshDevices() {
    const version = ++devicesRequestVersion;
    try {
        const res = await requestResponse('/api/adb/devices');
        if (!res.ok) throw new Error(i18n[currentLang].pairing_discovery_error);
        const devices = await res.json();
        if (version !== devicesRequestVersion || disconnectingDevices.size > 0 || forgettingPhones) return;
        currentDevices = devices;
        renderDevices();
        showToast(i18n[currentLang].toast_device_refreshed);
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
}

// Drag & Drop (Universal File Transfer & APK)
dropzone.onclick = () => fileInput.click();
dropzone.onkeydown = event => {
    if (event.target === dropzone && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        fileInput.click();
    }
};

fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(f => uploadFile(f));
        fileInput.value = "";
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

const uploadQueue = [];
let activeUploads = 0;
function uploadFile(file) {
    if (uploadQueue.length >= 100) {
        showToast(currentLang === 'tr' ? 'Yükleme kuyruğu dolu. Devam eden dosyaların bitmesini bekleyin.' : 'Upload queue is full. Wait for current files.', 'var(--danger)');
        return;
    }
    if (file.size > 2000 * 1024 * 1024) {
        showToast(currentLang === 'tr' ? 'Dosya 2000 MiB sınırını aşıyor.' : 'File exceeds the 2000 MiB limit.', 'var(--danger)');
        return;
    }
    const target = selectedDevice;
    uploadQueue.push({ file, target });
    drainUploads();
}
function drainUploads() {
    while (activeUploads < 2 && uploadQueue.length) {
        const job = uploadQueue.shift();
        activeUploads++;
        performUpload(job.file, job.target).finally(() => { activeUploads--; drainUploads(); });
    }
}
async function performUpload(file, target) {
    const isApk = file.name.toLowerCase().endsWith('.apk');
    showToast(isApk ? `${i18n[currentLang].toast_uploading} ${file.name}...` : `${i18n[currentLang].toast_transferring} ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('requestId', crypto.randomUUID());
    formData.append('deviceId', target);

    try {
        const data = await requestJson('/api/upload', {
            method: 'POST',
            body: formData,
            timeout: 15 * 60 * 1000
        });
        if (data.success) {
            const saved = data.transfer?.status === 'saved';
            if (!['transferred', 'error'].includes(data.transfer?.status)) {
                showToast(saved ? (currentLang === 'tr' ? 'Dosya PC’ye kaydedildi. Telefona gönderilmedi.' : 'Saved on PC. Not sent to a phone.') : (currentLang === 'tr' ? 'Aktarım kuyruğa alındı…' : 'Transfer queued…'), 'var(--warning)');
            }
            if (data.transfer && !currentTransfers.some(t => t.id === data.transfer.id)) {
                currentTransfers.unshift(data.transfer);
                renderTransfers();
            }
        } else {
            showToast(data.error || i18n[currentLang].toast_transfer_error, 'var(--danger)');
        }
    } catch (e) {
        showToast(e.message, 'var(--danger)');
    }
}



window.addEventListener('beforeunload', () => {
    pageClosing = true;
    clearTimeout(wsReconnectTimer);
    for (const capture of capturedScreenshots) URL.revokeObjectURL(capture.dataUrl);
    if (isWebStreaming) stopWebScreenStream();
    ws?.close();
});

// Initial language setup & connect
setLanguage(currentLang);
connectWs();
renderCapturesList();
renderTransfers();
loadMobileTransferQr();

