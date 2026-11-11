# BRQ Web File Transfer Implementation Plan

**Goal:** Preserve BRQ's visual identity in an install-free, bidirectional browser file transfer app.
**Architecture:** A separate, minimal Node/Express/WebSocket signaling service serves the web UI. WebRTC DataChannels carry file bytes directly; the existing desktop/ADB server remains separate. Reuse `public/app.css` and `public/icon.png`.
**Tech Stack:** Existing Express, ws and qrcode dependencies; browser WebRTC and file APIs. No new runtime dependency.
**Approved scope:** User accepted browser-only file sharing and requested implementation, matching visuals and remembered reconnection. Debugging settings cannot trigger browser connections. Both pages must be open.

## Tasks
- [x] Add isolated signaling server with same-origin checks, bounded messages/connections, two-peer rooms, mutual approval and no file upload endpoint. Test unauthorized signaling, room isolation, third peers and disconnect cleanup.
- [x] Build responsive file-only UI using existing design tokens and logo. Add QR/link pairing, theme/language preferences, remembered peer and forget action. Reconnect only the remembered peer; explicitly approve new identities.
- [x] Add ordered, chunked, backpressured transfer with receiver consent, progress, completion acknowledgment, cancellation and retry. Stream to disk where supported; cap memory fallback at 100 MiB, one inbound transfer, and one retained download. Reject malformed metadata/oversized data.
- [x] Exercise two real Chromium contexts for pairing, bidirectional binary/empty file transfer, decline/cancel, reload/reconnect and mobile/light/dark layouts. Run desktop regressions.
- [x] Document local preview and HTTPS production hosting, add deployment configuration and changelog, commit and push to the feature branch if remote access works.

## Acceptance and limits
- No ADB, USB, Android debugging, account, or installation is required on visitor devices.
- QR opens the same service on the phone. Local development can serve the LAN; public hosting must provide HTTPS and WebSocket support. GitHub Pages alone cannot run the signaling service.
- Remember exactly one counterpart in browser storage for this first version. Forget rotates the room credential. Clearing browser storage requires pairing again. A second tab may not take over an occupied role.
- No TURN relay: isolated Wi-Fi/VPN/firewall may prevent a direct connection. Fail visibly; do not silently upload files to a cloud service.
- Do not promise background transfer while a mobile OS suspends the page, automatic download without consent, unlimited memory fallback, or resume from the last byte.
- Signaling service holds room credentials/SDP in memory only, never file contents. HTTPS hosting is trusted with signaling; do not claim independent peer authentication against a compromised signaling server.
- Bound queues and transfer buffers; wait for receiver save acknowledgment before reporting success. Desktop performance is unchanged because the new server is opt-in.

## Verification and review record
- Full unit suite: 211 passed; syntax checks passed.
- Real Chromium sessions: loopback and LAN origin passed binary/empty downloads, pairing, reload and automatic reconnect, decline, active cancellation, size limits and Blob cleanup.
- Desktop regressions: UI harness passed; 46 UX screen checks passed.
- Independent review P1: unbounded pending receive messages. Reproduced with a blocked writer and burst traffic (RED), bounded the receive queue before enqueue (GREEN).
- Independent review P2: cancellation during disk commit could report cancellation after a saved file. Reproduced with a delayed close (RED), disabled commit cancellation and report actual close outcome (GREEN).
- No deferred review findings. Native phone/save-dialog, Docker and public-host validation remain explicit delivery limits in the Web guide.
- Implementation pushed to `origin/codex/web-file-transfer`; documentation/changelog published in the accompanying documentation commit.
