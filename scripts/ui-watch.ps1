# Watcher automático: detecta cambios en los XML del APK descompilado
# y recompila + firma + instala automáticamente en el emulador.
# Requisitos: apktool, JDK (jarsigner), adb, emulador corriendo.
# Uso: pwsh scripts/ui-watch.ps1 -DecompiledDir "mi-app-source" -Output "app-modificada.apk" [-Serial "emulator-5554"] [-Package "com.example.miapp"]
param(
    [Parameter(Mandatory = $true)]
    [string]$DecompiledDir,

    [Parameter(Mandatory = $true)]
    [string]$Output,

    [string]$Serial,

    [string]$Package,

    [switch]$NoRestart,

    [int]$DebounceMs = 1000
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
$apktool = Get-Command apktool -ErrorAction SilentlyContinue
if (-not $adb -or -not $apktool) {
    Write-Error "Faltan requisitos: 'adb' y 'apktool' deben estar instalados y en el PATH."
    exit 1
}

if (-not (Test-Path $DecompiledDir)) {
    Write-Error "No se encontró la carpeta descompilada: $DecompiledDir"
    exit 1
}

# Instalar dependencias de Node si faltan
$nodeModules = Join-Path $PSScriptRoot "..\node_modules"
if (-not (Test-Path (Join-Path $nodeModules "adbkit"))) {
    Write-Host "Instalando dependencias de Node.js..." -ForegroundColor Cyan
    npm install
}

$watcherPath = Join-Path $PSScriptRoot "..\src\ui-watcher.js"

$autoRestart = -not $NoRestart

$nodeCode = @"
const { startWatch } = require('${watcherPath.replace(/'/g, "\\'")}');
(async () => {
  await startWatch({
    decompiledDir: '${DecompiledDir.replace(/'/g, "\\'")}',
    outputApk: '${Output.replace(/'/g, "\\'")}',
    serial: '${Serial}',
    packageName: '${Package}',
    autoRestart: ${autoRestart},
    debounceMs: ${DebounceMs},
  });
})().catch(e => { console.error(e); process.exit(1); });
"@

Write-Host "👀 Iniciando watcher automático de UI ..." -ForegroundColor Cyan
Write-Host "Carpeta: $DecompiledDir" -ForegroundColor Gray
Write-Host "Salida:  $Output" -ForegroundColor Gray
if ($Serial) { Write-Host "Serial:  $Serial" -ForegroundColor Gray }
if ($Package) { Write-Host "Paquete: $Package (se reiniciará tras instalar)" -ForegroundColor Gray }
Write-Host "Presiona Ctrl+C para detener.`n" -ForegroundColor Gray

node -e $nodeCode
