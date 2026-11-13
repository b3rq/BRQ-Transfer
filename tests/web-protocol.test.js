const test = require('node:test');
const assert = require('node:assert/strict');
const protocol = require('../web/protocol');

test('file offers validate sizes, names and identifiers before allocation', () => {
    const valid = { type: 'offer', id: 'a'.repeat(32), name: 'tatil 📷.zip', size: 0 };
    assert.equal(protocol.validOffer(valid), true);
    for (const override of [{ size: -1 }, { size: 1.5 }, { size: Infinity }, { size: Number.MAX_SAFE_INTEGER + 1 },
        { id: '../file' }, { name: '' }, { name: 'x'.repeat(256) }, { name: '../secret' }, { name: 'a\u0000b' }]) {
        assert.equal(protocol.validOffer({ ...valid, ...override }), false, JSON.stringify(override));
    }
});

test('receiver refuses unaccepted, oversized and excess binary chunks', () => {
    assert.throws(() => protocol.acceptChunk(null, 3));
    const state = { size: 5, received: 0, accepted: false };
    assert.throws(() => protocol.acceptChunk(state, 3));
    state.accepted = true;
    protocol.acceptChunk(state, 3); assert.equal(state.received, 3);
    assert.throws(() => protocol.acceptChunk(state, 3));
    assert.equal(state.received, 3);
    protocol.acceptChunk(state, 2); assert.equal(state.received, 5);
    assert.throws(() => protocol.acceptChunk({ size: 100000, received: 0, accepted: true }, 65537));
});

test('stored pairs are rejected when damaged or incompatible', () => {
    const pair = { room: 'a'.repeat(64), role: 'host', peerId: 'b'.repeat(32), peerName: 'Phone' };
    assert.equal(protocol.validPair(pair), true);
    assert.equal(protocol.validPair({ ...pair, role: 'admin' }), false);
    assert.equal(protocol.validPair({ ...pair, room: '123' }), false);
    assert.equal(protocol.validPair(null), false);
});

test('window negotiation stays compatible with peers that predate it', () => {
    assert.equal(protocol.negotiatedWindow(undefined), protocol.LegacyWindow);
    assert.equal(protocol.negotiatedWindow(64 * 1024 * 1024), protocol.LegacyWindow);
    assert.equal(protocol.negotiatedWindow(1024 * 1024), 1024 * 1024);
    assert.equal(protocol.negotiatedWindow(16 * 1024 * 1024), protocol.WindowBytes);
    // A legacy sender (no window) must still get an ack for every chunk.
    assert.equal(protocol.ackInterval(undefined), 0);
    assert.equal(protocol.ackInterval(protocol.WindowBytes), protocol.WindowBytes / 4);
    assert.equal(protocol.validOffer({ type: 'offer', id: 'a'.repeat(32), name: 'x', size: 1, window: 1 }), false);
    assert.ok(protocol.ReceiveQueueBytes >= protocol.WindowBytes + protocol.ChunkSize);
});
