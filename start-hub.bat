@echo off
chcp 65001 >nul
title ApkDrop - Android Dağıtım & Kablosuz ADB Hub
cd /d "%~dp0"

echo ==================================================
echo   🚀 ApkDrop Hub & Wireless ADB Başlatılıyor...
echo   💻 Panel: http://localhost:4500
echo ==================================================

timeout /t 1 /nobreak >nul
start http://localhost:4500

node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HATA] Sunucu beklenmedik sekilde kapandi. Hata kodunu yukaridan inceleyebilirsiniz.
    pause
)
