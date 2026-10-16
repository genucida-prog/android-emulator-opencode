# UI Inspector: inspecciona la jerarquía de vistas del emulador y genera un reporte visual HTML.
# Úsalo para ver qué botones, textos y coordenadas tiene la APK antes de editarla.
# Uso: pwsh scripts/ui-inspector.ps1 [-Serial "emulator-5554"] [-Out "ui-report.html"]
param(
    [string]$Serial,
    [string]$Out = "ui-inspection-report.html"
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

# Verificar dispositivo
$state = adb $adbArgs get-state 2>$null
if ($state -ne "device") {
    Write-Error "El dispositivo no está listo (estado: $state). Inicia el emulador primero."
    exit 1
}

# Instalar dependencias de Node si faltan
$nodeModules = Join-Path $PSScriptRoot "..\node_modules"
if (-not (Test-Path (Join-Path $nodeModules "adbkit"))) {
    Write-Host "Instalando dependencias de Node.js (adbkit)..." -ForegroundColor Cyan
    npm install
}

$inspectorPath = Join-Path $PSScriptRoot "..\src\ui-inspector.js"
$screenshotPath = Join-Path $PSScriptRoot "..\ui-screenshot.png"

Write-Host "Capturando pantalla y dumpando jerarquía de vistas ..." -ForegroundColor Cyan

$nodeCode = @"
const { dumpHierarchy, captureScreen, parseHierarchy, generateInspectorReport } = require('${inspectorPath.replace(/'/g, "\\'")}');
(async () => {
  const serial = '${Serial}';
  const screenshot = await captureScreen(serial, '${screenshotPath.replace(/'/g, "\\'")}');
  const xml = await dumpHierarchy(serial);
  const nodes = parseHierarchy(xml);
  const report = generateInspectorReport(screenshot, nodes, '${Out.replace(/'/g, "\\'")}');
  console.log('REPORT:' + report);
  console.log('SCREENSHOT:' + screenshot);
  console.log('NODES:' + nodes.length);
  console.log('INTERACTIVE:' + nodes.filter(n => n.interactive).length);
})().catch(e => { console.error(e); process.exit(1); });
"@

$nodeResult = node -e $nodeCode

foreach ($line in $nodeResult) {
    if ($line -match "^REPORT:(.+)$") {
        Write-Host "Reporte HTML generado: $($matches[1])" -ForegroundColor Green
    }
    if ($line -match "^SCREENSHOT:(.+)$") {
        Write-Host "Captura guardada: $($matches[1])" -ForegroundColor Gray
    }
    if ($line -match "^NODES:(\d+)$") {
        Write-Host "Elementos detectados: $($matches[1])" -ForegroundColor Cyan
    }
    if ($line -match "^INTERACTIVE:(\d+)$") {
        Write-Host "Elementos interactivos: $($matches[1])" -ForegroundColor Cyan
    }
}

Write-Host "Listo. Abre el archivo HTML en tu navegador para inspeccionar la UI." -ForegroundColor Green
