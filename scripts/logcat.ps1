# Muestra los registros (logcat) del emulador en tiempo real
# Uso: pwsh scripts/logcat.ps1 [-Serial "emulator-5554"] [-Package "com.example.miapp"]
param(
    [string]$Serial,
    [string]$Package
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Mostrando logcat (presiona Ctrl+C para detener) ..." -ForegroundColor Cyan
if ($Package) {
    adb $adbArgs logcat | Select-String $Package
} else {
    adb $adbArgs logcat
}
