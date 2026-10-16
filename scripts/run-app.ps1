# Lanza una aplicación instalada en el emulador
# Uso: pwsh scripts/run-app.ps1 -PackageName "com.example.miapp" [-Serial "emulator-5554"]
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
    $PackageName = Read-Host "Nombre del paquete de la app (ej. com.example.miapp)"
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Ejecutando la app '$PackageName' ..." -ForegroundColor Cyan
# Monkey lanza la actividad principal del paquete
adb $adbArgs shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1

Write-Host "App lanzada." -ForegroundColor Green
