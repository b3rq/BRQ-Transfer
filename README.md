# BRQ Transfer

High-speed local Wi-Fi file transfer, wireless ADB manager, live screen mirroring, and clipboard sync hub between PC and Android devices.

![BRQ Transfer Dashboard](docs/preview.png)

This tool was created with AI assistance to remove daily friction in moving files, managing Android devices, and testing mobile applications without physical cables or cloud workarounds.

---

## Why BRQ Transfer?

Moving files between a PC and an Android phone or testing mobile applications typically relies on two conventional methods:

1. **USB Cables**: Physical cables wear out ports over time, restrict device movement during testing (gyroscope, orientation, camera), and easily disconnect when moved.
2. **Cloud Services (Drive, Dropbox, Messaging Apps)**: Uploading 100 MB to 1 GB files (recordings, media, app builds) depends on external internet upload speeds, applies cloud processing delays, and requires manual downloading and searching through phone folders.

### The Solution
BRQ Transfer connects your PC and Android devices directly over your local Wi-Fi network (LAN):
- **Gigabit Local Speeds**: Transfers run at full router bandwidth (30–80+ MB/s over 5 GHz Wi-Fi) with 0 KB internet data usage.
- **Universal Bidirectional Transfer**: Send any file format (photos, videos, documents, music, APKs) from PC to phone, or upload from phone back to PC.
- **Zero-Install Web Access**: Connected phones only need to scan a QR code with their camera to access the transfer dashboard in their mobile browser.
- **Wireless ADB Engine**: Manage devices, install apps, launch packages, and inspect device telemetry over Wi-Fi without cables.
- **Real-Time Clipboard Sync**: Seamlessly synchronize copied text between PC and Android in both directions.
- **Low-Latency Screen Mirroring**: View and interact with your Android display on your PC at 60 FPS.

---

## Use Cases

- **Everyday File Transfers**: Quickly move camera recordings, music albums, PDFs, or photos between your PC and Android phone without hunting for USB cables or uploading to third-party servers.
- **App & Game Developers**: If you build mobile apps or games (e.g. in Unity, Flutter, React Native, or Android Studio), BRQ Transfer can watch your build folder, automatically detect new APKs, install them over Wireless ADB, and launch them on your device hands-free.
- **Device Management & Testing**: Control phone navigation buttons, capture screenshots, check battery telemetry, and mirror screens during presentations or testing.

---

## Security & Important Safety Warnings

> [!WARNING]
> **Use on Trusted Private Networks Only**
> BRQ Transfer runs on your local network (LAN) on port 4500 and is designed for ease of use without complex authentication barriers. **Never run this application on public or untrusted Wi-Fi networks** (such as cafes, airports, or hotels) where unknown devices share the same network. Only run it on private, password-protected home or office networks.

> [!IMPORTANT]
> **Wireless ADB Security**
> Wireless ADB grants direct command-level access to your Android device (including installing/uninstalling packages, rebooting, and input simulation). Only pair and connect to Android devices that you personally own. Always verify the device IP before initiating a connection.

> [!CAUTION]
> **Third-Party Package Caution**
> Do not transfer or install APKs from unknown or unverified sources. Installing untrusted packages can compromise your mobile device.

> [!TIP]
> **Privacy / Streamer Mode**
> If you are screen-sharing, recording videos, or livestreaming, enable **Privacy Mode** (the eye icon in the top-right corner of the dashboard). This will automatically mask local IP addresses, device serial numbers, and sensitive hardware identifiers.

---

## Features

- **Bidirectional File Transfer**:
  - **PC to Mobile**: Drag and drop any file onto the web dashboard for immediate download to `/sdcard/Download`.
  - **Mobile to PC**: Upload photos, videos, recordings, or documents directly from your phone's browser or companion app to your PC's `received/` folder.
