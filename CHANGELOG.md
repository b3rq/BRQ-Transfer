# Changelog

Notable changes are recorded here, newest first. Dated entries describe repository
updates; they do not imply a new package version or release tag.

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
