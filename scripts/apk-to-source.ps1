# Descompila un APK lo más cerca posible a "código fuente".
# Usa apktool (resources + XML de layouts) y, si está disponible, jadx (Java pseudo-código).
# Requisitos: apktool instalado. Opcional: jadx.
# Uso: pwsh scripts/apk-to-source.ps1 -Apk "ruta\app.apk" -Out "app-source"
param(
    [Parameter(Mandatory = $true)]
    [string]$Apk,

    [string]$Out = "app-source"
)

$ErrorActionPreference = "Stop"

function Write-Ok([string]$text) { Write-Host "✅ $text" -ForegroundColor Green }
function Write-Warn([string]$text) { Write-Host "⚠️  $text" -ForegroundColor Yellow }

if (-not (Test-Path $Apk)) {
    Write-Error "No se encontró el APK: $Apk"
    exit 1
}

$apktool = Get-Command apktool -ErrorAction SilentlyContinue
if (-not $apktool) {
    Write-Error "No se encontró 'apktool'. Instálalo desde https://ibotpeaches.github.io/Apktool/"
    exit 1
}

if (-not (Test-Path $Out)) {
    New-Item -ItemType Directory -Path $Out -Force | Out-Null
}

# 1. Descompilar con apktool (resources + layouts XML)
Write-Host "Descompilando recursos y layouts con apktool ..." -ForegroundColor Cyan
apktool d "$Apk" -o "$Out" -f
if ($LASTEXITCODE -ne 0) {
    Write-Error "apktool falló."
    exit 1
}
Write-Ok "Recursos y layouts descompilados en: $Out"

# 2. Intentar jadx para pseudo-código Java/Kotlin
$jadx = Get-Command jadx -ErrorAction SilentlyContinue
if ($jadx) {
    Write-Host "Decompilando a Java/Kotlin pseudo-código con jadx ..." -ForegroundColor Cyan
    jadx -d "$Out\jadx-source" "$Apk" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Pseudo-código generado en: $Out\jadx-source"
    } else {
        Write-Warn "jadx falló, pero apktool sí funcionó."
    }
} else {
    Write-Warn "jadx no está instalado. Solo se obtuvieron recursos y layouts (apktool)."
    Write-Info "Instala jadx para obtener pseudo-código Java/Kotlin: https://github.com/skylot/jadx"
}

Write-Host "`nListo. Estructura:`n" -ForegroundColor Cyan
Write-Host "  $Out\res\layout\          ← XML de pantallas (edita aquí para mover botones)"
Write-Host "  $Out\res\values\          ← Colores, strings, dimensiones"
Write-Host "  $Out\jadx-source\         ← Pseudo-código Java/Kotlin (si instalaste jadx)"
Write-Host "`nLuego usa: npm run ui-to-code -- -Apk $Apk -DecompiledDir $Out" -ForegroundColor Gray
