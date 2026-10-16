# Ejecuta pruebas instrumentadas (Espresso / UI Automator) en el emulador
# Uso: pwsh scripts/run-instrumented-tests.ps1 -TestPackage "com.example.miapp.test" [-Serial "emulator-5554"] [-Runner "androidx.test.runner.AndroidJUnitRunner"]
param(
    [Parameter(Mandatory = $false)]
    [string]$TestPackage,

    [string]$Serial,

    [string]$Runner = "androidx.test.runner.AndroidJUnitRunner"
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

if (-not $TestPackage) {
    $TestPackage = Read-Host "Paquete de pruebas instrumentadas (ej. com.example.miapp.test)"
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

Write-Host "Ejecutando pruebas instrumentadas '$TestPackage' ..." -ForegroundColor Cyan
adb $adbArgs shell am instrument -w -r $TestPackage/$Runner

Write-Host "Pruebas finalizadas." -ForegroundColor Green
