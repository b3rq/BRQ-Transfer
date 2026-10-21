const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

try {
    const session = JSON.parse(fs.readFileSync(path.join(__dirname, '.dashboard-session.json'), 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(session.token) || !Number.isInteger(session.port) || session.port < 1 || session.port > 65535) throw new Error();
    const opener = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const child = spawn(opener, [`http://localhost:${session.port}/?session=${session.token}`], { windowsHide: true });
    child.on('error', () => { console.error('Panel açılamadı. Sistem tarayıcısını kontrol edin.'); process.exitCode = 1; });
} catch (_) {
    console.error('Yerel hub oturumu bulunamadı. Önce BRQ Transfer sunucusunu başlatın.');
    process.exitCode = 1;
}
