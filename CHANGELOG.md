# Changelog

Notable changes are recorded here, newest first. Dated entries describe repository
updates; they do not imply a new package version or release tag.

## 2026-11-13

A review of the whole repository followed by the first phases of
[the improvement plan](docs/improvement-plan.md).

### Added

- **PC → phone without wireless debugging**: every file uploaded in the dashboard
  is listed on the phone page's new **From PC** tab and downloads over HTTP
  (with Range support). ADB is now only needed for push/install/control.
- **Phone access control**: `/mobile` no longer grants rights by itself. The
  dashboard QR carries an access key; other phones send an access request that
  is approved or declined in the dashboard. Loopback and ADB-reverse
  connections stay trusted. **Reset phone access** revokes every phone.
- **Resumable phone uploads**: per-file sessions, 4 MiB chunks with explicit
  offsets, two files in parallel, retries with backoff, and resume after a
  page reload. The previous multipart endpoint remains for compatibility.
- `adb track-devices` drives device updates; the poll falls back to 20 s
  (battery) while the tracker runs, and to the old 4 s poll without it.
- `/api/diagnostics` and a **Copy diagnostics report** button (no serials,
  addresses or paths).
- `npm run bench` (phone upload/download paths, optional real `adb push`) and
  `npm run bench:web` (WebRTC path, can target another checkout).
- Web edition: optional `BRQ_WEB_ICE_SERVERS`, a per-address socket limit
  (`BRQ_WEB_MAX_PER_IP`, `BRQ_WEB_TRUST_PROXY`).
- A WebSocket message-contract test between `server.js`, `pc.js` and `mobile.html`.

### Changed

- Web transfer protocol: 64 KiB messages, 1 MiB disk reads, negotiated 4 MiB
  window, acknowledgments every 1 MiB, event-driven send pacing, Blob folding on
  the fallback receive path. Older pages still interoperate.
- One PC → phone push now starts after ~4 ADB processes instead of ~8; the
  device monitor caches serials for 30 s and queries phones in parallel.
- English dashboards translate server error codes instead of showing Turkish
  server text.

### Fixed

- `uploads/` copies of PC uploads were never deleted, so the folder grew without
  bound. Crash leftovers (`.part`, install snapshots, clipboard temp files) are
  removed at startup.
- Received files were re-indexed and re-broadcast once more on Windows
  (sub-millisecond mtime comparison).
- QR pairing password used `Math.random`; it now uses `crypto.randomInt`.
- Progress events rebuilt the whole transfer list every second (lost clicks,
  collapsed details); only the affected card updates now.
- "Find Phone" could stay on "Searching…"; screen stream could stay on
  "Starting…"; reloading the dashboard replayed the "device connected" chime;
  privacy mode leaked an address in a toast; stale battery after switching phones.
- Phone page: overlapping progress timers, hanging uploads after Wi-Fi loss,
  hard-coded Turkish APK toast.
- Web edition: a phone switching networks could be locked out permanently
  (`ROOM_BUSY`); a short ICE `disconnected` aborted transfers; renaming silently
  aborted transfers; a peer closing its tab showed a false connection error;
  rate-limit errors were shown as "pairing declined"; senders could time out
  during the receiver's disk commit.
- Electron: "Retry" after a failed backend start looped forever; a second
  instance could start work before quitting; quitting could hang.
- Launchers: `start-hub.bat` had a UTF-8 BOM; `start.bat` checked only three
  dependencies; `launch.vbs` could leave a hidden headless server running.

### Validation

- `npm run check` passed; `npm test`: 225 tests passed, none failed or skipped;
  `npm run test:ui` passed; `npm run test:ux`: 51 rendered screen checks passed
  (new: phone access card and From PC tab at four widths); `npm run test:web`
  passed; `npm run validate:local` completed its five-minute run.
- `npm run bench`, 256 MiB over loopback: phone → PC resumable upload 372.6 MiB/s,
  PC → phone page download 453.1 MiB/s.
- `npm run bench:web`, 256 MiB over loopback: 15.0 MiB/s with the previous
  protocol, 18.7 MiB/s now. Larger messages and windows reached only 20–22 MiB/s,
  which points to Chromium's DataChannel ceiling on loopback; the window change
  matters most on real Wi-Fi latency and was not measured there.
- Not exercised: real phones, real ADB, the Android companion APK, Safari or
  Firefox, the Electron retry/second-instance paths, multi-gigabyte Wi-Fi uploads.

## 2026-11-11

### Added

- A separate browser-only file-sharing preview (`npm run web`) with the existing
  BRQ logo, shared styling, dark/light themes, Turkish/English UI and mobile layout.
