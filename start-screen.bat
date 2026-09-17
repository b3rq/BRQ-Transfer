@echo off
setlocal
cd /d "%~dp0tools\scrcpy"

echo ==================================================
echo   ApkDrop - 60 FPS Canli Ekran Baslatiliyor...
echo ==================================================

scrcpy.exe --window-title "ApkDrop - 60 FPS Canli Ekran" --max-size 1280 --video-bit-rate 8M --max-fps 60 --stay-awake --always-on-top

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HATA] Ekran baslatilamadi veya cihaz bulunamadi.
    echo Lutfen telefonunuzun Kablosuz ADB ile bagli oldugundan emin olun.
    pause
)
