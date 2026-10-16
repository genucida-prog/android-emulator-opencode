/**
 * Ejemplo de uso del controlador de emulador Android con Node.js + adbkit.
 * Requiere: npm install adbkit
 * Y un emulador corriendo (ej. emulator-5554).
 */

const { listDevices, installApk, runApp, screenshot } = require('../src/emulator-controller');

(async () => {
  try {
    // 1. Listar dispositivos
    const devices = await listDevices();
    console.log('Dispositivos:', devices);

    if (devices.length === 0) {
      console.log('No hay dispositivos conectados. Inicia un emulador primero.');
      return;
    }

    const serial = devices[0].serial;

    // 2. Instalar APK
    await installApk(serial, '../mi-proyecto/app-release.apk');
    console.log('APK instalado en', serial);

    // 3. Ejecutar la app
    await runApp(serial, 'com.example.miproyecto');
    console.log('App lanzada en', serial);

    // 4. Captura de pantalla
    const path = await screenshot(serial, 'verificacion.png');
    console.log('Captura guardada en', path);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
