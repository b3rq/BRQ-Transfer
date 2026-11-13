(function (root) {
    const MiB = 1024 * 1024;
    const protocol = {
        // 64 KiB is the largest DataChannel message every current browser accepts.
        ChunkSize: 64 * 1024,
        // Disk reads are batched; each File.slice().arrayBuffer() is an IPC round trip.
        ReadSize: MiB,
        // Unacknowledged bytes in flight. Advertised in offer/accept so both sides agree.
        WindowBytes: 4 * MiB,
        // Peers from before window negotiation acknowledge every chunk and allow 256 KiB.
        LegacyWindow: 256 * 1024,
        // Receiver queue bound, independent of what a (possibly malicious) peer advertises.
        ReceiveQueueBytes: 8 * MiB,
        ReceiveQueueMessages: 256,
        // Fallback downloads fold chunks into Blobs so memory never holds the file twice.
        FoldBytes: 8 * MiB,
        MemoryLimit: 100 * MiB,
        validWindow(value) {
            return Number.isSafeInteger(value) && value >= 64 * 1024 && value <= 16 * MiB;
        },
        // The sender's effective window: the receiver's advertised one, capped by ours.
        negotiatedWindow(value) {
            return protocol.validWindow(value) ? Math.min(value, protocol.WindowBytes) : protocol.LegacyWindow;
        },
        // How often the receiver acknowledges. 0 means every chunk (legacy sender).
        ackInterval(senderWindow) {
            return protocol.validWindow(senderWindow) ? Math.min(senderWindow, protocol.WindowBytes) / 4 : 0;
        },
        validOffer(value) {
            return !!value && value.type === 'offer' && /^[a-f0-9]{32}$/.test(value.id) &&
                typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 255 &&
                !/[\\/\x00-\x1f\x7f]/.test(value.name) && Number.isSafeInteger(value.size) && value.size >= 0 &&
                (value.window === undefined || protocol.validWindow(value.window));
        },
        validPair(value) {
            return !!value && /^[a-f0-9]{64}$/.test(value.room) && ['host', 'guest'].includes(value.role) &&
                /^[a-f0-9]{32}$/.test(value.peerId) && typeof value.peerName === 'string' && value.peerName.length <= 60;
        },
        acceptChunk(state, length) {
            if (!state?.accepted || !Number.isInteger(length) || length <= 0 || length > protocol.ChunkSize ||
                state.received + length > state.size) throw new Error('Invalid file chunk');
            state.received += length;
        }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = protocol;
    else root.TransferProtocol = protocol;
})(typeof globalThis !== 'undefined' ? globalThis : this);
