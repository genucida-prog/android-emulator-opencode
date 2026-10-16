# Ejecuta pruebas instrumentadas y genera automáticamente un reporte HTML.
# Requiere: npm install xml2js (para el generador de reportes)
# Uso: pwsh scripts/run-and-report-tests.ps1 -TestPackage "com.example.miapp.test" [-Serial "emulator-5554"] [-Runner "androidx.test.runner.AndroidJUnitRunner"]
param(
    [Parameter(Mandatory = $false)]
    [string]$TestPackage,

    [string]$Serial,

    [string]$Runner = "androidx.test.runner.AndroidJUnitRunner",

    [string]$ReportDir = "test-reports"
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

if (-not (Get-Module -ListAvailable -Name xml2js)) {
    Write-Host "Instalando dependencia xml2js para generar el reporte HTML..." -ForegroundColor Cyan
    npm install xml2js --save
}

$adbArgs = @()
if ($Serial) { $adbArgs += "-s", $Serial }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$rawOutput = "$ReportDir/raw-output-$timestamp.txt"
$reportHtml = "$ReportDir/report-$timestamp.html"

if (-not (Test-Path $ReportDir)) {
    New-Item -ItemType Directory -Path $ReportDir | Out-Null
}

Write-Host "Ejecutando pruebas instrumentadas '$TestPackage' ..." -ForegroundColor Cyan
$results = adb $adbArgs shell am instrument -w -r "$TestPackage/$Runner" 2>&1
$results | Tee-Object -FilePath $rawOutput

Write-Host "Guardando salida cruda en: $rawOutput" -ForegroundColor Green

# Generar reporte HTML con Node.js
$generatorPath = Join-Path $PSScriptRoot "..\src\test-report-generator.js"
$metadata = @{
    serial = $Serial
    testPackage = $TestPackage
    runner = $Runner
    date = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}
$metadataJson = ($metadata | ConvertTo-Json -Compress)

$nodeCode = @"
const { generateTestReport } = require('${generatorPath.replace(/'/g, "\\'")}');
(async () => {
  const fs = require('fs');
  const raw = fs.readFileSync('${rawOutput.replace(/'/g, "\\'")}', 'utf8');
  const meta = ${metadataJson};
  const result = await generateTestReport({
    rawText: raw,
    output: '${reportHtml.replace(/'/g, "\\'")}',
    metadata: meta
  });
  console.log('REPORTE_HTML:' + result.htmlPath);
  console.log('RESULTADOS_JSON:' + JSON.stringify(result.summary));
})().catch(e => { console.error(e); process.exit(1); });
"@

Write-Host "Generando reporte HTML ..." -ForegroundColor Cyan
$nodeResult = node -e $nodeCode

foreach ($line in $nodeResult) {
    if ($line -match "^REPORTE_HTML:(.+)$") {
        $htmlPath = $matches[1]
        Write-Host "Reporte HTML generado: $htmlPath" -ForegroundColor Green
    }
    if ($line -match "^RESULTADOS_JSON:(.+)$") {
        $summary = $matches[1] | ConvertFrom-Json
        Write-Host "Total: $($summary.total) | Pasadas: $($summary.passed) | Fallidas: $($summary.failed) | Errores: $($summary.errors)" -ForegroundColor Cyan
    }
}

Write-Host "Pruebas finalizadas." -ForegroundColor Green