- **Wireless ADB Management**:
  - Pair using only the phone's 6-digit code, with automatic IP and port discovery.
  - Automatically reconnect previously paired devices as their IP or port changes.
  - Manual IP & Port connection as a fallback when network discovery is blocked.
  - Android 11+ Wireless Debugging QR code pairing with automatic port resolution.
  - Direct APK installation, package uninstallation, force stop, and app launch.
  - Remote navigation controls (Back, Home, App Switch, Power).
- **Bidirectional Clipboard Synchronization**:
  - `PC → Mobile`: Text copied on PC is automatically sent to the phone's clipboard.
  - `Mobile → PC`: Text copied on phone is automatically received on PC.
  - `Off`: Toggle synchronization off when not needed.
- **High-FPS Screen Mirroring**: Integrated `scrcpy` engine for viewing and controlling your Android device at 60 FPS with low latency.
- **Build Watcher & Developer Hooks**:
  - Automatically monitors configured folders for newly exported APKs.
  - Includes optional editor post-build scripts (`plugins/`) for developers wanting instant zero-touch testing upon compilation.
- **Device Telemetry & Battery Monitor**: Real-time display of battery percentage, charging state, and device identifiers.

---

## Quick Start

### Requirements
- [Node.js](https://nodejs.org/) (v22.12.0 or newer required; Node 22/24 are the validation targets)
- Android SDK Platform-Tools (`adb`) in PATH (automatically detected if installed via Android Studio or Unity Hub)

### Installation & Run

#### Option A: Quick Start (Windows)
1. Clone or download the repository:
   ```bash
   git clone https://github.com/b3rq/BRQ-Transfer.git
   cd BRQ-Transfer
   ```
2. Double-click **`start.bat`** (or **`launch.vbs`** for silent background execution).
   - On the first run, it automatically installs required dependencies (`npm install`) and opens the native desktop application window.

#### Option B: Manual CLI
1. Clone and enter directory:
   ```bash
   git clone https://github.com/b3rq/BRQ-Transfer.git
   cd BRQ-Transfer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   - Desktop App: `npm run desktop`
   - Headless Web Server: `npm start` (Dashboard opens at `http://localhost:4500`)

---

## Wireless ADB Setup

The desktop launcher opens the local management session automatically. For browser use, start the server with `npm start`, then run `npm run panel` from the same checkout. Opening a bare localhost URL does not establish an admin session. Mobile browsers use `/mobile` and can transfer files without receiving device-management or configuration access. Keep the generated `.dashboard-session.json` private and outside version control.

For the Unity hook, set **Hub Folder** in its editor window to this checkout (or set `BRQ_TRANSFER_HOME`). The hook and window share the configured port; the default is 4500.

Uploads are limited to **2000 MiB per file**, with at most 50 files and **4000 MiB total** in one mobile submission. PC uploads run two at a time with up to 100 waiting files; the server accepts four simultaneous uploads and up to 100 in-flight transfers. Phone push/install work runs one at a time per verified phone. History keeps these in-flight records plus the latest 100 finished records. Without a selected phone, a PC upload is saved locally and is not reported as delivered. Interrupted transfers offer **Retry**, verifying the original phone identity first. Clipboard text has a **64 KiB UTF-8 limit**; larger content should be sent as a file.

Local build folders use native filesystem events. UNC folders and native watcher errors use polling; set `BRQ_WATCH_POLLING=1` to force polling on other network mounts. Completed APK checks and write stabilization remain enabled.

Run `npm test` for regression tests, `npm run test:ui` for the Electron DOM/render checks, `npm run validate:local` for the five-minute isolated local load test, and `npm run benchmark:watcher` for the 10,000-file watcher comparison. The local validation tools use fixture files and fake ADB/UDP; they do not operate on phones or your normal configuration.

The Companion source can be compiled without replacing the distributed APK using `./android-companion/build-companion.ps1 -ValidateOnly`. Physical Android update/install validation remains separate from this source compilation. Existing public APKs are preserved when build or signing validation fails.

For Android 11 and newer:

1. Enable Developer Options on your phone (Settings -> About Phone -> tap Build Number 7 times).
2. Go to **Settings -> Developer Options -> Wireless Debugging** and enable it.
3. Connect the phone and PC to the same local network (including a PC mobile hotspot). Keep **Wireless debugging** enabled and allow debugging on that network. You do not need to keep the pairing code dialog open for discovery.
4. In BRQ Transfer, open **Devices**, select your phone, and click **Connect**. If this PC is already authorized, it connects without asking for a code. Otherwise, the code field appears: open **Pair device with pairing code** on the phone, keep that dialog open while pairing, enter the **6-digit code**, and click **Pair**. IP addresses and ports are resolved automatically.
5. After pairing, keep Wireless Debugging enabled. BRQ Transfer attempts to reconnect known devices every 10 seconds using their current advertised address, without scanning port ranges. Choosing **Disconnect** pauses the app's reconnection attempts for that device until you reconnect it manually, including after an app restart.
6. If discovery is blocked by your network, expand **Phone not found? Pair manually** and enter the IP:Port from the **pairing code dialog**, along with the 6-digit code. If automatic connection after pairing is also unavailable, enter the separate **connection port** from the main Wireless Debugging screen. QR pairing is available as an alternative.
7. Enable **Auto-install on new build** for hands-free updates.

Pairing codes are not saved. Reconnection remembers device service identities rather than relying on the previous IP address. If debugging authorization is revoked, pair again.

The **Saved Phones** panel lists BRQ's saved wireless phones, including offline ones. Use **Delete** for one phone or **Delete all** for every saved phone, then confirm. BRQ disconnects the selected phones and requires a fresh code or QR pairing before allowing them to reconnect, including after restarting the app. This is a BRQ restriction: Android's authorization for this computer remains available to other ADB applications until you also forget the computer under **Wireless debugging → Paired devices** on the phone. Computer-wide ADB keys are left intact.

Discovery lists phones advertising wireless ADB, not every device joined to Wi-Fi. It combines ADB's mDNS results with direct DNS-SD queries on local IPv4 interfaces, including the hotspot adapter, without scanning port ranges. Network isolation, VPNs, or firewall rules can still prevent discovery; use the manual address in that case. The pairing code dialog is needed only during initial pairing or after authorization is revoked.

---

## Architecture

```mermaid
flowchart TD
    subgraph PC["Host PC"]
        Server["BRQ Transfer Server (:4500)"]
        Watcher["Folder Watcher (chokidar)"] --> Server
        Manual["Web Dashboard Drag & Drop"] --> Server
        Server --> ADB["Wireless ADB Engine"]
        Server --> Scrcpy["scrcpy Screen Mirror"]
        Server --> Clip["Clipboard Daemon"]
    end

    subgraph Mobile["Android Device (Same Local Wi-Fi)"]
        ADB -->|Direct Install & Launch| Apps["Installed Apps"]
        Server -->|HTTP / WebSocket| MobileWeb["Mobile Browser / PWA"]
        Server -->|HTTP / APK Install| Companion["Optional Companion APK"]
    end
```

---

## Repository Structure

```
BRQ-Transfer/
├── android-companion/    # Optional lightweight Android companion app source
├── docs/                 # Documentation assets and dashboard screenshots
├── plugins/              # Optional editor and build hook scripts
├── public/               # PC & Mobile web dashboards (HTML, CSS, JS)
├── tools/                # Clipboard sync and platform helper binaries
├── server.js             # Core Node.js server, WebSocket, ADB manager
├── electron.js           # Native desktop application wrapper
├── start.bat             # Windows one-click auto-installer & desktop launcher
├── start-hub.bat         # Windows console launcher shortcut
└── launch.vbs            # Silent background launcher (no console window)
```

---

## License

Distributed under the MIT License. See `LICENSE` for details.
