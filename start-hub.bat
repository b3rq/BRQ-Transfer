@echo off
title Unity APK Hub & Wireless ADB
cd /d "%~dp0"
echo ==================================================
echo   ?? Unity APK Hub & Wireless ADB Baslatiliyor...
echo ==================================================
start http://localhost:4500
node server.js
pause
