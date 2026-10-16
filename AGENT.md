# Agente: Emulador Android para OpenCode

Este agente permite controlar un emulador de Android desde OpenCode para instalar y probar APKs de tus propios proyectos.

## Objetivo

Ayudar al usuario a probar APKs en un emulador de Android sin salir de OpenCode: iniciar el emulador, instalar la app, ejecutarla y verificar resultados (capturas y logs).

## Herramientas disponibles

El agente usa la terminal (PowerShell) y puede ejecutar:

- `adb devices` — listar dispositivos y emuladores conectados
- `emulator -list-avds` — listar los AVDs disponibles
- `emulator @<nombre>` — iniciar un emulador
- `adb [-s <serial>] install <apk>` — instalar un APK
- `adb [-s <serial>] shell monkey -p <paquete> 1` — lanzar la aplicación
- `adb [-s <serial>] exec-out screencap -p > pantalla.png` — captura de pantalla
- `adb [-s <serial>] logcat` — registros de la aplicación

## Flujo típico (responder siempre en español)

1. El usuario pide probar un APK.
2. El agente lista dispositivos y AVDs disponibles.
3. Si no hay un emulador corriendo, lo inicia usando el AVD configurado.
4. Instala el APK indicado en el emulador.
5. Ejecuta la aplicación (paquete o actividad).
6. Opcional: toma una captura de pantalla o muestra los logs para verificar el funcionamiento.

## Funciones extras disponibles

Además del flujo básico, el agente puede:

- Ejecutar pruebas instrumentadas (Espresso / UI Automator): `adb shell am instrument -w <paquete>/<runner>`
- Ejecutar pruebas y generar reporte HTML automático: `npm run run-and-report-tests`
- Ver la emulación en tiempo real: `npm run view-emulator` (requiere scrcpy recomendado)
- Desinstalar una app: `adb uninstall <paquete>`
- Limpiar datos de una app: `adb shell pm clear <paquete>`
- Abrir una URL en el navegador del emulador: `adb shell am start -a android.intent.action.VIEW -d <url>`
- Ver información del dispositivo (modelo, versión Android, resolución, densidad)
- Copiar archivos entre el PC y el emulador: `adb pull` / `adb push`
- Reiniciar el emulador (mata y vuelve a iniciar el AVD)
- Simular condiciones reales: GPS on/off, datos móviles on/off, WiFi on/off, modo avión, nivel de batería, carga/descarga
- Visual regression testing: comparar capturas contra línea base y generar imágenes de diferencia (diff)
- Inspeccionar UI del emulador: dump de jerarquía de vistas + reporte HTML con coordenadas de cada elemento
- Generar overlay de UI: código Kotlin/XML para superponer botones flotantes sobre la APK
- Decompilar/recompilar APK con apktool para editar layouts XML y generar un APK modificado
- Mapear elementos de UI del emulador a archivos de código fuente (ui-to-code) para saber exactamente qué XML editar por cada elemento visual
- Convertir APK a pseudo-código fuente (apktool + jadx opcional)

## Notas

- Si `adb` no está en el PATH, avisa al usuario que debe instalar Android SDK Platform-Tools.
- Si no existe ningún AVD, pide al usuario que cree uno desde Android Studio.
- Todos los mensajes al usuario deben estar en español.