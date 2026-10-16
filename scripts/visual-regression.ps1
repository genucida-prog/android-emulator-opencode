# Visual regression testing: compara una captura del emulador contra una línea base.
# Primera ejecución: crea la baseline. Ejecuciones siguientes: reporta diferencias y genera diff.
# Uso: pwsh scripts/visual-regression.ps1 -Name "login_pantalla" [-Serial "emulator-5554"]
param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [string]$Serial,

    [string]$BaselineDir = "visual-baseline",
    [string]$DiffDir = "visual-diffs",
    [string]$OutputDir = "visual-captures",
    [string]$ReportDir = "visual-reports"
)

$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Error "No se encontró 'adb'. Instala Android SDK Platform-Tools y agregalo al PATH."
    exit 1
}

# Instalar dependencias de Node si faltan
$nodeModules = Join-Path $PSScriptRoot "..\node_modules"
if (-not (Test-Path (Join-Path $nodeModules "pngjs")) -or -not (Test-Path (Join-Path $nodeModules "pixelmatch"))) {
    Write-Host "Instalando dependencias para comparación de imágenes (pngjs, pixelmatch)..." -ForegroundColor Cyan
    npm install pngjs pixelmatch --save
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

# Verificar dispositivo
$state = adb $adbArgs get-state 2>$null
if ($state -ne "device") {
    Write-Error "El dispositivo no está listo (estado: $state). Inicia el emulador primero."
    exit 1
}

foreach ($dir in @($BaselineDir, $DiffDir, $OutputDir, $ReportDir)) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

$generatorPath = Join-Path $PSScriptRoot "..\src\visual-regression.js"
$reportPath = Join-Path $ReportDir "report-$Name.html"

$nodeCode = @"
const { captureAndCompare, generateVisualReport } = require('${generatorPath.replace(/'/g, "\\'")}');
(async () => {
  const result = await captureAndCompare('${Serial}', '${Name}', {
    baselineDir: '${BaselineDir.replace(/'/g, "\\'")}',
    diffDir: '${DiffDir.replace(/'/g, "\\'")}',
    outputDir: '${OutputDir.replace(/'/g, "\\'")}',
  });
  const report = generateVisualReport([result], '${reportPath.replace(/'/g, "\\'")}');
  console.log('RESULT_JSON:' + JSON.stringify({
    status: result.result.status,
    baseline: result.paths.baseline,
    current: result.paths.current,
    diff: result.paths.diff,
    report: report,
    message: result.result.message || ''
  }));
})().catch(e => { console.error(e); process.exit(1); });
"@

Write-Host "Capturando pantalla y comparando contra baseline '$Name' ..." -ForegroundColor Cyan
$nodeResult = node -e $nodeCode

foreach ($line in $nodeResult) {
    if ($line -match "^RESULT_JSON:(.+)$") {
        $data = $matches[1] | ConvertFrom-Json
        Write-Host "Estado: $($data.status)" -ForegroundColor Cyan
        if ($data.message) { Write-Host "$($data.message)" -ForegroundColor Gray }
        if ($data.diff) { Write-Host "Imagen de diferencia: $($data.diff)" -ForegroundColor Green }
        Write-Host "Reporte HTML: $($data.report)" -ForegroundColor Green
        Write-Host "Captura actual: $($data.current)" -ForegroundColor Gray
    }
}

Write-Host "Visual regression finalizado." -ForegroundColor Green
