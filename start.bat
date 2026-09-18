@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title BRQ Transfer

echo ========================================================
echo                 BRQ Transfer Baslatiliyor
echo ========================================================
echo.

:: 1. Node.js kontrolu
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Sisteminizde Node.js kurulu degil veya PATH'e eklenmemis.
    echo Lutfen Node.js LTS surumunu kurun: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. node_modules kontrolu (Ilk calistirma)
if not exist "node_modules\" (
    echo [BILGI] Ilk calistirma tespit edildi.
    echo Paketler yukleniyor (npm install), lutfen bekleyin...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [HATA] Paketler yuklenirken bir sorun olustu.
        pause
        exit /b 1
    )
    echo [BASARILI] Kurulum tamamlandi!
    echo.
)

:: 3. Masaustu Uygulamasini (Electron) Baslat
echo Masaustu arayuzu aciliyor...
call npm run desktop
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BILGI] Masaustu penceresi acilamadi, tarayici modunda baslatiliyor...
    timeout /t 1 /nobreak >nul
    start http://localhost:4500
    node server.js
)
