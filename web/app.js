'use strict';
const $ = id => document.getElementById(id);
const P = TransferProtocol;
const words = {
    tr: {
        skip: 'İçeriğe geç', slogan: 'Kablolar için fazla üşengeç', installFree: 'Kurulumsuz paylaşım', theme: 'Tema',
        title: 'Dosya Transferleri', subtitle: 'Aynı Wi-Fi. İki cihaz. Dosyaların doğrudan karşı tarafta.',
        pairTitle: 'Cihazını bağla', deviceName: 'Bu cihazın adı', save: 'Kaydet', qrHint: 'Telefon kamerasıyla QR kodu okut. İki sayfada da eşleşmeyi onayla.',
        copyLink: 'Eşleşme bağlantısını kopyala', linkHint: 'Bağlantıyı yalnızca eşleştireceğin cihazla paylaş.', network: 'Bağlantı adresi',
        pairConfirm: 'Bu cihazla eşleşmek istiyor musun?', approve: 'Eşleşmeyi onayla', reject: 'Reddet',
        rememberHint: 'İki cihazda da bu site açıkken otomatik yeniden bağlanır.', reconnect: 'Yeniden bağlan', forget: 'Cihazı unut',
        debugHint: 'Hata ayıklama veya uygulama kurulumu gerekmez.', sendTitle: 'Dosya gönder', direct: 'Doğrudan',
        drop: 'Dosyaları buraya bırak', browse: 'veya seçmek için tıkla', connectFirst: 'Dosya göndermek için önce cihazını bağla.',
        history: 'Aktarım geçmişi', clear: 'Temizle', empty: 'Henüz dosya aktarılmadı', emptyHint: 'Cihazını eşleştir; fotoğraf, video, APK veya belgelerini iki yönde paylaş.',
        privacy: 'Dosyaların sunucuda depolanmaz.', keepOpen: 'Aktarım boyunca iki cihazda da sayfayı açık tut.', version: 'BRQ Transfer · Web önizleme',
        forgetConfirm: 'Bu cihazı unutursan yeniden QR ile eşleştirmen gerekir. Devam eden aktarımlar durur.', cancel: 'Vazgeç',
        connecting: 'Bağlanıyor…', waiting: 'Cihaz bekleniyor', checking: 'Diğer cihazın onayı bekleniyor', connected: 'Bağlı', offline: 'Bağlantı kesildi · yeniden deneniyor',
        readyHint: 'Dosya seç veya sürükle. Karşı cihaz kaydetmeyi onaylayacak.', rememberedWaiting: 'Kayıtlı cihaz bekleniyor',
        blocked: 'Bu eşleşme başka bir sekmede açık. Diğer sekmeyi kapatıp yeniden bağlan.', rejected: 'Eşleşme reddedildi. Yeniden QR ile eşleşebilirsin.',
        failure: 'Doğrudan bağlantı kurulamadı. Aynı Wi-Fi ağını, VPN ve ağ yalıtımı ayarlarını kontrol edip yeniden bağlan.',
        copied: 'Eşleşme bağlantısı kopyalandı.', copyFailed: 'Kopyalama izni verilmedi. QR kodunu kullan.',
        unsupported: 'Bu tarayıcı doğrudan dosya paylaşımını desteklemiyor. Güncel bir tarayıcı kullan.',
        storageFailed: 'Tarayıcı kalıcı kayda izin vermedi. Bu oturum çalışır; sayfayı yeniden açınca QR ile eşleşmen gerekir.',
        wrongPeer: 'Kayıtlı cihazdan farklı bir cihaz bağlanmayı denedi. Yeniden eşleştirmek için önce Cihazı unut seçeneğini kullan.',
        incoming: 'Gelen', outgoing: 'Giden', queued: 'Sırada', awaiting: 'Alıcının onayı bekleniyor', sending: 'Gönderiliyor', receiving: 'Alınıyor',
        offered: 'Dosya almak istiyor musun?', delivered: 'Karşı tarayıcıya ulaştı', received: 'Alındı · dosyayı indir', saved: 'Diske kaydedildi',
        cancelled: 'İptal edildi', error: 'Aktarım kesildi · yeniden deneyebilirsin', accept: 'Kabul et ve kaydet', decline: 'Reddet', download: 'Dosyayı indir',
        retry: 'Tekrar gönder', memoryLimit: 'Bu tarayıcıda dosya başına 100 MiB sınırı var. Büyük dosyaları almak için doğrudan diske kayıt destekleyen bir masaüstü tarayıcısı kullan.',
        queueLimit: 'En fazla 20 dosyayı sıraya ekleyebilirsin.', invalidFile: 'Dosyanın adı veya boyutu desteklenmiyor.',
        saveFailed: 'Dosya kaydedilemedi. Disk alanını ve tarayıcı izinlerini kontrol et.', expired: 'İndirme kaldırıldı · gerekirse dosyayı yeniden iste',
        reconnectHint: 'Sayfayı kapatıp tekrar açtığında bu cihaz hatırlanır. Özel gezinmede kayıt silinebilir.',
        timeout: 'Aktarım zaman aşımına uğradı. İki sayfayı açık tutup tekrar gönder.', joining: 'Eşleşme bekleniyor',
        refreshQr: 'QR hazırlanamadı. Yeniden bağlan veya sayfayı yenile.', busy: 'Karşı cihaz başka bir dosya alıyor.',
        pendingSave: 'Kaydetme tamamlanıyor…', fallbackHint: 'Bu tarayıcıda alma sınırı 100 MiB. Son dosyayı yenisini kabul etmeden önce indir.'
    },
    en: {
        skip: 'Skip to content', slogan: 'Too lazy for cables', installFree: 'No installation', theme: 'Theme',
        title: 'File Transfers', subtitle: 'Same Wi-Fi. Two devices. Your files, directly delivered.', pairTitle: 'Connect your device', deviceName: 'This device’s name', save: 'Save',
        qrHint: 'Scan the QR with your phone camera. Approve pairing on both pages.', copyLink: 'Copy pairing link', linkHint: 'Share this link only with the device you want to pair.', network: 'Connection address',
        pairConfirm: 'Pair with this device?', approve: 'Approve pairing', reject: 'Decline', rememberHint: 'Reconnects automatically while this site is open on both devices.', reconnect: 'Reconnect', forget: 'Forget device',
        debugHint: 'No debugging settings or app installation needed.', sendTitle: 'Send files', direct: 'Direct', drop: 'Drop your files here', browse: 'or click to browse', connectFirst: 'Connect your device to send files.',
        history: 'Transfer history', clear: 'Clear', empty: 'No transfers yet', emptyHint: 'Pair your device and share photos, videos, APKs or documents in either direction.',
        privacy: 'Your files are never stored on the server.', keepOpen: 'Keep both pages open throughout the transfer.', version: 'BRQ Transfer · Web preview',
        forgetConfirm: 'Forgetting this device stops active transfers. You will need to pair again using the QR code.', cancel: 'Cancel',
        connecting: 'Connecting…', waiting: 'Waiting for a device', checking: 'Waiting for approval on the other device', connected: 'Connected', offline: 'Disconnected · retrying',
        readyHint: 'Choose or drop a file. The other device will approve saving it.', rememberedWaiting: 'Waiting for remembered device',
        blocked: 'This pairing is open in another tab. Close that tab and reconnect.', rejected: 'Pairing declined. You can pair again using a QR code.',
        failure: 'Could not establish a direct connection. Check the Wi-Fi network, VPN and network isolation, then reconnect.', copied: 'Pairing link copied.', copyFailed: 'Clipboard permission denied. Use the QR code.',
        unsupported: 'This browser does not support direct file sharing. Use an up-to-date browser.', storageFailed: 'Persistent storage is unavailable. This session works; pair again after reopening the page.',
        wrongPeer: 'A different device attempted to connect. Forget the remembered device before pairing a new one.',
        incoming: 'Incoming', outgoing: 'Outgoing', queued: 'Queued', awaiting: 'Waiting for receiver approval', sending: 'Sending', receiving: 'Receiving', offered: 'Accept this file?',
        delivered: 'Delivered to the other browser', received: 'Received · download the file', saved: 'Saved to disk', cancelled: 'Cancelled', error: 'Transfer interrupted · you can retry',
        accept: 'Accept and save', decline: 'Decline', download: 'Download file', retry: 'Send again',
        memoryLimit: 'This browser has a 100 MiB per-file limit. To receive larger files, use a desktop browser that supports saving directly to disk.',
        queueLimit: 'You can queue up to 20 files.', invalidFile: 'The file name or size is not supported.', saveFailed: 'Could not save the file. Check free disk space and browser permissions.',
        expired: 'Download removed · request the file again if needed', reconnectHint: 'This device will be remembered when you reopen the page. Private browsing may erase it.',
        timeout: 'Transfer timed out. Keep both pages open and send again.', joining: 'Waiting for pairing', refreshQr: 'Could not create QR. Reconnect or reload the page.', busy: 'The other device is already receiving a file.',
        pendingSave: 'Finishing save…', fallbackHint: 'Receiving limit in this browser: 100 MiB. Download the last file before accepting another.'
    }
};
function readStorage(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeStorage(key, value) { try { localStorage.setItem(key, value); } catch { notice('storageFailed'); } }
const randomHex = bytes => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, '0')).join('');
let language = readStorage('brq.web.language') === 'en' ? 'en' : 'tr';
const t = key => words[language][key] || key;
let deviceId = readStorage('brq.web.id');
if (!/^[a-f0-9]{32}$/.test(deviceId)) { deviceId = randomHex(16); writeStorage('brq.web.id', deviceId); }
let deviceName = (readStorage('brq.web.name') || (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'Telefon' : 'Bilgisayar')).slice(0, 60);
let saved;
try { saved = JSON.parse(readStorage('brq.web.pair')); } catch { /* Corrupt browser storage requires fresh pairing. */ }
const invitation = /^#pair=([a-f0-9]{64})$/.exec(location.hash)?.[1];
history.replaceState(null, '', location.pathname + location.search);
let pair = P.validPair(saved) ? saved : { room: randomHex(32), role: 'host' };
// An invitation must never silently replace an already remembered device.
if (invitation && !P.validPair(saved)) pair = { room: invitation, role: 'guest' };
let socket = null, rtc = null, channel = null, peer = null;
let retryTimer, connectTimer, retryDelay = 1000, stopped = false, approved = false;
let signalChain = Promise.resolve(), candidates = [], receiveChain = Promise.resolve();
let invitationBase = location.origin, qrObjectUrl, invitationVersion = 0;
let statusKey = 'connecting', incoming = null, outgoing = null, queue = [], records = [], retainedDownload = null;
const activeStates = new Set(['queued', 'awaiting', 'sending', 'receiving', 'offered', 'pendingSave']);

