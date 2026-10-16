<#
.SYNOPSIS
    Script de instalación automática para android-emulator-opencode.
    Configura todo lo necesario para usar el emulador Android desde OpenCode.

.DESCRIPTION
    Este script:
      1. Verifica requisitos (Node.js, adb, emulator).
      2. Ejecuta npm install en el repositorio.
      3. Crea el archivo .env con tu AVD.
      4. Instala la skill de OpenCode en ~/.opencode/skills/.
      5. Verifica que todo funcione (npm run list-devices).

.NOTES
    Ejecutar en PowerShell: .\install.ps1
#>

[CmdletBinding()]
param(
    # Nombre del AVD a usar (si no se pasa, se detecta o se pregunta)
    [string]$AvdName,

    # Forzar reinstalación de dependencias aunque ya existan
    [switch]$Force,

    # No instalar la skill de OpenCode (solo configurar el repo)
    [switch]$NoSkill
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Instalando android-emulator-opencode ..."

# ---------------------------------------------------------------------------
# Utilidades de color
# ---------------------------------------------------------------------------
function Write-Title([string]$text) {
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "================================================================`n" -ForegroundColor Cyan
}

function Write-Ok([string]$text) {
    Write-Host "✅ $text" -ForegroundColor Green
}

function Write-Warn([string]$text) {
    Write-Host "⚠️  $text" -ForegroundColor Yellow
}

function Write-Err([string]$text) {
    Write-Host "❌ $text" -ForegroundColor Red
}

function Write-Info([string]$text) {
    Write-Host "ℹ️  $text" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Detectar ruta del repositorio (dónde está este script)
# ---------------------------------------------------------------------------
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $repoRoot) { $repoRoot = Get-Location }
Write-Info "Repositorio detectado: $repoRoot"

# ---------------------------------------------------------------------------
# 1. Verificar requisitos previos
# ---------------------------------------------------------------------------
Write-Title "PASO 1: Verificando requisitos previos"

# --- Node.js ---
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Err "Node.js no está instalado."
    Write-Info "Descárgalo desde https://nodejs.org/ e instálalo, luego vuelve a ejecutar este script."
    exit 1
}
Write-Ok "Node.js encontrado: $($node.Source)"

# --- npm ---
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-Err "npm no está disponible."
    exit 1
}
Write-Ok "npm encontrado"

# --- adb ---
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    Write-Warn "No se encontró 'adb' en el PATH."
    Write-Info "Instala Android SDK Platform-Tools y agrega la carpeta al PATH del sistema."
    Write-Info "Descarga: https://developer.android.com/studio/releases/platform-tools"
    Read-Host "Presiona Enter una vez que hayas agregado adb al PATH (o Ctrl+C para cancelar)"
    $adb = Get-Command adb -ErrorAction SilentlyContinue
    if (-not $adb) {
        Write-Err "Todavía no se encontró 'adb'. Abortando."
        exit 1
    }
}
Write-Ok "adb encontrado: $($adb.Source)"

# --- emulator ---
$emulator = Get-Command emulator -ErrorAction SilentlyContinue
if (-not $emulator) {
    Write-Warn "No se encontró 'emulator' en el PATH."
    Write-Info "Asegura de tener Android SDK Platform-Tools instalado y en el PATH."
    Read-Host "Presiona Enter una vez que lo hayas agregado (o Ctrl+C para cancelar)"
    $emulator = Get-Command emulator -ErrorAction SilentlyContinue
    if (-not $emulator) {
        Write-Err "Todavía no se encontró 'emulator'. Abortando."
        exit 1
    }
}
Write-Ok "emulator encontrado: $($emulator.Source)"

# ---------------------------------------------------------------------------
# 2. Instalar dependencias de Node.js
# ---------------------------------------------------------------------------
Write-Title "PASO 2: Instalando dependencias de Node.js"

Set-Location $repoRoot

if ($Force -or -not (Test-Path "node_modules")) {
    Write-Info "Ejecutando npm install ..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install falló."
        exit 1
    }
    Write-Ok "Dependencias instaladas."
} else {
    Write-Ok "node_modules ya existe. Saltando npm install (usa -Force para reinstalar)."
}

# ---------------------------------------------------------------------------
# 3. Detectar o pedir el AVD_NAME
# ---------------------------------------------------------------------------
Write-Title "PASO 3: Configurando el AVD (Android Virtual Device)"

$avds = & emulator -list-avds 2>$null
if ($LASTEXITCODE -ne 0 -or -not $avds) {
    Write-Err "No se pudieron listar los AVDs. ¿Creaste uno en Android Studio?"
    Write-Info "Abre Android Studio > Device Manager > Create Device y crea un emulador."
    exit 1
}

Write-Ok "AVDs disponibles:"
$avds | ForEach-Object { Write-Info "   - $_" }

