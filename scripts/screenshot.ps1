# Toma una captura de pantalla del emulador y la guarda como screenshot.png
# Uso: pwsh scripts/screenshot.ps1 [-Serial "emulator-5554"] [-Output "screenshot.png"]
param(
    [string]$Serial,
    [string]$Output = "screenshot.png"
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Capturando pantalla ..." -ForegroundColor Cyan
adb $adbArgs exec-out screencap -p > $Output

if (Test-Path $Output) {
    Write-Host "Captura guardada en: $Output" -ForegroundColor Green
} else {
    Write-Error "No se pudo guardar la captura. ¿Está el emulador encendido?"
    exit 1
}
