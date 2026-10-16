# Mapea elementos de UI del emulador a archivos de código del APK descompilado.
# Te dice exactamente qué archivo XML editar para cada botón/texto que ves en pantalla.
# Requisitos: haber descompilado el APK previamente con apktool.
# Uso: pwsh scripts/ui-to-code.ps1 -Apk "ruta\app.apk" -DecompiledDir "app-descompilada" [-Serial "emulator-5554"]
param(
    [Parameter(Mandatory = $true)]
    [string]$Apk,

    [string]$DecompiledDir = "app-descompilada",

    [string]$Serial,

    [string]$Out = "ui-to-code-report.html"
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

# Verificar que exista la carpeta descompilada
if (-not (Test-Path $DecompiledDir)) {
    Write-Error "No se encontró la carpeta descompilada: $DecompiledDir"
    Write-Info "Ejecuta primero: npm run decompile-apk -- -Apk $Apk"
    exit 1
}

$layoutDir = Join-Path $DecompiledDir "res\layout"
if (-not (Test-Path $layoutDir)) {
    Write-Warn "No se encontró res/layout en $DecompiledDir. ¿Está bien descompilado?"
}

# Instalar dependencias de Node si faltan
$nodeModules = Join-Path $PSScriptRoot "..\node_modules"
if (-not (Test-Path (Join-Path $nodeModules "adbkit"))) {
    Write-Host "Instalando dependencias de Node.js (adbkit)..." -ForegroundColor Cyan
    npm install
}

$mapperPath = Join-Path $PSScriptRoot "..\src\ui-to-code-mapper.js"
$inspectorPath = Join-Path $PSScriptRoot "..\src\ui-inspector.js"

Write-Host "Capturando jerarquía de vistas del emulador ..." -ForegroundColor Cyan

$nodeCode = @"
const { dumpHierarchy, parseHierarchy } = require('${inspectorPath.replace(/'/g, "\\'")}');
const { indexLayoutXml, parseHierarchyWithIds, generateMappingReport } = require('${mapperPath.replace(/'/g, "\\'")}');
const fs = require('fs');
const path = require('path');

(async () => {
  const serial = '${Serial}';
  const xml = await dumpHierarchy(serial);
  const nodes = parseHierarchyWithIds(xml);

  const layoutDir = '${layoutDir.replace(/'/g, "\\'")}';
  const layoutIndex = indexLayoutXml(layoutDir);

  const apkName = path.basename('${Apk}');
  const report = generateMappingReport(nodes, layoutIndex, apkName, '${Out.replace(/'/g, "\\'")}');

  console.log('REPORT:' + report);
  console.log('NODES:' + nodes.length);
  console.log('MAPPED:' + nodes.filter(n => layoutIndex['@id/' + n.id]).length);
})().catch(e => { console.error(e); process.exit(1); });
"@

$nodeResult = node -e $nodeCode

foreach ($line in $nodeResult) {
    if ($line -match "^REPORT:(.+)$") {
        Write-Host "Reporte HTML generado: $($matches[1])" -ForegroundColor Green
    }
    if ($line -match "^NODES:(\d+)$") {
        Write-Host "Elementos en UI: $($matches[1])" -ForegroundColor Cyan
    }
    if ($line -match "^MAPPED:(\d+)$") {
        Write-Host "Mapeados a código: $($matches[1])" -ForegroundColor Cyan
    }
}

Write-Host "Abre el archivo HTML para ver qué archivo editar por cada elemento." -ForegroundColor Gray
