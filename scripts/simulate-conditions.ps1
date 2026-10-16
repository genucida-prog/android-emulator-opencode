# Simula condiciones reales en el emulador/dispositivo Android.
# Permite probar la app bajo diferentes escenarios de red, ubicación y batería.
# Uso ejemplos:
#   pwsh scripts/simulate-conditions.ps1 -GpsOn
#   pwsh scripts/simulate-conditions.ps1 -DataOff -WifiOff
#   pwsh scripts/simulate-conditions.ps1 -BatteryLevel 15 -BatteryDischarging
#   pwsh scripts/simulate-conditions.ps1 -Serial emulator-5554 -GpsOff -DataOn
param(
    [string]$Serial,

    [switch]$GpsOn,
    [switch]$GpsOff,

    [switch]$AirplaneOn,
    [switch]$AirplaneOff,

    [switch]$DataOn,
    [switch]$DataOff,

    [switch]$WifiOn,
    [switch]$WifiOff,

    [int]$BatteryLevel,

    [switch]$BatteryCharging,
    [switch]$BatteryDischarging,

    [switch]$ResetBattery
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

function Run-Adb($cmd) {
    Write-Host "[adb] $cmd" -ForegroundColor Gray
    $result = adb $adbArgs $cmd 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Comando falló: $cmd"
    }
    return $result
}

# Verificar dispositivo
$state = adb $adbArgs get-state 2>$null
if ($state -ne "device") {
    Write-Error "El dispositivo no está listo (estado: $state). Inicia el emulador primero."
    exit 1
}

Write-Host "Aplicando condiciones en '$Serial' ..." -ForegroundColor Cyan

# GPS
if ($GpsOn) {
    Run-Adb "shell settings put secure location_providers_allowed +gps"
    Write-Host "GPS: ACTIVADO" -ForegroundColor Green
}
if ($GpsOff) {
    Run-Adb "shell settings put secure location_providers_allowed -gps"
    Write-Host "GPS: DESACTIVADO" -ForegroundColor Yellow
}

# Datos móviles
if ($DataOn) {
    Run-Adb "shell svc data enable"
    Write-Host "Datos móviles: ACTIVADOS" -ForegroundColor Green
}
if ($DataOff) {
    Run-Adb "shell svc data disable"
    Write-Host "Datos móviles: DESACTIVADOS" -ForegroundColor Yellow
}

# WiFi
if ($WifiOn) {
    Run-Adb "shell svc wifi enable"
    Write-Host "WiFi: ACTIVADO" -ForegroundColor Green
}
if ($WifiOff) {
    Run-Adb "shell svc wifi disable"
    Write-Host "WiFi: DESACTIVADO" -ForegroundColor Yellow
}

# Modo avión (puede requerir root en algunas versiones de Android)
if ($AirplaneOn) {
    Run-Adb "shell settings put global airplane_mode_on 1"
    Run-Adb "shell am broadcast -a android.intent.action.AIRPLANE_MODE"
    Write-Host "Modo avión: ACTIVADO (puede requerir root en Android 10+)" -ForegroundColor Yellow
}
if ($AirplaneOff) {
    Run-Adb "shell settings put global airplane_mode_on 0"
    Run-Adb "shell am broadcast -a android.intent.action.AIRPLANE_MODE"
    Write-Host "Modo avión: DESACTIVADO" -ForegroundColor Green
}

# Batería
if ($ResetBattery) {
    Run-Adb "shell dumpsys battery reset"
    Write-Host "Batería: restablecida al estado real" -ForegroundColor Green
}
if ($BatteryLevel -gt 0) {
    Run-Adb "shell dumpsys battery unplug"
    Run-Adb "shell dumpsys battery set level $BatteryLevel"
    Write-Host "Batería: nivel establecido a $BatteryLevel%" -ForegroundColor Green
}
if ($BatteryCharging) {
    Run-Adb "shell dumpsys battery set status 1"
    Write-Host "Batería: cargando" -ForegroundColor Green
}
if ($BatteryDischarging) {
    Run-Adb "shell dumpsys battery set status 2"
    Write-Host "Batería: descargando" -ForegroundColor Green
}

if (-not ($GpsOn -or $GpsOff -or $AirplaneOn -or $AirplaneOff -or $DataOn -or $DataOff -or $WifiOn -or $WifiOff -or $BatteryLevel -or $BatteryCharging -or $BatteryDischarging -or $ResetBattery)) {
    Write-Host "No se especificó ninguna condición. Ejemplos de uso:`n" -ForegroundColor Yellow
    Get-Content $PSCommandPath | Select-Object -First 12
}

Write-Host "Listo." -ForegroundColor Green
