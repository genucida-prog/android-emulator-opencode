# Abre una URL en el navegador del emulador
# Uso: pwsh scripts/open-url.ps1 -Url "https://ejemplo.com" [-Serial "emulator-5554"]
param(
    [Parameter(Mandatory = $false)]
    [string]$Url,

    [string]$Serial
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

if (-not $Url) {
    $Url = Read-Host "URL a abrir (ej. https://ejemplo.com)"
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Abriendo '$Url' en el emulador ..." -ForegroundColor Cyan
adb $adbArgs shell am start -a android.intent.action.VIEW -d $Url

Write-Host "URL abierta." -ForegroundColor Green
