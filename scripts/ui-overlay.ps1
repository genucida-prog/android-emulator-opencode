# Genera código de overlay (botones flotantes) para añadir a tu proyecto Android.
# Permite agregar botones de prueba o acciones sobre la APK sin tocar los layouts originales.
# Uso: pwsh scripts/ui-overlay.ps1 -Package "com.example.miapp" -Out "ui-overlay-report.html"
param(
    [Parameter(Mandatory = $true)]
    [string]$Package,

    [string]$Out = "ui-overlay-report.html"
)

$ErrorActionPreference = "Stop"

$generatorPath = Join-Path $PSScriptRoot "..\src\ui-overlay-generator.js"

$nodeCode = @"
const { generateOverlayReport } = require('${generatorPath.replace(/'/g, "\\'")}');
const report = generateOverlayReport('${Out.replace(/'/g, "\\'")}', {
  packageName: '${Package}',
  buttons: [
    { id: 'btn_test', text: 'Probar', x: 20, y: 20, w: 100, h: 48, action: 'test' },
    { id: 'btn_log', text: 'Ver Logs', x: 140, y: 20, w: 100, h: 48, action: 'logs' },
    { id: 'btn_refresh', text: 'Refrescar', x: 260, y: 20, w: 100, h: 48, action: 'refresh' }
  ]
});
console.log('REPORT:' + report);
"@

Write-Host "Generando reporte de overlay para paquete '$Package' ..." -ForegroundColor Cyan
node -e $nodeCode

Write-Host "Reporte generado: $Out" -ForegroundColor Green
Write-Host "Abre ese archivo HTML para ver el código del overlay." -ForegroundColor Gray
