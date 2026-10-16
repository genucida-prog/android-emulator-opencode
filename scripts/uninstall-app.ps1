# Desinstala una aplicación del emulador/dispositivo
# Uso: pwsh scripts/uninstall-app.ps1 -PackageName "com.example.miapp" [-Serial "emulator-5554"]
param(
    [Parameter(Mandatory = $false)]
    [string]$PackageName,

    [string]$Serial
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

if (-not $PackageName) {
    $PackageName = Read-Host "Nombre del paquete a desinstalar (ej. com.example.miapp)"
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Desinstalando '$PackageName' ..." -ForegroundColor Cyan
adb $adbArgs uninstall $PackageName

Write-Host "App desinstalada." -ForegroundColor Green
