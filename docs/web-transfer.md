# BRQ Transfer Web

The web edition shares files in both directions between two browsers. Visitors
open a URL, pair once using a QR/link, and approve incoming files. They do not
install BRQ, Node.js, ADB, an extension, or a phone app. Wireless debugging is
irrelevant to this edition; it cannot trigger a connection.

The desktop app continues to use `npm run desktop` and retains its existing
device-management features. The web edition uses a separate server and the same
logo, CSS design tokens, light/dark palette and familiar transfer layout.

## Try from this development checkout

```sh
npm ci
npm run web
```

Open `http://localhost:4600` on the development PC. Scan its QR using a phone on
the same Wi-Fi. If the PC has multiple adapters, choose its Wi-Fi/LAN address in
the pairing card before scanning. Approve pairing on both pages. Send a file in
either direction and accept it on the receiving device. An incoming download
needs the final **Download file** tap in browsers without a native save picker.

These commands are for the developer/host, not visitors of the deployed site.
The development server uses port 4600, independently from desktop port 4500.
The host firewall must permit that port for private-network testing. No firewall
rules are changed automatically. Local HTTP is a preview, not a production
deployment; clipboard/save-picker features can be unavailable there. Real-phone
browser compatibility must still be checked on the intended devices.

## Remembered connection

- On the first successful data connection each browser stores one peer ID and a
  random pairing credential in its own local storage.
- Reopening the same site in both browsers automatically reconnects that pair.
  The first pairing requires approval on both devices; receiving files always
  requires consent, including after automatic reconnection.
- Keep the pages open. Background suspension or locking a phone can interrupt a
  transfer. A short Wi-Fi drop (ICE `disconnected`) gets 5 seconds to recover
  before the transfer fails. Retry starts the file from the beginning.
- If the old connection of a phone that switched networks is still open on the
  server, the same browser identity takes over its own slot instead of being
  refused as "open in another tab".
- **Forget device** discards the local credential and rotates the invitation.
  Re-pairing with a different device requires forgetting the old device first.
- Private browsing, cleared site data, another browser, or a different site URL
  loses that browser's remembered identity. Close duplicate tabs before retrying
  a busy room. No network scan or device fingerprint is used.

## Transfer and resource behavior

- Files travel over an encrypted, reliable, ordered WebRTC DataChannel. The
  signaling server only exchanges room/peer information, SDP and ICE candidates;
  it has no file-upload/download route and never stores transferred file bytes.
- By default there is no STUN or TURN server; the edition targets direct
  same-network connections. Browsers hide local addresses behind `.local` mDNS
  names, so networks that block multicast (guest Wi-Fi, client isolation, some
  mesh routers), VPNs or blocked UDP can prevent pairing. The host may set
  `BRQ_WEB_ICE_SERVERS` (a JSON array such as
  `[{"urls":"stun:stun.example.org:3478"}]`, TURN entries may carry `username`
  and `credential`) and the pages use it. There is no silent cloud relay.
- File data is sent in 64 KiB messages read from disk in 1 MiB slices. Both sides
  advertise a window in the offer/accept messages; the effective unacknowledged
  window is 4 MiB and the receiver acknowledges every 1 MiB and at the final byte.
  The sender also pauses while more than 2 MiB is buffered in the browser and
  wakes on `bufferedamountlow` or the next acknowledgment. Pages from before this
  negotiation still interoperate with the old 256 KiB window and per-chunk acks.
- Acknowledgments follow the disk write (save-picker path) or the in-memory
  append (fallback path). Receiver queues are independently bounded to 8 MiB /
  256 pending messages, even for a misbehaving paired peer.
- A browser with `showSaveFilePicker` streams received data to a user-selected
  file. While the browser commits a large file, the receiver tells the sender, so
  the sender does not time out. Without a save picker, files are limited to
  **100 MiB each**; received data is folded into Blobs every 8 MiB so the page
  never holds two copies, and only one completed download Blob is retained. Download it before accepting another file or
  clearing history. Disk saves depend on free space and filesystem limits.
- One file per direction is active; a sender queues at most 20 files. The history
  is session-only and bounded to 100 entries. Zero-byte files are supported.
- “Delivered to the other browser” means the receiving browser acknowledged the
  complete file; fallback downloads still require the user's download action.
  Browser download completion is not presented as proof that the OS saved it.

## Production hosting from GitHub

Use an HTTPS host that supports a long-lived Node.js process and WebSocket
upgrades. GitHub stores source and runs CI; **GitHub Pages alone cannot host this
signaling service**. The smallest deployment serves both UI and signaling from
the same origin. There is no separate frontend build.

Configuration:

| Setting | Value |
| --- | --- |
| Install | `npm ci --omit=dev` |
| Start | `npm run web` |
| Port | host-provided `PORT`, default `4600` |
| Health endpoint | `/health` |
| Optional public URL | `BRQ_WEB_URL=https://your-domain.example` |
| WebSocket endpoint | `/signal` |

Alternatively build `Dockerfile.web`. It copies only the web source/shared assets
and runs as the unprivileged `node` user. The image excludes desktop binaries,
uploads, local configuration, and session credentials.

```sh
docker build -f Dockerfile.web -t brq-transfer-web .
docker run --rm -p 4600:4600 brq-transfer-web
```

Terminate TLS at the hosting proxy, preserve the public `Host` header and forward
WebSocket upgrades. Set `BRQ_WEB_URL` to the HTTPS origin without a subpath.
Each client address may hold at most 16 signaling sockets (`BRQ_WEB_MAX_PER_IP`).
Behind a reverse proxy, set `BRQ_WEB_TRUST_PROXY=1` so the limit uses the first
`X-Forwarded-For` address instead of the proxy's address.

Use a single service instance: room membership is held in memory, so independent
replicas cannot route peers together. A service restart requires clients to
reconnect and active transfers may be interrupted. No database is required.

The pairing link is a bearer credential; do not publish screenshots containing
an active QR. It is placed in the URL fragment, removed on entry, and not logged
by this app. The signaling service is trusted with connection setup; this is not
independent peer verification against a compromised hosting service. HTTPS,
same-origin restrictions, explicit pairing approval and bounded payloads are
enforced at their respective boundaries. Add deployment-level rate limiting
when opening the preview to a large public audience.

No public host is provisioned by adding these files. Deployment needs a hosting
account/environment and an HTTPS origin; a Git push alone does not create one.

## Validation

```sh
npm run check
npm test
npm run test:web
npm run test:ui
npm run test:ux
npm run bench:web
```

`test:web` uses isolated Chromium sessions provided by the existing Electron dev
dependency. It exercises real WebRTC and real browser downloads; save-picker
branches use controlled writers because native OS dialogs are interactive.
Screenshots and fixtures are written under ignored `.validation/web/`.
