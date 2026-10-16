# Emulador Android para OpenCode

Repositorio que permite usar un **emulador de Android desde OpenCode** para instalar y probar los **APK de tus propios proyectos**.

## ¿Qué hace?

Expone un agente de OpenCode que puede controlar un emulador de Android y ejecutar acciones como:

- Listar dispositivos y emuladores conectados (`adb devices`)
- Iniciar un emulador de Android (AVD)
- Instalar un APK en el emulador
- Ejecutar la aplicación instalada
- Tomar capturas de pantalla del emulador
- Ver los registros (logcat) de la aplicación

Todo desde lenguaje natural, sin tocar comandos manuales.

## Requisitos

- **Android Studio** o las **Android SDK Platform-Tools** (incluye `adb` y `emulator`)
- Un **dispositivo virtual (AVD)** creado en Android Studio
- **Node.js** (para el controlador opcional en JavaScript)
- **Windows PowerShell** (los scripts están en `.ps1`)
- Agrega las Platform-Tools al `PATH` del sistema para que `adb` y `emulator` estén disponibles.

## Instalación

```bash
git clone <este-repositorio>
cd android-emulator-opencode
npm install
```

Copia el archivo `.env.example` a `.env` y configura el nombre de tu AVD:

```
AVD_NAME=Pixel_7
```

## Uso con OpenCode

Copia la carpeta `skills/` en tu configuración de OpenCode (por ejemplo `~/.opencode/skills/`) o apunta a este repositorio desde tu agente. Luego dale instrucciones en español:

```
"Inicia el emulador Pixel_7"
"Lista los dispositivos conectados"
"Instala el APK ../mi-proyecto/app-release.apk"
"Ejecuta la app com.example.miapp"
"Toma una captura de pantalla"
"Muestra los logs de la aplicación"
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run list-devices` | Lista emuladores y dispositivos conectados |
| `npm run start-emulator` | Inicia el emulador definido en `.env` |
| `npm run install-apk -- ruta/app.apk` | Instala un APK en el emulador |
| `npm run run-app -- com.example.app` | Lanza la aplicación |
| `npm run view-emulator` | Ver la emulación en tiempo real (scrcpy o capturas) |
| `npm run screenshot` | Captura la pantalla del emulador (`screenshot.png`) |
| `npm run logcat` | Muestra los registros en tiempo real |
| `npm run run-and-report-tests -- com.example.test` | Ejecuta pruebas y genera reporte HTML |

## Ejemplo de uso

```bash
# 1. Lista los dispositivos/emuladores
npm run list-devices

# 2. Inicia el emulador
npm run start-emulator

# 3. Instala tu APK
npm run install-apk -- ../mi-proyecto/app-release.apk

# 4. Ejecuta la app
npm run run-app -- com.example.miproyecto

# 5. Captura pantalla
npm run screenshot
```

## Archivos clave

- `AGENT.md` — instrucciones del agente de OpenCode
- `skills/android-emulator.skill.md` — definición de la skill para OpenCode
- `src/emulator-controller.js` — controlador en Node.js con `adbkit`
- `src/test-report-generator.js` — generador de reportes HTML de pruebas
- `scripts/*.ps1` — scripts de PowerShell que envuelven `adb`
- `.github/workflows/android-emulator.yml` — CI/CD con GitHub Actions
- `.env.example` — configuración de ejemplo del AVD

## Ver la emulación en tiempo real

