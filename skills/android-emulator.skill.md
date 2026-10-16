---
name: android-emulator
description: Controla un emulador de Android para instalar y probar APKs desde OpenCode
---

# Skill: Emulador Android

Permite a OpenCode manejar un emulador de Android y probar los APK de tus proyectos.

## Comandos que el agente puede ejecutar

- `listar dispositivos` → `npm run list-devices`
- `iniciar emulador` → `npm run start-emulator` (abre la ventana del emulador)
- `ver emulador en tiempo real` → `npm run view-emulator` (usa scrcpy si está instalado, si no hace capturas periódicas)
- `instalar APK <ruta>` → `npm run install-apk -- <ruta>`
- `ejecutar app <paquete>` → `npm run run-app -- <paquete>`
- `ejecutar pruebas <paquete de pruebas>` → `npm run run-tests -- <paquete>`
- `ejecutar pruebas y generar reporte HTML` → `npm run run-and-report-tests -- <paquete>`
- `capturar pantalla` → `npm run screenshot`
- `ver logs [paquete]` → `npm run logcat`
- `desinstalar app <paquete>` → `npm run uninstall-app -- <paquete>`
- `limpiar datos app <paquete>` → `npm run clear-app-data -- <paquete>`
- `abrir url <url>` → `npm run open-url -- <url>`
- `info dispositivo` → `npm run device-info`
- `copiar del emulador <remoto> <local>` → `npm run pull-file -- <remoto> <local>`
- `copiar al emulador <local> <remoto>` → `npm run push-file -- <local> <remoto>`
- `reiniciar emulador` → `npm run restart-emulator`
- `simular condiciones <opción>` → `npm run simulate-conditions` (GPS, datos, WiFi, batería, modo avión)
- `visual regression <nombre>` → `npm run visual-regression -- -Name <nombre>` (compara capturas contra baseline)
- `inspeccionar UI` → `npm run ui-inspector` (captura pantalla y dumpa jerarquía de vistas con coordenadas)
- `generar overlay UI` → `npm run ui-overlay -- -Package com.example.app` (código para botones flotantes sobre la app)
- `descompilar APK` → `npm run decompile-apk -- -Apk ruta/app.apk` (edita layouts XML con apktool)
- `recompilar APK` → `npm run recompile-apk -- -Folder carpeta -Out salida.apk` (reconstruye y firma el APK modificado)
- `APK a código fuente` → `npm run apk-to-source -- -Apk ruta/app.apk` (descompila layouts y pseudo-código)
- `UI a código` → `npm run ui-to-code -- -Apk ruta/app.apk -DecompiledDir carpeta` (mapea elementos de pantalla a archivos XML)
- `Watch automático` → `npm run ui-watch -- -DecompiledDir carpeta -Output salida.apk` (recompila e instala al guardar cambios)

## Ver la emulación en tiempo real

Para que el usuario pueda ver el emulador mientras se prueban las APK:

1. **Recomendado:** instala [scrcpy](https://github.com/Genymobile/scrcpy) (`winget install scrcpy` en Windows) y usa `npm run view-emulator`. Se abrirá la pantalla del emulador en tiempo real en tu PC.
2. **Alternativa:** `npm run view-emulator` sin scrcpy hace capturas de pantalla cada 2 segundos para que puedas ir viendo el estado.

## Reporte HTML de pruebas

Después de ejecutar `npm run run-and-report-tests`, se genera un archivo HTML en `test-reports/report-<fecha>.html` con el resumen, casos pasados/fallidos y detalles de errores. Puedes abrirlo en el navegador.

## Requisitos previos

1. Android SDK Platform-Tools instalado y `adb` en el PATH.
2. Al menos un AVD creado en Android Studio.
3. Copiar `.env.example` a `.env` y definir `AVD_NAME`.

## Ejemplo de conversación

Usuario: "Quiero probar mi APK en el emulador"

Agente:
1. `npm run list-devices` — verifica que haya un emulador disponible.
2. `npm run start-emulator` — inicia el emulador si no está encendido.
3. `npm run install-apk -- ../proyecto/app-release.apk` — instala la app.
4. `npm run run-app -- com.example.proyecto` — abre la app.
5. `npm run screenshot` — toma una captura para verificar.

Todos los mensajes al usuario en español.
