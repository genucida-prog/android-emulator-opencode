# Recompila un APK descompilado con apktool y lo firma para poder instalarlo.
# Requiere: apktool + jarsigner (incluido en JDK) o uber-apk-signer
# Uso: pwsh scripts/recompile-apk.ps1 -Folder "app-descompilada" -Out "app-modificada.apk"
param(
    [Parameter(Mandatory = $true)]
    [string]$Folder,

    [Parameter(Mandatory = $true)]
    [string]$Out
)

$ErrorActionPreference = "Stop"

function Write-Ok([string]$text) {
    Write-Host "✅ $text" -ForegroundColor Green
}

function Write-Warn([string]$text) {
    Write-Host "⚠️  $text" -ForegroundColor Yellow
}

$apktool = Get-Command apktool -ErrorAction SilentlyContinue
if (-not $apktool) {
    Write-Error "No se encontró 'apktool'. Instálalo desde https://ibotpeaches.github.io/Apktool/"
    exit 1
}

if (-not (Test-Path $Folder)) {
    Write-Error "No se encontró la carpeta descompilada: $Folder"
    exit 1
}

Write-Host "Recompilando '$Folder' -> '$Out' ..." -ForegroundColor Cyan
apktool b "$Folder" -o "$Out"

# Firmar el APK (debug keystore por defecto de Android SDK)
$debugKeystore = Join-Path $env:USERPROFILE ".android\debug.keystore"
if (-not (Test-Path $debugKeystore)) {
    Write-Warn "No se encontró debug.keystore. El APK no podrá instalarse sin firmarse."
    Write-Info "Genera una clave con keytool o usa uber-apk-signer."
    exit 1
}

Write-Host "Firmando APK con debug.keystore ..." -ForegroundColor Cyan
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "$debugKeystore" "$Out" androiddebugkey -storepass android -keypass android 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Warn "jarsigner falló. Intenta con 'uber-apk-signer' o firma manualmente."
} else {
    Write-Ok "APK firmado y listo para instalar: $Out"
    Write-Host "Instálalo en el emulador con: npm run install-apk -- $Out" -ForegroundColor Gray
}
