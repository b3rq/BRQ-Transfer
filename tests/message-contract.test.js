// WebSocket message contract between server.js and its two clients.
// The server and clients are separate files with no shared constants, so this test is the
// single place that notices a renamed, dead or forgotten message type.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const server = read('server.js');
const panel = read('public/pc.js');
const phone = read('public/mobile.html');

// Every upper-case literal on a line that builds a `type:` field, including ternaries.
function sentTypes(source) {
    const types = new Set();
    for (const line of source.split(/\r?\n/)) {
        if (!/\btype:\s/.test(line)) continue;
        for (const match of line.matchAll(/'([A-Z][A-Z0-9_]{2,})'/g)) types.add(match[1]);
    }
    return types;
}
function handledTypes(source) {
    const types = new Set();
    for (const match of source.matchAll(/data\.type === '([A-Z_]+)'/g)) types.add(match[1]);
    for (const match of source.matchAll(/\[([^\]]+)\]\.includes\(data\.type\)/g)) {
        for (const item of match[1].matchAll(/'([A-Z_]+)'/g)) types.add(item[1]);
    }
    return types;
}

// Sent to the panel but intentionally not shown there (with the reason).
const PANEL_IGNORES = {
    APKS_UPDATED: 'the panel no longer lists APKs; only the phone page does',
    SCRCPY_STATUS: 'scrcpy opens its own window; the panel has no scrcpy control',
    SHARED_FILES_UPDATED: 'phone-only projection of the transfer list',
    // Codes in error payloads and HTTP error bodies, not WebSocket event types:
    DEVICE_BUSY: 'error code', REQUEST_FAILED: 'error code', INTERNAL_ERROR: 'error code'
};
const PHONE_TYPES = new Set(['INIT', 'NEW_APK', 'APKS_UPDATED', 'SHARED_FILES_UPDATED']);

test('the panel handles only message types the server actually sends', () => {
    const sent = sentTypes(server);
    for (const type of handledTypes(panel)) assert.ok(sent.has(type), `pc.js handles ${type}, which server.js never sends`);
});

test('every message type the server broadcasts is handled by the panel or explicitly ignored', () => {
    const handled = handledTypes(panel);
    const missing = [...sentTypes(server)].filter(type => !handled.has(type) && !PANEL_IGNORES[type] &&
        // HTTP error codes such as INVALID_UPLOAD share the `code:`/`type:` lines; keep only event-shaped names.
        !/_(FAILED|INVALID|EXPIRED|MISMATCH|BUSY|INCOMPLETE|DENIED|FOUND|TOO_LARGE|UNSUPPORTED|MISSING|REQUIRED)$|^INVALID_/.test(type));
    assert.deepEqual(missing, []);
});

test('the phone page handles every type the server may send to a phone', () => {
    const handled = handledTypes(phone);
    for (const type of PHONE_TYPES) assert.ok(handled.has(type), `mobile.html ignores ${type}`);
    // Phones must never receive admin events: broadcast() only forwards these projections.
    const broadcastBody = server.slice(server.indexOf('function broadcast('), server.indexOf('function publicSharedFiles('));
    for (const type of ['DEVICES_UPDATED', 'CONFIG_UPDATED', 'MOBILE_ACCESS_REQUESTS']) assert.equal(broadcastBody.includes(`'${type}'`), false);
});