if (-not $AvdName) {
    $envFile = Join-Path $repoRoot ".env"
    if (Test-Path $envFile) {
        $existing = Get-Content $envFile | Where-Object { $_ -match "^AVD_NAME=" }
        if ($existing) {
            $currentAvd = $existing -replace "^AVD_NAME=", ""
            Write-Info "AVD actual en .env: $currentAvd"
            $resp = Read-Host "¿Usar este AVD? (s/n) [s]"
            if ($resp -eq "n" -or $resp -eq "N") {
                $AvdName = Read-Host "Ingresa el nombre exacto del AVD"
            } else {
                $AvdName = $currentAvd
            }
        } else {
            $AvdName = Read-Host "Ingresa el nombre del AVD a usar"
        }
    } else {
        $AvdName = Read-Host "Ingresa el nombre del AVD a usar"
    }
}

if (-not $AvdName) {
    Write-Err "No se especificó ningún AVD."
    exit 1
}

# Verificar que el AVD exista
if ($avds -notcontains $AvdName) {
    Write-Warn "El AVD '$AvdName' no está en la lista de AVDs disponibles."
    $resp = Read-Host "¿Continuar de todas formas? (s/n) [n]"
    if ($resp -ne "s" -and $resp -ne "S") {
        exit 1
    }
}

Write-Ok "AVD seleccionado: $AvdName"

# ---------------------------------------------------------------------------
# 4. Crear .env
# ---------------------------------------------------------------------------
Write-Title "PASO 4: Creando archivo .env"

$envPath = Join-Path $repoRoot ".env"
$envExample = Join-Path $repoRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envPath
    } else {
        Set-Content -Path $envPath -Value "AVD_NAME=$AvdName"
    }
}

# Actualizar AVD_NAME en .env
$envContent = Get-Content $envPath -Raw
if ($envContent -match "(?m)^AVD_NAME=.*$") {
    $envContent = $envContent -replace "(?m)^AVD_NAME=.*$", "AVD_NAME=$AvdName"
} else {
    $envContent = $envContent + "`nAVD_NAME=$AvdName"
}
Set-Content -Path $envPath -Value $envContent

Write-Ok ".env configurado en: $envPath"
Write-Info "Contenido:"
Get-Content $envPath | ForEach-Object { Write-Info "   $_" }

# ---------------------------------------------------------------------------
# 5. Instalar skill de OpenCode
# ---------------------------------------------------------------------------
if (-not $NoSkill) {
    Write-Title "PASO 5: Instalando skill de OpenCode"

    $skillSource = Join-Path $repoRoot "skills\android-emulator.skill.md"
    $skillDestDir = Join-Path $env:USERPROFILE ".opencode\skills"
    $skillDest = Join-Path $skillDestDir "android-emulator.skill.md"

    if (-not (Test-Path $skillDestDir)) {
        New-Item -ItemType Directory -Path $skillDestDir -Force | Out-Null
        Write-Info "Directorio creado: $skillDestDir"
    }

    Copy-Item $skillSource $skillDest -Force
    Write-Ok "Skill instalada en: $skillDest"

    Write-Info "Reinicia OpenCode para que la skill esté disponible."
} else {
    Write-Info "Saltando instalación de skill (-NoSkill)."
}

# ---------------------------------------------------------------------------
# 6. Verificación final
# ---------------------------------------------------------------------------
Write-Title "PASO 6: Verificación final"

Write-Info "Ejecutando npm run list-devices ..."
try {
    $devices = & npm run list-devices 2>&1
    $devices | ForEach-Object { Write-Info "   $_" }
    Write-Ok "Verificación completada."
} catch {
    Write-Warn "No se pudo ejecutar list-devices. Asegura de tener un emulador iniciado."
}

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
Write-Title "INSTALACIÓN COMPLETADA"

Write-Ok "Repositorio: $repoRoot"
Write-Ok "AVD configurado: $AvdName"
Write-Ok "Archivo .env: $envPath"
if (-not $NoSkill) { Write-Ok "Skill de OpenCode: $skillDest" }

Write-Host "`n📋 Próximos pasos:`n" -ForegroundColor Cyan
Write-Info "1. Reinicia OpenCode."
Write-Info "2. Dile al agente en español, por ejemplo:"
Write-Info "     'Inicia el emulador $AvdName, instala mi APK y ejecuta la app.'"
Write-Info "3. Comandos disponibles:"
Write-Info "     npm run list-devices"
Write-Info "     npm run start-emulator"
Write-Info "     npm run install-apk -- <ruta-al-apk>"
Write-Info "     npm run run-app -- <paquete>"
Write-Info "     npm run screenshot"
Write-Info "     npm run view-emulator        (ver en tiempo real con scrcpy)"
Write-Info "     npm run simulate-conditions  (GPS, batería, red, etc.)"
Write-Info "     npm run visual-regression -- -Name <prueba>"
Write-Info "     npm run run-and-report-tests -- <paquete-de-pruebas>"
Write-Host "`n" -ForegroundColor Cyan
