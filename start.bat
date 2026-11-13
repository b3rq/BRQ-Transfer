@echo off
setlocal
cd /d "%~dp0"
title BRQ Transfer
where node >nul 2>&1
if errorlevel 1 (
    echo [HATA] Node.js 22.12.0 veya daha yeni bir surum gerekli.
    goto failure
)
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)?0:1)"
if errorlevel 1 (
    echo [HATA] Node.js en az 22.12.0 olmali.
    goto failure
)
node -e "for(const d of Object.keys(require('./package.json').dependencies))require.resolve(d);if(!require('fs').existsSync('node_modules/electron/dist/electron.exe'))process.exit(1)" >nul 2>&1
if errorlevel 1 (
    echo Paketler dogrulaniyor: npm ci
    call npm.cmd ci
    if errorlevel 1 goto failure
)
call npm.cmd run desktop
if not errorlevel 1 exit /b 0
rem A hidden (launch.vbs) session must not leave a headless server running with no window to stop it.
if "%BRQ_SILENT%"=="1" exit /b 2
echo [BILGI] Masaustu acilamadi. Tarayici modu baslatiliyor.
set BRQ_OPEN_BROWSER=1
node server.js
if errorlevel 1 goto failure
exit /b 0
:failure
if not "%BRQ_SILENT%"=="1" pause
exit /b 1
