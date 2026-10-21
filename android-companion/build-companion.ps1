param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$AndroidSdk = $env:ANDROID_HOME,
    [string]$BuildToolsVersion = '36.0.0',
    [string]$Platform = 'android-36.1',
    [string]$Keystore = $env:BRQ_KEYSTORE,
    [string]$KeyAlias = 'androiddebugkey',
    [switch]$ValidateOnly
)
$ErrorActionPreference = 'Stop'
if (-not $JavaHome) { $JavaHome = 'C:\Program Files\Unity\Hub\Editor\6000.0.72f1\Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK' }
if (-not $AndroidSdk) { $AndroidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$projectDir = $PSScriptRoot
$sourceDir = Join-Path $projectDir 'src\main'
$toolsDir = Join-Path $AndroidSdk "build-tools\$BuildToolsVersion"
$androidJar = Join-Path $AndroidSdk "platforms\$Platform\android.jar"
$java = Join-Path $JavaHome 'bin\java.exe'
$javac = Join-Path $JavaHome 'bin\javac.exe'
$jar = Join-Path $JavaHome 'bin\jar.exe'
$aapt = Join-Path $toolsDir 'aapt2.exe'
$zipalign = Join-Path $toolsDir 'zipalign.exe'
$d8 = Join-Path $toolsDir 'lib\d8.jar'
$signer = Join-Path $toolsDir 'lib\apksigner.jar'
foreach ($tool in @($java, $javac, $jar, $aapt, $zipalign, $d8, $signer, $androidJar)) {
    if (-not (Test-Path -LiteralPath $tool -PathType Leaf)) { throw "Gerekli araç bulunamadı: $tool" }
}
function Invoke-Native([string]$Tool, [string[]]$Arguments) {
    & $Tool @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Araç başarısız: $([IO.Path]::GetFileName($Tool)), exit=$LASTEXITCODE" }
}
# Preserve the old key before any build operation. No build directory is deleted.
if (-not $Keystore) { $Keystore = Join-Path $projectDir 'signing\debug.keystore' }
$oldKey = Join-Path $projectDir 'build\debug.keystore'
if (-not (Test-Path -LiteralPath $Keystore) -and (Test-Path -LiteralPath $oldKey)) {
    New-Item -ItemType Directory -Path (Split-Path $Keystore) -Force | Out-Null
    Copy-Item -LiteralPath $oldKey -Destination $Keystore
}
if (-not $ValidateOnly -and -not (Test-Path -LiteralPath $Keystore -PathType Leaf)) {
    throw 'Önceki imza anahtarı bulunamadı. BRQ_KEYSTORE ile aynı anahtarı belirtin. Mevcut APK korunuyor; yeni anahtar otomatik oluşturulmaz.'
}
$buildDir = Join-Path $projectDir ('build\run-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path "$buildDir\compiled_res", "$buildDir\gen", "$buildDir\classes" -Force | Out-Null
Invoke-Native $aapt @('compile', "$sourceDir\res\values\strings.xml", '-o', "$buildDir\compiled_res")
Invoke-Native $aapt @('compile', "$sourceDir\res\xml\file_paths.xml", '-o', "$buildDir\compiled_res")
$resources = @(Get-ChildItem -LiteralPath "$buildDir\compiled_res" -Filter '*.flat' | ForEach-Object { $_.FullName })
Invoke-Native $aapt (@('link', '-I', $androidJar, '--manifest', "$sourceDir\AndroidManifest.xml", '--java', "$buildDir\gen", '-o', "$buildDir\app.unaligned.apk", '--auto-add-overlay') + $resources)
$sources = @(Get-ChildItem -Path "$sourceDir\java", "$buildDir\gen" -Filter '*.java' -Recurse | ForEach-Object { $_.FullName })
Invoke-Native $javac (@('-cp', $androidJar, '-d', "$buildDir\classes", '-source', '8', '-target', '8') + $sources)
$classes = @(Get-ChildItem -LiteralPath "$buildDir\classes" -Filter '*.class' -Recurse | ForEach-Object { $_.FullName })
Invoke-Native $java (@('-cp', $d8, 'com.android.tools.r8.D8', '--output', $buildDir, '--lib', $androidJar) + $classes)
$previousDirectory = Get-Location
try {
    Set-Location -LiteralPath $buildDir
    Invoke-Native $jar @('uf', "$buildDir\app.unaligned.apk", 'classes.dex')
} finally { Set-Location -LiteralPath $previousDirectory.Path }
Invoke-Native $zipalign @('-f', '-p', '4', "$buildDir\app.unaligned.apk", "$buildDir\app.aligned.apk")
$entries = @(Invoke-Native $jar @('tf', "$buildDir\app.aligned.apk"))
if ('classes.dex' -notin $entries -or 'AndroidManifest.xml' -notin $entries) { throw 'APK dex/manifest doğrulaması başarısız.' }
if ($ValidateOnly) { Write-Host 'Kaynak/resource/dex doğrulandı. Public APK değiştirilmedi.'; return }
if (-not $env:BRQ_KEYSTORE_PASSWORD) { throw 'BRQ_KEYSTORE_PASSWORD ortam değişkenini ayarlayın. Public APK değiştirilmedi.' }
Invoke-Native $java @('-jar', $signer, 'sign', '--ks', $Keystore, '--ks-pass', 'env:BRQ_KEYSTORE_PASSWORD', '--ks-key-alias', $KeyAlias, '--key-pass', 'env:BRQ_KEYSTORE_PASSWORD', '--out', "$buildDir\UnityCompanion.apk", "$buildDir\app.aligned.apk")
$newCertificate = @(Invoke-Native $java @('-jar', $signer, 'verify', '--print-certs', "$buildDir\UnityCompanion.apk")) | Where-Object { $_ -match '^Signer #1 certificate SHA-256 digest:' }
$publicApk = [IO.Path]::GetFullPath((Join-Path $projectDir '..\public\UnityCompanion.apk'))
if (Test-Path -LiteralPath $publicApk) {
    $oldCertificate = @(Invoke-Native $java @('-jar', $signer, 'verify', '--print-certs', $publicApk)) | Where-Object { $_ -match '^Signer #1 certificate SHA-256 digest:' }
    if (-not $oldCertificate -or $oldCertificate -ne $newCertificate) { throw 'İmza önceki APK ile uyuşmuyor. Mevcut APK korunuyor.' }
}
$staging = $publicApk + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
Copy-Item -LiteralPath "$buildDir\UnityCompanion.apk" -Destination $staging
if (Test-Path -LiteralPath $publicApk) { [IO.File]::Replace($staging, $publicApk, $null) }
else { [IO.File]::Move($staging, $publicApk) }
Write-Host 'APK doğrulandı, aynı imzayla güncellendi.'
