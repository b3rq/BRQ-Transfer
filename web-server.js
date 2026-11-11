const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const QRCode = require('qrcode');

// Signaling only. Never import the desktop server or accept file payloads here.
function createWebServer({ publicUrl = process.env.BRQ_WEB_URL || '' } = {}) {
    const app = express();
    const server = http.createServer(app);
    const rooms = new Map();
    const sameOrigin = req => !req.headers.origin || req.headers.origin === `http://${req.headers.host}` ||
        req.headers.origin === `https://${req.headers.host}`;
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        res.set({ 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
        if (!sameOrigin(req)) return res.sendStatus(403);
        next();
    });
    app.use(express.json({ limit: '2kb' }));
    app.get('/health', (_, res) => res.json({ app: 'brq-transfer-web', ready: true }));
    app.get('/api/info', (req, res) => {
        const port = server.address().port;
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
        const addresses = local && !publicUrl ? Object.values(os.networkInterfaces()).flat()
            .filter(item => item.family === 'IPv4' && !item.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))
            .map(item => `http://${item.address}:${port}`) : [];
        res.json({ publicUrl, addresses });
    });
    let qrInFlight = 0;
    app.post('/api/qr', async (req, res) => {
        let url;
        try { url = new URL(req.body.url); } catch { return res.sendStatus(400); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
            url.href.length > 1024 || !/^#pair=[a-f0-9]{64}$/.test(url.hash)) return res.sendStatus(400);
        if (qrInFlight >= 4) return res.sendStatus(429);
        qrInFlight++;
        try { res.type('svg').send(await QRCode.toString(url.href, { type: 'svg', margin: 2, width: 220 })); }
        catch { res.sendStatus(500); }
        finally { qrInFlight--; }
    });
    for (const [route, file] of Object.entries({ '/': 'web/index.html', '/app.js': 'web/app.js',
        '/protocol.js': 'web/protocol.js', '/web.css': 'web/web.css', '/app.css': 'public/app.css', '/icon.png': 'public/icon.png' })) {
        app.get(route, (_, res) => res.sendFile(path.join(__dirname, file)));
    }
    app.use((error, req, res, next) => res.sendStatus(error.status || 500));
    const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024, perMessageDeflate: false });
    server.on('upgrade', (req, socket, head) => {
        if (req.url !== '/signal' || !req.headers.origin || !sameOrigin(req) || wss.clients.size >= 1000) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
        }
        wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
    });
    const send = (ws, message) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)); };
    const fail = (ws, code, close = false) => { send(ws, { type: 'error', code }); if (close) ws.close(1008, code); };
    const other = ws => rooms.get(ws.room)?.[ws.role === 'host' ? 'guest' : 'host'];
    wss.on('connection', ws => {
        ws.alive = true; ws.count = 0; ws.window = Date.now();
        const deadline = setTimeout(() => { if (!ws.room) ws.close(1008, 'HELLO_REQUIRED'); }, 10000);
        ws.on('pong', () => { ws.alive = true; });
        ws.on('error', () => {});
        ws.on('message', (data, binary) => {
            if (Date.now() - ws.window > 10000) { ws.window = Date.now(); ws.count = 0; }
            if (++ws.count > 150) return fail(ws, 'RATE_LIMIT', true);
            let message;
            try { if (binary) throw new Error(); message = JSON.parse(data.toString()); }
            catch { return fail(ws, 'INVALID_MESSAGE', true); }
            if (!message || typeof message !== 'object') return fail(ws, 'INVALID_MESSAGE', true);
            if (message.type === 'hello' && !ws.room) {
                const { room, role, id, name } = message;
                if (typeof room !== 'string' || !/^[a-f0-9]{64}$/.test(room) ||
                    !['host', 'guest'].includes(role) || typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id) ||
                    typeof name !== 'string' || !name.trim() || name.length > 60) return fail(ws, 'INVALID_HELLO', true);
                const entry = rooms.get(room) || {};
                if (entry[role] || Object.values(entry).some(peer => peer.id === id)) return fail(ws, 'ROOM_BUSY', true);
                Object.assign(ws, { room, role, id, name: name.trim(), approved: false });
                entry[role] = ws; rooms.set(room, entry); clearTimeout(deadline);
                send(ws, { type: 'waiting' });
                const peer = other(ws);
                if (peer) {
                    send(ws, { type: 'peer', id: peer.id, name: peer.name });
                    send(peer, { type: 'peer', id, name: ws.name });
                }
                return;
            }
            const peer = other(ws);
            if (!peer) return fail(ws, 'NO_PEER');
            if (message.type === 'approve' && message.id === peer.id) {
                ws.approved = true;
                if (peer.approved && !ws.started) {
                    ws.started = peer.started = true;
                    send(ws, { type: 'ready', offerer: ws.role === 'host' });
                    send(peer, { type: 'ready', offerer: peer.role === 'host' });
                }
            } else if (message.type === 'reject') {
                fail(peer, 'REJECTED', true);
            } else if (message.type === 'signal') {
                if (!ws.started || !peer.started) return fail(ws, 'NOT_APPROVED');
                if (!message.data || typeof message.data !== 'object') return fail(ws, 'INVALID_MESSAGE');
                send(peer, { type: 'signal', data: message.data });
            } else fail(ws, 'INVALID_MESSAGE');
        });
        ws.on('close', () => {
            clearTimeout(deadline);
            const entry = rooms.get(ws.room);
            if (!entry || entry[ws.role] !== ws) return;
            delete entry[ws.role];
            const peer = other(ws);
            if (peer) { peer.approved = false; peer.started = false; send(peer, { type: 'peer-left' }); }
            else rooms.delete(ws.room);
        });
    });
    const heartbeat = setInterval(() => {
        for (const ws of wss.clients) {
            if (!ws.alive) ws.terminate();
            else { ws.alive = false; ws.ping(); }
        }
    }, 15000);
    heartbeat.unref();
    return { server, async close() {
        clearInterval(heartbeat);
        for (const ws of wss.clients) ws.terminate();
        await new Promise(resolve => wss.close(resolve));
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    } };
}

if (require.main === module) {
    const port = Number(process.env.PORT || 4600);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
    const service = createWebServer();
    service.server.listen(port, '0.0.0.0', () => console.log(`BRQ Web: http://localhost:${port}`));
    process.once('SIGINT', () => service.close());
    process.once('SIGTERM', () => service.close());
}
module.exports = { createWebServer };
