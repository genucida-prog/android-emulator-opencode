# Limpia los datos de una aplicación (como "Limpiar almacenamiento" en Ajustes)
# Uso: pwsh scripts/clear-app-data.ps1 -PackageName "com.example.miapp" [-Serial "emulator-5554"]
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
    $PackageName = Read-Host "Nombre del paquete (ej. com.example.miapp)"
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Limpiando datos de '$PackageName' ..." -ForegroundColor Cyan
adb $adbArgs shell pm clear $PackageName

Write-Host "Datos limpiados." -ForegroundColor Green
