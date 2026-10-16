# Descompila un APK con apktool para poder editar los layouts XML y recursos.
# Requiere: apktool instalado (https://ibotpeaches.github.io/Apktool/)
# Uso: pwsh scripts/decompile-apk.ps1 -Apk "ruta\app.apk" -Out "mi-app-descompilada"
param(
    [Parameter(Mandatory = $true)]
    [string]$Apk,

    [string]$Out = "app-descompilada"
)

$ErrorActionPreference = "Stop"

$apktool = Get-Command apktool -ErrorAction SilentlyContinue
if (-not $apktool) {
    Write-Error "No se encontró 'apktool'. Instálalo desde https://ibotpeaches.github.io/Apktool/"
    exit 1
}

if (-not (Test-Path $Apk)) {
    Write-Error "No se encontró el APK: $Apk"
    exit 1
}

Write-Host "Descompilando '$Apk' -> '$Out' ..." -ForegroundColor Cyan
apktool d "$Apk" -o "$Out" -f

Write-Host "Listo. Edita los archivos XML en: $Out\res\layout\" -ForegroundColor Green
Write-Host "Luego usa 'recompile-apk.ps1' para reconstruir el APK modificado." -ForegroundColor Gray
