# 🚀 Instalación rápida en OpenCode

Ejecuta este comando en PowerShell (desde la carpeta del repositorio):

```powershell
cd "C:\Users\DJ-Ge\OneDrive\Documents\Proyecto predeterminado\android-emulator-opencode"
.\install.ps1
```

## Opciones del script

| Parámetro | Descripción |
|-----------|-------------|
| `-AvdName "Pixel_7"` | Especifica directamente el nombre del AVD (sin preguntar) |
| `-Force` | Fuerza la reinstalación de `node_modules` aunque ya existan |
| `-NoSkill` | No copia la skill a `~/.opencode/skills/` (solo configura el repo) |

### Ejemplos

```powershell
# Instalación interactiva (te preguntará el AVD)
.\install.ps1

# Con AVD definido directamente
.\install.ps1 -AvdName "Pixel_7"

# Forzar reinstalación de dependencias
.\install.ps1 -Force

# Solo configurar repo, no instalar skill de OpenCode
.\install.ps1 -NoSkill
```

## Qué hace el script

1. Verifica que tengas **Node.js**, `adb` y `emulator` instalados y en el PATH.
2. Ejecuta `npm install` para instalar las dependencias.
3. Detecta tu AVD (o te pide que lo elijas) y crea el archivo `.env`.
4. Copia la skill `android-emulator.skill.md` a `~/.opencode/skills/`.
5. Ejecuta `npm run list-devices` para verificar que todo funcione.

## Después de instalar

Reinicia OpenCode y pídele al agente en español:

> "Inicia el emulador Pixel_7, instala mi APK y ejecuta la app."

También puedes usar los comandos directamente en terminal:

```powershell
npm run list-devices
npm run start-emulator
npm run install-apk -- ..\mi-proyecto\app-release.apk
npm run run-app -- com.example.miproyecto
npm run screenshot
```

## Requisitos previos (instalar una sola vez)

- [Node.js](https://nodejs.org/)
- [Android SDK Platform-Tools](https://developer.android.com/studio/releases/platform-tools) (`adb`, `emulator` en el PATH)
- [Android Studio](https://developer.android.com/studio) (para crear el AVD)
- Opcional: [scrcpy](https://github.com/Genymobile/scrcpy) (`winget install scrcpy`) para ver el emulador en tiempo real
