@echo off
setlocal
cd /d "%~dp0"
title ApkDrop - Android Dagitim ve Kablosuz ADB Hub

echo ==================================================
echo   ApkDrop Hub ve Wireless ADB Baslatiliyor...
echo   Panel: http://localhost:4500
echo ==================================================

timeout /t 1 /nobreak >nul
start http://localhost:4500

node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HATA] Sunucu kapandi. Hata detayini yukaridan gorebilirsiniz.
    pause
)