function notice(key) { $('notice').textContent = t(key); $('notice').hidden = false; }
function setStatus(key) { statusKey = key; $('connection-status').textContent = t(key); $('connection-pill').classList.toggle('connected', key === 'connected'); }
function applyLanguage() {
    document.documentElement.lang = language;
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
    $('language').textContent = language === 'tr' ? 'EN' : 'TR';
    setStatus(statusKey); updateConnectionUI();
    for (const record of records) renderRecord(record);
}
function updateConnectionUI() {
    const connected = channel?.readyState === 'open';
    $('dropzone').disabled = !connected;
    $('send-hint').textContent = t(connected ? 'readyHint' : 'connectFirst');
    $('storage-hint').hidden = typeof window.showSaveFilePicker === 'function';
    $('remembered').hidden = !pair.peerId;
    $('peer-name').textContent = pair.peerName || '';
    $('invitation').hidden = !!pair.peerId || pair.role === 'guest' || !!peer;
}
function sendSignal(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
function rememberPeer() {
    if (!peer) return;
    pair.peerId = peer.id; pair.peerName = peer.name;
    writeStorage('brq.web.pair', JSON.stringify(pair));
    updateConnectionUI();
}
function approvePeer() {
    if (!peer) return;
    approved = true; $('pair-request').hidden = true;
    setStatus('checking'); sendSignal({ type: 'approve', id: peer.id });
}
function connect() {
    clearTimeout(retryTimer);
    if (stopped || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
    setStatus('connecting');
    const current = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/signal`);
    socket = current;
    current.onopen = () => {
        if (current !== socket) return;
        retryDelay = 1000;
        sendSignal({ type: 'hello', room: pair.room, role: pair.role, id: deviceId, name: deviceName });
    };
    current.onmessage = event => {
        if (current !== socket) return;
        const message = JSON.parse(event.data);
        if (message.type === 'waiting') setStatus(pair.peerId ? 'rememberedWaiting' : 'waiting');
        if (message.type === 'peer') {
            peer = { id: message.id, name: message.name }; approved = false;
            if (pair.peerId && pair.peerId !== peer.id) { notice('wrongPeer'); sendSignal({ type: 'reject' }); return; }
            if (pair.peerId === peer.id) approvePeer();
            else { $('request-name').textContent = peer.name; $('pair-request').hidden = false; setStatus('joining'); }
            updateConnectionUI();
        }
        if (message.type === 'ready' && approved) {
            signalChain = Promise.resolve();
            signalChain = signalChain.then(() => startRTC(message.offerer)).catch(connectionFailed);
        }
        if (message.type === 'signal') signalChain = signalChain.then(() => receiveSignal(message.data)).catch(connectionFailed);
        if (message.type === 'peer-left') {
            closeRTC(); peer = null; approved = false; $('pair-request').hidden = true;
            setStatus(pair.peerId ? 'rememberedWaiting' : 'waiting'); updateConnectionUI();
        }
        if (message.type === 'error') {
            if (['ROOM_BUSY', 'REJECTED', 'INVALID_HELLO', 'RATE_LIMIT'].includes(message.code)) {
                stopped = true; notice(message.code === 'ROOM_BUSY' ? 'blocked' : 'rejected');
            }
        }
    };
    current.onclose = () => {
        if (current !== socket) return;
        socket = null; peer = null; approved = false; closeRTC(); $('pair-request').hidden = true;
        setStatus('offline'); updateConnectionUI();
        if (!stopped) { retryTimer = setTimeout(connect, retryDelay); retryDelay = Math.min(retryDelay * 2, 15000); }
    };
    current.onerror = () => {}; // onclose owns retry and user-visible state.
}
function reconnect() {
    stopped = false; clearTimeout(retryTimer); $('notice').hidden = true;
    const previous = socket; socket = null; previous?.close();
    closeRTC(); peer = null; approved = false; $('pair-request').hidden = true;
    // Let the service release the previous room slot before claiming it again.
    retryTimer = setTimeout(connect, 350);
}
async function startRTC(offerer) {
    closeRTC(); candidates = [];
    const connection = new RTCPeerConnection({ iceServers: [] });
    rtc = connection;
    connection.onicecandidate = event => { if (event.candidate && rtc === connection) sendSignal({ type: 'signal', data: { candidate: event.candidate.toJSON() } }); };
    connection.onconnectionstatechange = () => {
        if (rtc !== connection) return;
        if (['failed', 'disconnected'].includes(connection.connectionState)) connectionFailed();
    };
    connection.ondatachannel = event => attachChannel(event.channel, connection);
    connectTimer = setTimeout(() => { if (rtc === connection && channel?.readyState !== 'open') connectionFailed(); }, 20000);
    if (offerer) {
        attachChannel(connection.createDataChannel('files', { ordered: true }), connection);
        await connection.setLocalDescription(await connection.createOffer());
        if (rtc === connection) sendSignal({ type: 'signal', data: { description: connection.localDescription.toJSON() } });
    }
}
async function receiveSignal(data) {
    const connection = rtc;
    if (!connection) return;
    if (data.description) {
        await connection.setRemoteDescription(data.description);
        for (const candidate of candidates.splice(0)) await connection.addIceCandidate(candidate);
        if (data.description.type === 'offer') {
            await connection.setLocalDescription(await connection.createAnswer());
            if (rtc === connection) sendSignal({ type: 'signal', data: { description: connection.localDescription.toJSON() } });
        }
    } else if (data.candidate) {
        if (connection.remoteDescription) await connection.addIceCandidate(data.candidate);
        else if (candidates.length < 100) candidates.push(data.candidate);
    }
}
function attachChannel(dataChannel, connection) {
    if (rtc !== connection || (channel && channel !== dataChannel)) { dataChannel.close(); return; }
    channel = dataChannel; channel.binaryType = 'arraybuffer'; channel.bufferedAmountLowThreshold = 128 * 1024;
    receiveChain = Promise.resolve();
    let pendingBytes = 0, pendingMessages = 0;
    channel.onopen = () => { if (channel !== dataChannel) return; clearTimeout(connectTimer); rememberPeer(); setStatus('connected'); $('notice').hidden = true; updateConnectionUI(); processQueue(); };
    channel.onmessage = event => {
        if (channel !== dataChannel) return;
        const bytes = typeof event.data === 'string' ? event.data.length * 2 : event.data.byteLength;
        if (!Number.isFinite(bytes) || bytes > 65536 || pendingBytes + bytes > 1024 * 1024 || pendingMessages >= 128) {
            connectionFailed(); return;
        }
        pendingBytes += bytes; pendingMessages++;
        receiveChain = receiveChain.then(() => { if (channel === dataChannel) return handleData(event.data); }).catch(() => {
            if (channel === dataChannel) { notice('saveFailed'); connectionFailed(); }
        }).finally(() => { pendingBytes -= bytes; pendingMessages--; });
    };
    channel.onclose = () => { if (channel === dataChannel) connectionFailed(); };
    channel.onerror = () => { if (channel === dataChannel) connectionFailed(); };
}
function connectionFailed() {
    closeRTC(); setStatus('offline'); notice('failure'); updateConnectionUI();
    if (!stopped) { clearTimeout(retryTimer); retryTimer = setTimeout(reconnect, 4000); }
}
function closeRTC() {
    clearTimeout(connectTimer);
    const oldChannel = channel, oldRTC = rtc; channel = null; rtc = null;
    oldChannel?.close(); oldRTC?.close();
    if (incoming) disposeIncoming('error');
    if (outgoing) { setRecord(outgoing, 'error'); outgoing = null; }
    for (const record of queue) setRecord(record, 'error'); queue = [];
}
function control(message) { if (channel?.readyState === 'open') channel.send(JSON.stringify(message)); }
function prettySize(size) { if (size < 1024) return `${size} B`; if (size < 1048576) return `${(size / 1024).toFixed(1)} KiB`; return `${(size / 1048576).toFixed(1)} MiB`; }
function makeRecord(id, name, size, direction, status) {
    const record = { id, name, size, direction, status, received: 0, sent: 0, acked: 0, last: Date.now(), rendered: 0 };
    record.element = document.createElement('article'); record.element.className = 'web-transfer';
    const nameElement = document.createElement('strong'); nameElement.textContent = name;
    record.meta = document.createElement('div'); record.meta.className = 'web-transfer-meta';
    record.label = document.createElement('div'); record.label.className = 'web-transfer-status'; record.label.setAttribute('role', 'status');
    record.progress = document.createElement('progress'); record.progress.max = Math.max(1, size); record.progress.value = 0; record.progress.setAttribute('aria-label', name);
    record.actions = document.createElement('div'); record.actions.className = 'web-button-row';
    record.element.append(nameElement, record.meta, record.label, record.progress, record.actions);
    $('transfer-list').append(record.element); records.push(record); $('empty').hidden = true;
    while (records.length > 100) { const oldest = records.find(item => !activeStates.has(item.status)); if (!oldest) break; removeRecord(oldest); }
    renderRecord(record); return record;
}
function action(record, key, handler, dataAction = key) {
    const button = document.createElement('button'); button.className = 'btn btn-secondary'; button.textContent = t(key); button.dataset.action = dataAction;
    button.onclick = handler; record.actions.append(button);
}
function renderRecord(record) {
    record.element.dataset.status = record.status; record.element.dataset.direction = record.direction;
    record.meta.textContent = `${t(record.direction === 'in' ? 'incoming' : 'outgoing')} · ${prettySize(record.size)}`;
    record.label.textContent = t(record.status);
    const count = record.direction === 'in' ? record.received : record.acked;
    record.progress.value = count;
    if (['sending', 'receiving', 'pendingSave'].includes(record.status)) record.label.textContent += ` · ${Math.floor(count / Math.max(1, record.size) * 100)}%`;
    record.actions.replaceChildren();
    if (record.status === 'offered') { action(record, 'accept', () => acceptIncoming(record)); action(record, 'decline', () => cancelRecord(record), 'decline'); }
    else if (activeStates.has(record.status) && !record.committing && !(record.direction === 'out' && record.status === 'pendingSave')) action(record, 'cancel', () => cancelRecord(record));
    if (record.url) {
        const link = document.createElement('a'); link.href = record.url; link.download = record.name; link.textContent = t('download'); link.className = 'btn btn-secondary'; record.actions.append(link);
    }
    if (record.file && ['error', 'cancelled'].includes(record.status)) action(record, 'retry', () => enqueueFiles([record.file]));
}
function setRecord(record, status) { record.status = status; record.last = Date.now(); renderRecord(record); }
function progressRecord(record) { record.last = Date.now(); if (record.last - record.rendered > 150) { record.rendered = record.last; renderRecord(record); } }
function releaseDownload() {
    if (!retainedDownload) return;
    URL.revokeObjectURL(retainedDownload.url); retainedDownload.url = null;
    setRecord(retainedDownload, 'expired'); retainedDownload = null;
}
function removeRecord(record) {
    if (record === retainedDownload) releaseDownload();
    record.file = null; record.element.remove(); records = records.filter(item => item !== record);
}
function enqueueFiles(files) {
    if (channel?.readyState !== 'open') return notice('connectFirst');
    for (const file of files) {
        if (queue.length + (outgoing ? 1 : 0) >= 20) { notice('queueLimit'); break; }
        const offer = { type: 'offer', id: randomHex(16), name: file.name, size: file.size };
        if (!P.validOffer(offer)) { notice('invalidFile'); continue; }
        const record = makeRecord(offer.id, file.name, file.size, 'out', 'queued'); record.file = file; queue.push(record);
    }
    processQueue();
}
function processQueue() {
    if (outgoing || !queue.length || channel?.readyState !== 'open') return;
    outgoing = queue.shift(); setRecord(outgoing, 'awaiting');
    control({ type: 'offer', id: outgoing.id, name: outgoing.name, size: outgoing.size });
}
async function pumpFile(record) {
    try {
        while (outgoing === record && record.sent < record.size && channel?.readyState === 'open') {
            // Bound both browser send buffers and bytes waiting for the receiver's disk writer.
            if (record.sent - record.acked >= 256 * 1024 || channel.bufferedAmount > 512 * 1024) { await new Promise(resolve => setTimeout(resolve, 12)); continue; }
            const bytes = await record.file.slice(record.sent, record.sent + P.ChunkSize).arrayBuffer();
            if (outgoing !== record || channel?.readyState !== 'open') return;
            channel.send(bytes); record.sent += bytes.byteLength;
        }
        if (outgoing === record && channel?.readyState === 'open') { control({ type: 'end', id: record.id }); setRecord(record, 'pendingSave'); }
    } catch { if (outgoing === record) { control({ type: 'cancel', id: record.id }); setRecord(record, 'error'); outgoing = null; processQueue(); } }
}
async function acceptIncoming(record) {
    if (incoming !== record || record.status !== 'offered') return;
    setRecord(record, 'pendingSave');
    try {
        if (typeof window.showSaveFilePicker === 'function') {
            const handle = await window.showSaveFilePicker({ suggestedName: record.name });
            const writer = await handle.createWritable();
            if (incoming !== record) { await writer.abort(); return; }
            record.writer = writer;
        } else {
            if (record.size > P.MemoryLimit) { notice('memoryLimit'); cancelRecord(record); return; }
            releaseDownload(); record.chunks = [];
        }
        if (incoming !== record) return;
        record.accepted = true; setRecord(record, 'receiving'); control({ type: 'accept', id: record.id });
    } catch (error) { if (incoming === record) { if (error.name !== 'AbortError') notice('saveFailed'); cancelRecord(record); } }
}
function disposeIncoming(status) {
    if (!incoming) return;
    const record = incoming; incoming = null; record.accepted = false;
    // Closing a disk stream has already begun committing it; report the actual close result.
    if (record.committing) return;
    if (record.writer) { record.writer.abort().catch(() => {}); record.writer = null; }
    record.chunks = null; setRecord(record, status);
}
function cancelRecord(record) {
    if (record.committing) return;
    control({ type: 'cancel', id: record.id });
    if (incoming === record) disposeIncoming('cancelled');
    else { queue = queue.filter(item => item !== record); if (outgoing === record) outgoing = null; setRecord(record, 'cancelled'); processQueue(); }
}
async function handleData(data) {
    if (data instanceof ArrayBuffer) {
        if (!incoming?.accepted) return; // Already queued bytes may arrive after a local cancellation.
        const record = incoming; P.acceptChunk(record, data.byteLength);
        if (record.writer) await record.writer.write(data); else record.chunks.push(data);
        if (incoming !== record) return;
        progressRecord(record); control({ type: 'ack', id: record.id, bytes: record.received }); return;
    }
    if (typeof data !== 'string' || data.length > 2048) throw new Error('Invalid control');
    const message = JSON.parse(data);
    if (!message || typeof message !== 'object') throw new Error('Invalid control');
    if (message.type === 'offer') {
        if (!P.validOffer(message)) throw new Error('Invalid offer');
        if (incoming) { control({ type: 'cancel', id: message.id, reason: 'busy' }); return; }
        incoming = makeRecord(message.id, message.name, message.size, 'in', 'offered');
        if (typeof window.showSaveFilePicker !== 'function' && message.size > P.MemoryLimit) { notice('memoryLimit'); control({ type: 'cancel', id: message.id, reason: 'memoryLimit' }); disposeIncoming('cancelled'); }
        return;
    }
    const record = outgoing?.id === message.id ? outgoing : null;
    if (message.type === 'accept' && record?.status === 'awaiting') { setRecord(record, 'sending'); void pumpFile(record); }
    else if (message.type === 'ack' && record) {
        if (!Number.isSafeInteger(message.bytes) || message.bytes < record.acked || message.bytes > record.sent) throw new Error('Invalid acknowledgment');
        record.acked = message.bytes; progressRecord(record);
    } else if (message.type === 'complete' && record) {
        if (record.sent !== record.size || record.acked !== record.size || record.status !== 'pendingSave') throw new Error('Premature completion');
        setRecord(record, 'delivered'); record.file = null; outgoing = null; processQueue();
    } else if (message.type === 'end' && incoming?.id === message.id) {
        const receiving = incoming;
        const transferChannel = channel;
        if (!receiving.accepted || receiving.received !== receiving.size) throw new Error('Incomplete file');
        receiving.committing = true;
        setRecord(receiving, 'pendingSave');
        if (receiving.writer) {
            try { await receiving.writer.close(); }
            catch {
                receiving.writer = null; receiving.committing = false;
                if (incoming === receiving) incoming = null;
                setRecord(receiving, 'error');
                if (channel === transferChannel) { control({ type: 'cancel', id: receiving.id }); notice('saveFailed'); }
                return;
            }
            receiving.writer = null;
            setRecord(receiving, 'saved');
        } else {
            const blob = new Blob(receiving.chunks, { type: 'application/octet-stream' }); receiving.chunks = null;
            receiving.url = URL.createObjectURL(blob); retainedDownload = receiving; setRecord(receiving, 'received');
        }
        receiving.committing = false;
        if (incoming === receiving) incoming = null;
        if (channel === transferChannel) control({ type: 'complete', id: receiving.id });
    } else if (message.type === 'cancel') {
        if (incoming?.id === message.id) disposeIncoming('cancelled');
        if (record) { setRecord(record, 'cancelled'); outgoing = null; if (['busy', 'memoryLimit'].includes(message.reason)) notice(message.reason); processQueue(); }
    }
}
async function updateQR() {
    if (pair.peerId || pair.role !== 'host') return;
    const version = ++invitationVersion;
    try {
        const response = await fetch('/api/qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: `${invitationBase}/#pair=${pair.room}` }) });
        if (!response.ok) throw new Error();
        const blob = await response.blob(); if (version !== invitationVersion) return;
        if (qrObjectUrl) URL.revokeObjectURL(qrObjectUrl);
        qrObjectUrl = URL.createObjectURL(blob); $('qr').src = qrObjectUrl;
    } catch { notice('refreshQr'); }
}
async function initializeInvitation() {
    try {
        const response = await fetch('/api/info'); const info = await response.json();
        const addresses = info.publicUrl ? [info.publicUrl.replace(/\/$/, '')] : info.addresses;
        if (addresses?.length) {
            invitationBase = addresses[0];
            for (const address of addresses) { const option = document.createElement('option'); option.value = address; option.textContent = address; $('network').append(option); }
            $('network').hidden = $('network-label').hidden = addresses.length < 2;
        }
    } catch { /* Same-origin invitation remains usable if optional LAN information is unavailable. */ }
    await updateQR();
}
$('approve').onclick = approvePeer;
$('reject').onclick = () => { sendSignal({ type: 'reject' }); $('pair-request').hidden = true; };
$('reconnect').onclick = reconnect;
$('device-name').value = deviceName;
$('save-name').onclick = () => { deviceName = $('device-name').value.trim().slice(0, 60) || deviceName; $('device-name').value = deviceName; writeStorage('brq.web.name', deviceName); reconnect(); };
$('theme').onclick = () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; writeStorage('brq.web.theme', theme); };
$('language').onclick = () => { language = language === 'tr' ? 'en' : 'tr'; writeStorage('brq.web.language', language); applyLanguage(); };
$('copy-link').onclick = async () => { try { await navigator.clipboard.writeText(`${invitationBase}/#pair=${pair.room}`); notice('copied'); } catch { notice('copyFailed'); } };
$('network').onchange = () => { invitationBase = $('network').value; void updateQR(); };
$('dropzone').onclick = () => $('file-input').click();
$('file-input').onchange = () => { enqueueFiles($('file-input').files); $('file-input').value = ''; };
for (const event of ['dragenter', 'dragover']) $('dropzone').addEventListener(event, e => { e.preventDefault(); $('dropzone').classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) $('dropzone').addEventListener(event, e => { e.preventDefault(); $('dropzone').classList.remove('dragging'); });
$('dropzone').addEventListener('drop', event => enqueueFiles(event.dataTransfer.files));
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
$('clear').onclick = () => { for (const record of [...records]) if (!activeStates.has(record.status)) removeRecord(record); $('empty').hidden = records.length !== 0; };
$('forget').onclick = () => $('forget-dialog').showModal();
$('forget-cancel').onclick = () => $('forget-dialog').close();
$('forget-confirm').onclick = () => {
    $('forget-dialog').close(); pair = { room: randomHex(32), role: 'host' };
    writeStorage('brq.web.pair', 'null'); reconnect(); updateConnectionUI(); void updateQR();
};
window.addEventListener('online', () => { if (!stopped && channel?.readyState !== 'open') reconnect(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !stopped && !socket) connect(); });
window.addEventListener('pagehide', () => { stopped = true; clearTimeout(retryTimer); socket?.close(); closeRTC(); });
window.addEventListener('pageshow', event => { if (event.persisted) { stopped = false; reconnect(); } });
setInterval(() => {
    const now = Date.now();
    for (const record of [incoming, outgoing]) {
        if (record && !record.committing && now - record.last > (['offered', 'awaiting'].includes(record.status) ? 300000 : 90000)) { notice('timeout'); cancelRecord(record); }
    }
}, 5000);
document.documentElement.dataset.theme = readStorage('brq.web.theme') === 'light' ? 'light' : 'dark';
applyLanguage();
if (!window.RTCPeerConnection) { stopped = true; notice('unsupported'); }
else { connect(); void initializeInvitation(); }
if (invitation && P.validPair(saved) && invitation !== saved.room) notice('wrongPeer');
