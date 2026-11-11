const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { createWebServer } = require('../web-server');

async function setup(t) {
    const service = createWebServer();
    await new Promise(resolve => service.server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${service.server.address().port}`;
    t.after(() => service.close());
    async function client(room, role, id, origin = base) {
        const socket = new WebSocket(base.replace('http:', 'ws:') + '/signal', { origin });
        const queue = [];
        socket.on('message', data => queue.push(JSON.parse(data)));
        await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
        socket.send(JSON.stringify({ type: 'hello', room, role, id, name: role }));
        return { socket, queue, send: data => socket.send(JSON.stringify(data)), async next(type) {
            const deadline = Date.now() + 2000;
            while (Date.now() < deadline) {
                const index = queue.findIndex(message => message.type === type);
                if (index >= 0) return queue.splice(index, 1)[0];
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            throw new Error('Missing message: ' + type + ' received ' + JSON.stringify(queue));
        } };
    }
    return { service, base, client };
}
const room = 'a'.repeat(64), hostId = '1'.repeat(32), guestId = '2'.repeat(32);

test('web service exposes only its UI and has no desktop admin or file upload routes', async t => {
    const { base } = await setup(t);
    for (const route of ['/', '/app.css', '/icon.png', '/app.js', '/protocol.js']) {
        assert.equal((await fetch(base + route)).status, 200, route);
    }
    for (const route of ['/api/adb/devices', '/config.json', '/server.js', '/UnityCompanion.apk']) {
        assert.equal((await fetch(base + route)).status, 404, route);
    }
    assert.equal((await fetch(base + '/api/upload', { method: 'POST', body: 'file' })).status, 404);
});

test('signals are blocked until both peers explicitly approve, then only reach the same room', async t => {
    const { client } = await setup(t);
    const a = await client(room, 'host', hostId);
    const b = await client(room, 'guest', guestId);
    const other = await client('b'.repeat(64), 'guest', '3'.repeat(32));
    assert.equal((await a.next('peer')).id, guestId);
    a.send({ type: 'signal', data: { sdp: 'early' } });
    assert.equal((await a.next('error')).code, 'NOT_APPROVED');
    a.send({ type: 'approve', id: guestId });
    b.send({ type: 'approve', id: hostId });
    assert.equal((await a.next('ready')).offerer, true);
    assert.equal((await b.next('ready')).offerer, false);
    a.send({ type: 'signal', data: { description: { type: 'offer', sdp: 'fixture' } } });
    assert.equal((await b.next('signal')).data.description.sdp, 'fixture');
    assert.equal(other.queue.some(message => message.type === 'signal'), false);
});

test('third peer and duplicate role cannot replace an existing connection', async t => {
    const { client } = await setup(t);
    await client(room, 'host', hostId);
    await client(room, 'guest', guestId);
    const third = await client(room, 'guest', '3'.repeat(32));
    assert.equal((await third.next('error')).code, 'ROOM_BUSY');
});

test('disconnect clears approval and a returning peer needs a new handshake', async t => {
    const { client } = await setup(t);
    const a = await client(room, 'host', hostId);
    const b = await client(room, 'guest', guestId);
    a.send({ type: 'approve', id: guestId }); b.send({ type: 'approve', id: hostId });
    await a.next('ready');
    b.socket.close(); await a.next('peer-left');
    const returning = await client(room, 'guest', guestId);
    returning.send({ type: 'signal', data: {} });
    assert.equal((await returning.next('error')).code, 'NOT_APPROVED');
});

test('rejecting a peer disconnects it and does not authorize signaling', async t => {
    const { client } = await setup(t);
    const a = await client(room, 'host', hostId);
    const b = await client(room, 'guest', guestId);
    await a.next('peer');
    a.send({ type: 'reject' });
    assert.equal((await b.next('error')).code, 'REJECTED');
    await a.next('peer-left');
});

test('foreign-origin websocket and QR requests are rejected', async t => {
    const { base } = await setup(t);
    const status = await new Promise(resolve => {
        const socket = new WebSocket(base.replace('http:', 'ws:') + '/signal', { origin: 'https://evil.example' });
        socket.on('unexpected-response', (_, response) => { response.resume(); socket.terminate(); resolve(response.statusCode); });
        socket.on('error', () => {});
    });
    assert.equal(status, 403);
    assert.equal((await fetch(base + '/api/qr', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' })).status, 403);
});

test('invalid room credentials and binary signaling are rejected', async t => {
    const { client } = await setup(t);
    const invalid = await client('1234', 'host', hostId);
    assert.equal((await invalid.next('error')).code, 'INVALID_HELLO');
    const valid = await client(room, 'host', hostId);
    valid.socket.send(Buffer.from('not a signaling message'));
    assert.equal((await valid.next('error')).code, 'INVALID_MESSAGE');
});
