$ErrorActionPreference = "Stop"

$JAVA_HOME = "C:\Program Files\Unity\Hub\Editor\6000.0.72f1\Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK"
$env:JAVA_HOME = $JAVA_HOME
$env:PATH = "$JAVA_HOME\bin;$env:PATH"

$JAVA = "$JAVA_HOME\bin\java.exe"
$JAVAC = "$JAVA_HOME\bin\javac.exe"
$JAR = "$JAVA_HOME\bin\jar.exe"
$KEYTOOL = "$JAVA_HOME\bin\keytool.exe"

$AAPT2 = "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\aapt2.exe"
$D8 = "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\d8.bat"
$ZIPALIGN = "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\zipalign.exe"
$APKSIGNER = "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\apksigner.bat"
$ANDROID_JAR = "$env:LOCALAPPDATA\Android\Sdk\platforms\android-36.1\android.jar"

$PROJECT = "C:\Users\aliha\.gemini\antigravity\scratch\unity-apk-hub\android-companion"
$SRC = "$PROJECT\src\main"
$BUILD = "$PROJECT\build"

Write-Host "1. Temizleniyor..."
if (Test-Path $BUILD) { Remove-Item $BUILD -Recurse -Force }
New-Item -ItemType Directory -Path "$BUILD\compiled_res", "$BUILD\gen", "$BUILD\classes" -Force | Out-Null

Write-Host "2. Kaynaklar derleniyor (aapt2 compile)..."
& $AAPT2 compile "$SRC\res\values\strings.xml" -o "$BUILD\compiled_res"
& $AAPT2 compile "$SRC\res\xml\file_paths.xml" -o "$BUILD\compiled_res"

Write-Host "3. Paket bağlanıyor (aapt2 link)..."
$zipFiles = Get-ChildItem -Path "$BUILD\compiled_res" -Filter "*.flat" | ForEach-Object { $_.FullName }
& $AAPT2 link -I $ANDROID_JAR --manifest "$SRC\AndroidManifest.xml" --java "$BUILD\gen" -o "$BUILD\app.unaligned.apk" $zipFiles --auto-add-overlay

Write-Host "4. Java derleniyor (javac)..."
$javaFiles = Get-ChildItem -Path "$SRC\java", "$BUILD\gen" -Filter "*.java" -Recurse | ForEach-Object { $_.FullName }
& $JAVAC -cp $ANDROID_JAR -d "$BUILD\classes" -source 1.8 -target 1.8 $javaFiles

Write-Host "5. Dex oluşturuluyor (d8)..."
$classFiles = Get-ChildItem -Path "$BUILD\classes\com\unity\apkhub" -Filter "*.class" -Recurse | ForEach-Object { $_.FullName }
& cmd /c "$D8 --output $BUILD --lib $ANDROID_JAR $($classFiles -join ' ')"

Write-Host "6. classes.dex APK'ya ekleniyor..."
$origDir = Get-Location
Set-Location $BUILD
& $JAR uf "$BUILD\app.unaligned.apk" classes.dex
Set-Location $origDir

Write-Host "7. Zipalign yapılıyor..."
& $ZIPALIGN -f -p 4 "$BUILD\app.unaligned.apk" "$BUILD\app.aligned.apk"

Write-Host "8. Keystore kontrolü ve İmzalama..."
$KEYSTORE = "$BUILD\debug.keystore"
if (-not (Test-Path $KEYSTORE)) {
    & $KEYTOOL -genkeypair -validity 10000 -dname "CN=UnityHub,O=Dev,C=TR" -keystore $KEYSTORE -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048
}

& cmd /c "$APKSIGNER sign --ks $KEYSTORE --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out $BUILD\UnityCompanion.apk $BUILD\app.aligned.apk"

Write-Host "9. Public klasörüne kopyalanıyor..."
Copy-Item "$BUILD\UnityCompanion.apk" "C:\Users\aliha\.gemini\antigravity\scratch\unity-apk-hub\public\UnityCompanion.apk" -Force

Write-Host "=========================================="
Write-Host "🎉 BAŞARILI! UnityCompanion.apk üretildi!"
Write-Host "=========================================="
