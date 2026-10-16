# Lista dispositivos y emuladores de Android conectados (adb devices)
$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

Write-Host "Dispositivos y emuladores conectados:`n" -ForegroundColor Cyan
adb devices
