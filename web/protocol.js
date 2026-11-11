(function (root) {
    const protocol = {
        ChunkSize: 16 * 1024,
        MemoryLimit: 100 * 1024 * 1024,
        validOffer(value) {
            return !!value && value.type === 'offer' && /^[a-f0-9]{32}$/.test(value.id) &&
                typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 255 &&
                !/[\\/\x00-\x1f\x7f]/.test(value.name) && Number.isSafeInteger(value.size) && value.size >= 0;
        },
        validPair(value) {
            return !!value && /^[a-f0-9]{64}$/.test(value.room) && ['host', 'guest'].includes(value.role) &&
                /^[a-f0-9]{32}$/.test(value.peerId) && typeof value.peerName === 'string' && value.peerName.length <= 60;
        },
        acceptChunk(state, length) {
            if (!state?.accepted || !Number.isInteger(length) || length <= 0 || length > 65536 ||
                state.received + length > state.size) throw new Error('Invalid file chunk');
            state.received += length;
        }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = protocol;
    else root.TransferProtocol = protocol;
})(typeof globalThis !== 'undefined' ? globalThis : this);
