let apks = [];
let ws = null;

const pcStatus = document.getElementById('pc-connection-status');
const latestName = document.getElementById('latest-name');
const latestPkg = document.getElementById('latest-pkg');
const latestMeta = document.getElementById('latest-meta');
const latestDownloadBtn = document.getElementById('latest-download-btn');
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');
const toast = document.getElementById('toast');

function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function renderUI() {
    historyCount.textContent = apks.length;
    if (apks.length > 0) {
        const latest = apks[0];
        latestName.textContent = latest.label || latest.name;
        latestPkg.textContent = `${latest.packageName} • v${latest.versionName || '1.0'} (${latest.versionCode || '1'})`;
        latestMeta.textContent = `${latest.size} • ${new Date(latest.updatedAt).toLocaleTimeString()}`;
        latestDownloadBtn.href = latest.downloadUrl;
        latestDownloadBtn.download = latest.name;
        latestDownloadBtn.style.display = 'flex';

        // Render previous builds
        const previous = apks.slice(1);
        if (previous.length > 0) {
            historyList.innerHTML = previous.map(apk => `
                <div class="apk-item" style="padding: 12px; margin-bottom: 8px;">
                    <div class="apk-info">
                        <span class="apk-title" style="font-size: 13px; font-weight: 700;">🎮 ${apk.label || apk.name}</span>
                        <div class="apk-meta" style="font-size: 11px;">
                            <span>v${apk.versionName || '1.0'}</span>
                            <span>📦 ${apk.size}</span>
                            <span>🕒 ${new Date(apk.updatedAt).toLocaleTimeString()}</span>
                        </div>
                    </div>
                    <a href="${apk.downloadUrl}" class="btn btn-outline btn-sm" download="${apk.name}">
                        İndir
                    </a>
                </div>
            `).join('');
        } else {
            historyList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 8px;">Başka build bulunmuyor.</p>';
        }
    } else {
        latestName.textContent = 'Build Bekleniyor...';
        latestPkg.textContent = '';
        latestMeta.textContent = 'Unity build aldığında otomatik burada gözükecektir.';
        latestDownloadBtn.style.display = 'none';
        historyList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 8px;">Henüz build yok.</p>';
    }
}

function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
        pcStatus.innerHTML = '<span class="pulse-dot"></span> PC ile Bağlantı Kuruldu';
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'INIT') {
            apks = data.apks || [];
            renderUI();
        } else if (data.type === 'NEW_APK') {
            apks.unshift(data.apk);
            renderUI();
            if (navigator.vibrate) {
                try { navigator.vibrate([200, 100, 200]); } catch (e) {}
            }
            showToast(`🔥 Yeni Build: ${data.apk.label || data.apk.name}`);
        }
    };

    ws.onclose = () => {
        pcStatus.innerHTML = '<span style="color: #ef4444;">●</span> Bağlantı Kesildi (Yeniden bağlanılıyor...)';
        setTimeout(connect, 2500);
    };
}

connect();