- QR/link pairing with approval on both pages, one remembered counterpart,
  automatic reconnection while both pages are open, and a Forget device action.
- Bidirectional WebRTC file transfers with receiver consent, progress,
  cancellation, retry from the beginning and receiver completion acknowledgments.
- Chunked, backpressured transfer; direct-to-disk saving in supported browsers
  and a bounded 100 MiB download fallback elsewhere. Empty files are supported.
- Isolated signaling service with same-origin checks, bounded rooms/messages,
  explicit peer approvals and no desktop-admin or file-storage endpoints.
- `npm run test:web` for real two-browser transfer/connection tests; CI integration,
  an optional web Dockerfile and a GitHub-to-HTTPS-host deployment guide.

### Scope

- The desktop app and Android/ADB features are unchanged. Web visitors do not
  need an application, ADB, extension or debugging setting. Both browser pages
  must remain open; automatic background device discovery is not available.
- The preview targets direct connections without TURN. Isolated networks can
  prevent connectivity. Browser storage remembers the pair, not transfer history.
- GitHub Pages cannot run signaling. Production needs an HTTPS/WebSocket host;
  this repository update does not by itself provision a public deployment.

### Validation

- Syntax checks and `npm test`: 211 tests passed, no failures or skips.
- Real Chromium sessions over a local LAN HTTP address: exact binary and empty
  downloads in both directions, explicit approval, remembered reconnection,
  cancellation, size limits, download cleanup and safe filename rendering passed.
- Controlled disk-writer checks verified completion acknowledgment and prevented
  cancellation once disk commit begins. A malicious-peer burst was disconnected
  before exceeding the application receive-queue limit.
- Existing Electron UI checks and all 46 desktop/mobile UX screen checks passed.
- New web dark/light screenshots at 1280 px and 390 px were inspected.

Physical phones, Safari/Firefox, native OS save dialogs, multi-gigabyte throughput,
Docker image build and a public HTTPS deployment were not exercised. The web
service is opt-in; the desktop server's transfer path is unchanged.

## 2026-11-03

### Added

- Live PC-to-phone transfer percentages based on the destination file size.
  Transfers reach 100% only after ADB confirms that the push succeeded.
- A Reconnect action for explicitly disconnected, previously paired phones
  whose connection service is still discoverable.
- `npm run test:ux` for responsive layout, keyboard navigation, dialog focus,
  theme colors, text contrast, mobile touch targets and upload retry checks.

### Changed

- Simplified the desktop transfer page around transfer history, phone access
  and file uploads. Removed the desktop APK-list tab and build-watcher controls;
  server-side APK indexing, watcher support and mobile APK downloads remain.
- Bounded transfer history to its own scrollable panel, keeping upload controls
  visible on desktop. Improved narrow-screen layouts and long-name wrapping.
- Phone discovery now starts with Find Phone. Removed startup and periodic
  background wireless reconnection; existing device/battery polling remains.
- Pairing shows code and manual-address fields when needed, with one primary
  action and visible discovery feedback.
- Device cards show model names and USB/Wi-Fi transport labels. Hide stale
  offline wireless entries without hiding USB devices or reconnect actions.
- Resolve marketing model names with a cached identity lookup, including a
  Galaxy Note10+ model alias and Bluetooth-name fallback for missing device names.
- Preserve the original light/dark palette while improving spacing, typography,
  keyboard focus, heading structure, navigation state and reduced-motion support.
- Enable mobile pinch zoom, larger touch targets and accessible file pickers.

### Fixed

- Start APK delivery before metadata extraction finishes so metadata processing
  does not delay the phone push.
- Ignore late transfer progress after completion and avoid replacing a terminal
  transfer notification with an older queued response.
- Keep privacy masking applied after connection, QR and pairing updates while
  retaining working controls and copying the actual connection URL.
- Open Windows Explorer visibly and pass file-selection arguments separately.
- Retain failed mobile uploads for retry, show persistent error details, announce
  busy states and display a readable file-count separator.
- Keep image previews keyboard accessible with dialog focus containment,
  Escape-to-close and focus restoration.

### Validation

- `npm run check`: passed.
- `npm test`: 201 tests passed; no failures or skipped tests.
- `npm run test:ui`: passed.
- `npm run test:ux`: 46 rendered screen checks passed, plus interaction checks.
- `git diff --check`: passed.

Validation uses isolated fixtures. Real-phone transfers, physical mobile
browsers, live screen streams, Android builds and Unity Editor integration were
not exercised for this update. Transfer progress adds at most one remote-size
query per second per active push; device throughput has not been benchmarked.
