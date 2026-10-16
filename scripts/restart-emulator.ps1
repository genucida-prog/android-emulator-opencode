# Reinicia el emulador (mata y vuelve a iniciar el AVD configurado)
# Uso: pwsh scripts/restart-emulator.ps1
$ErrorActionPreference = "Stop"

$emulator = Get-Command emulator -ErrorAction SilentlyContinue
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $emulator -or -not $adb) {
    Write-Error "No se encontraron 'emulator' o 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            Set-Content -Path "env:\$($matches[1])" -Value $matches[2]
        }
    }
}

$AvdName = $env:AVD_NAME
if (-not $AvdName) {
    $AvdName = Read-Host "Nombre del AVD (ej. Pixel_7)"
}

Write-Host "Deteniendo emulador '$AvdName' ..." -ForegroundColor Cyan
adb emu kill 2>$null
Start-Sleep -Seconds 2

Write-Host "Iniciando emulador '$AvdName' ..." -ForegroundColor Cyan
Start-Process emulator -ArgumentList "@$AvdName", "-no-snapshot-load", "-wipe-data"

Write-Host "Emulador reiniciado." -ForegroundColor Green
