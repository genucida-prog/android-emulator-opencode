# Extensión de OpenCode: Android Emulator

Extensión instalable para OpenCode que permite controlar un emulador de Android y probar los APK de tus proyectos directamente desde el agente.

## Instalación

Desde la carpeta del repositorio:

```bash
cd extension
npm install
```

Luego instala la extensión en tu OpenCode. La forma depende de tu versión de OpenCode, por ejemplo:

```bash
opencode extension install .
# o, si OpenCode soporta rutas locales:
opencode extension install C:\ruta\a\android-emulator-opencode\extension
```

Si tu versión de OpenCode no tiene comando de extensión, copia la carpeta `extension/` en el directorio de extensiones de OpenCode y reinicia la aplicación.

## Configuración

Crea un archivo `.env` en la raíz del repositorio (o define la variable de entorno):

```
AVD_NAME=Pixel_7
```

Asegúrate de que `adb` y `emulator` estén en el `PATH` del sistema (Android SDK Platform-Tools).

## Herramientas expuestas

| Herramienta | Descripción |
|-------------|-------------|
| `android_list_devices` | Lista dispositivos y emuladores conectados |
| `android_start_emulator` | Inicia el emulador configurado en `AVD_NAME` |
| `android_install_apk` | Instala un APK (`serial`, `apkPath`) |
| `android_run_app` | Ejecuta una app instalada (`serial`, `packageName`) |
| `android_run_tests` | Ejecuta pruebas instrumentadas Espresso/UI Automator |
| `android_screenshot` | Captura pantalla del emulador |
| `android_logcat` | Muestra registros del emulador |
| `android_uninstall_app` | Desinstala una app |
| `android_clear_app_data` | Limpia datos de una app |
| `android_open_url` | Abre una URL en el navegador del emulador |
| `android_device_info` | Información del dispositivo (modelo, versión, resolución) |
| `android_pull_file` | Copia archivo del emulador al PC |
| `android_push_file` | Copia archivo del PC al emulador |
| `android_restart_emulator` | Reinicia el emulador |

## Uso desde OpenCode

Una vez instalada la extensión, puedes pedirle al agente en español:

> "Inicia el emulador Pixel_7, instala mi APK, ejecuta las pruebas instrumentadas y toma una captura de pantalla."

## Requisitos

- Android SDK Platform-Tools (`adb`, `emulator` en el PATH)
- Al menos un AVD creado en Android Studio
- Node.js (para la extensión)
