# Inicia un emulador de Android (AVD)
# Lee AVD_NAME del archivo .env si existe, si no lo pide por consola
param(
    [string]$AvdName
)

$ErrorActionPreference = "Stop"

$emulator = Get-Command emulator -ErrorAction SilentlyContinue
if (-not $emulator) {
    Write-Error "No se encontró 'emulator'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

# Cargar .env de forma sencilla
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            Set-Content -Path "env:\$($matches[1])" -Value $matches[2]
        }
    }
}

if (-not $AvdName) {
    $AvdName = $env:AVD_NAME
}
if (-not $AvdName) {
    $AvdName = Read-Host "Nombre del AVD (ej. Pixel_7)"
}

Write-Host "Listando AVDs disponibles..." -ForegroundColor Cyan
emulator -list-avds

Write-Host "Iniciando emulador '$AvdName' ... (esto puede tardar)" -ForegroundColor Cyan
# Se inicia sin -Wait para que el script retorne y el emulador siga corriendo
Start-Process emulator -ArgumentList "@$AvdName", "-no-snapshot-load", "-wipe-data"

Write-Host "Emulador '$AvdName' iniciado." -ForegroundColor Green
