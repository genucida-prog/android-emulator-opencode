# Copia un archivo del PC al emulador
# Uso: pwsh scripts/push-file.ps1 -Local "archivo.txt" -Remote "/sdcard/Descargas/archivo.txt" [-Serial "emulator-5554"]
param(
    [Parameter(Mandatory = $false)]
    [string]$Local,

    [Parameter(Mandatory = $false)]
    [string]$Remote,

    [string]$Serial
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

if (-not $Local) { $Local = Read-Host "Ruta local del archivo (ej. archivo.txt)" }
if (-not $Remote) { $Remote = Read-Host "Ruta remota en el emulador (ej. /sdcard/Descargas/archivo.txt)" }

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Copiando '$Local' -> '$Remote' ..." -ForegroundColor Cyan
adb $adbArgs push $Local $Remote

Write-Host "Archivo copiado." -ForegroundColor Green
