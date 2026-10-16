# Muestra información del dispositivo/emulador conectado
# Uso: pwsh scripts/device-info.ps1 [-Serial "emulator-5554"]
param([string]$Serial)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Información del dispositivo:`n" -ForegroundColor Cyan
adb $adbArgs shell getprop ro.product.model
adb $adbArgs shell getprop ro.build.version.release
adb $adbArgs shell wm size
adb $adbArgs shell wm density
