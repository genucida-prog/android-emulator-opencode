# Instala un APK en el emulador/dispositivo conectado
# Uso: pwsh scripts/install-apk.ps1 -ApkPath "ruta/app.apk" [-Serial "emulator-5554"]
param(
    [Parameter(Mandatory = $false)]
    [string]$ApkPath,

    [string]$Serial
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

if (-not $ApkPath) {
    $ApkPath = Read-Host "Ruta del archivo APK a instalar"
}
if (-not (Test-Path $ApkPath)) {
    Write-Error "No se encontró el archivo APK: $ApkPath"
    exit 1
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Instalando APK '$ApkPath' ..." -ForegroundColor Cyan
adb $adbArgs install -r $ApkPath

Write-Host "APK instalado correctamente." -ForegroundColor Green
