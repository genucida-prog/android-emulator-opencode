# Muestra la emulación de Android en tiempo real para que el usuario pueda verla.
# Intenta usar scrcpy (ideal). Si no está instalado, avisa y hace capturas periódicas como alternativa.
# Uso: pwsh scripts/view-emulator.ps1 [-Serial "emulator-5554"] [-IntervalSeconds 2]
param(
    [string]$Serial,
    [int]$IntervalSeconds = 2
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

# Verificar si el dispositivo está disponible
$state = adb $adbArgs get-state 2>$null
if ($state -ne "device") {
    Write-Error "El dispositivo no está listo (estado: $state). Inicia el emulador primero."
    exit 1
}

# Opción 1: scrcpy (mejor experiencia, pantalla en tiempo real)
$scrcpy = Get-Command scrcpy -ErrorAction SilentlyContinue
if ($scrcpy) {
    $scrcpyArgs = @()
    if ($Serial) { $scrcpyArgs += "-s", $Serial }
    Write-Host "Abriendo scrcpy para ver el emulador en tiempo real..." -ForegroundColor Cyan
    Write-Host "Presiona Ctrl+C para cerrar la visualización." -ForegroundColor Gray
    & scrcpy @scrcpyArgs
    exit 0
}

# Opción 2: alternativa sin scrcpy - capturas de pantalla periódicas
Write-Host "scrcpy no está instalado. Para ver la emulación en tiempo real, instala scrcpy:" -ForegroundColor Yellow
Write-Host "  winget install scrcpy" -ForegroundColor Gray
Write-Host "Mientras tanto, se mostrarán capturas cada $IntervalSeconds segundos.`n" -ForegroundColor Yellow

$counter = 1
while ($true) {
    $file = "view-emulator-$counter.png"
    try {
        adb $adbArgs exec-out screencap -p > $file
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Captura: $file" -ForegroundColor Cyan
    } catch {
        Write-Error "No se pudo capturar la pantalla."
    }
    $counter++
    Start-Sleep -Seconds $IntervalSeconds
}
