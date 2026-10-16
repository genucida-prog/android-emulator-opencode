# Copia un archivo del emulador al PC
# Uso: pwsh scripts/pull-file.ps1 -Remote "/sdcard/Descargas/archivo.txt" -Local "archivo.txt" [-Serial "emulator-5554"]
param(
    [Parameter(Mandatory = $false)]
    [string]$Remote,

    [Parameter(Mandatory = $false)]
    [string]$Local,

    [string]$Serial
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

if (-not $Remote) { $Remote = Read-Host "Ruta remota en el emulador (ej. /sdcard/Descargas/archivo.txt)" }
if (-not $Local) { $Local = Read-Host "Ruta local donde guardar (ej. archivo.txt)" }

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Copiando '$Remote' -> '$Local' ..." -ForegroundColor Cyan
adb $adbArgs pull $Remote $Local

Write-Host "Archivo copiado." -ForegroundColor Green