Instala [scrcpy](https://github.com/Genymobile/scrcpy) (`winget install scrcpy` en Windows) y ejecuta:

```bash
npm run view-emulator
```

Se abrirá la pantalla del emulador en tu PC para que puedas verlo mientras pruebas tus APK. Si no tienes scrcpy, el script hará capturas periódicas como alternativa.

## Reporte HTML de pruebas

```bash
npm run run-and-report-tests -- com.example.miapp.test
```

Se genera `test-reports/report-<fecha>.html` con el resumen (pasadas/fallidas/errores) y el detalle de cada caso. Ábrelo en el navegador.

## Simular condiciones reales

Prueba tu app bajo distintos escenarios sin salir del emulador:

```bash
# Activar GPS y datos móviles
npm run simulate-conditions -GpsOn -DataOn

# Modo avión y batería baja (15%)
npm run simulate-conditions -AirplaneOn -BatteryLevel 15 -BatteryDischarging

# Sin WiFi ni datos
npm run simulate-conditions -WifiOff -DataOff
```

Nota: el modo avión puede requerir root en Android 10+. Los demás comandos no requieren root.

## 🎨 Editar la UI de la APK

> ⚠️ **Importante:** Un APK es un binario compilado. No se pueden mover botones "en vivo" como en una web. Tienes tres caminos:

### Opción A: Inspeccionar la UI (sin modificar el APK)
Ve qué elementos hay, sus coordenadas y qué son clicables:

```bash
npm run ui-inspector
```

Esto genera `ui-inspection-report.html` con una captura del emulador y cajas de colores sobre cada botón/texto detectado. Úsalo para saber qué quieres mover.

### Opción B: Añadir botones flotantes (overlay)
Si no tienes el código fuente, puedes superponer una capa con botones extra sobre la app:

```bash
npm run ui-overlay -- -Package com.example.miproyecto
```

Genera un reporte HTML con código Kotlin/XML para un overlay flotante (`SYSTEM_ALERT_WINDOW`). Úsalo para añadir botones de prueba, acciones rápidas o paneles de control sin recompilar la app original.

### Opción C: Editar layouts y mapear a código fuente (apktool + ui-to-code)

Si tienes el APK y quieres modificar sus XML de diseño **y saber exactamente qué archivo editar**:

```bash
# 1. Descompilar el APK (obtienes recursos + pseudo-código opcional)
npm run apk-to-source -- -Apk ruta/app.apk -Out mi-app-source

# 2. Instalar la app en el emulador (la versión original)
npm run install-apk -- ruta/app.apk

# 3. Abrir la app en el emulador y ver la pantalla que quieres editar

# 4. Mapear elementos de UI a archivos de código
npm run ui-to-code -- -Apk ruta/app.apk -DecompiledDir mi-app-source
```

Esto genera `ui-to-code-report.html` donde cada botón/texto de pantalla tiene vinculado:
- El archivo XML exacto (ej. `res/layout/activity_main.xml`)
- El número de línea aproximado
- La clase del elemento (Button, TextView, etc.)

Luego editas los XML en `mi-app-source\res\layout\`, recompilas e instalas:

```bash
# 5. Recompilar y firmar
npm run recompile-apk -- -Folder mi-app-source -Out app-modificada.apk

# 6. Instalar la versión modificada
npm run install-apk -- app-modificada.apk
```

Requisitos: instala [apktool](https://ibotpeaches.github.io/Apktool/) y opcionalmente [jadx](https://github.com/skylot/jadx) para pseudo-código Java/Kotlin.

### Opción C original (solo apktool):
Si tienes el APK y quieres modificar sus XML de diseño:

```bash
# 1. Descompilar
npm run decompile-apk -- -Apk ruta/app.apk

# 2. Edita los archivos en app-descompilada\res\layout\ (mueve botones, cambia colores, etc.)

# 3. Recompilar y firmar
npm run recompile-apk -- -Folder app-descompilada -Out app-modificada.apk

# 4. Instalar en el emulador
npm run install-apk -- app-modificada.apk
```

Requisito: instala [apktool](https://ibotpeaches.github.io/Apktool/) y un JDK con `jarsigner`.

### ⚡ Watcher automático (recompila e instala al guardar)

Para no tener que recompilar e instalar manualmente cada vez que edites un XML, usa el watcher:

```bash
# Vigila la carpeta descompilada y aplica cambios automáticamente
npm run ui-watch -- -DecompiledDir mi-app-source -Output app-modificada.apk -Serial emulator-5554 -Package com.example.miproyecto
```

| Parámetro | Descripción |
|-----------|-------------|
| `-DecompiledDir` | Carpeta descompilada por apktool (obligatorio) |
| `-Output` | Ruta del APK de salida firmado (obligatorio) |
| `-Serial` | Serial del emulador (opcional, si hay varios dispositivos) |
| `-Package` | Paquete de la app para reiniciarla tras instalar (opcional) |
| `-NoRestart` | No reiniciar la app automáticamente tras instalar |
| `-DebounceMs` | Tiempo de espera tras un cambio antes de recompilar (default: 1000ms) |

**Flujo recomendado:**
1. `npm run apk-to-source -- -Apk ruta/app.apk -Out mi-app-source`
2. `npm run install-apk -- ruta/app.apk` (instala la versión original primero)
3. `npm run ui-watch -- -DecompiledDir mi-app-source -Output app-modificada.apk -Package com.example.miproyecto`
4. Edita cualquier XML en `mi-app-source/res/layout/` → se recompila, firma e instala automáticamente en el emulador

Presiona `Ctrl+C` para detener el watcher.

## Visual regression testing

Compara capturas del emulador contra una línea base para detectar cambios visuales no intencionados:

```bash
# Primera ejecución: crea la baseline de referencia
npm run visual-regression -- -Name "pantalla_principal"

# Ejecuciones siguientes: compara y genera diff si hay cambios
npm run visual-regression -- -Name "pantalla_principal"
```

Los resultados se guardan en:
- `visual-baseline/` — imágenes de referencia
- `visual-captures/` — capturas actuales
- `visual-diffs/` — imágenes de diferencia (solo si hay cambios)
- `visual-reports/` — reporte HTML con el estado de cada prueba

## GitHub Actions (CI)

El archivo `.github/workflows/android-emulator.yml` crea un emulador en Ubuntu, instala tu APK, ejecuta las pruebas instrumentadas, genera el reporte HTML y lo sube como artifact del workflow.

Configura los secretos o variables si tu APK está en un release privado. Por defecto busca `app-release.apk` en la raíz y usa la variable `TEST_PACKAGE` para el paquete de pruebas.

## Licencia

MIT