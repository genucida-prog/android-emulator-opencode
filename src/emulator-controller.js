const adb = require('adbkit');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { generateTestReport } = require('./test-report-generator');

const client = adb.createClient();

/**
 * Lista los dispositivos y emuladores conectados.
 * @returns {Promise<Array<{serial:string, state:string, model:string}>>}
 */
async function listDevices() {
  const devices = await client.listDevices();
  return devices.map((d) => ({
    serial: d.id,
    state: d.state,
    model: d.model || '',
  }));
}

/**
 * Instala un APK en un dispositivo/emulador.
 * @param {string} serial - Serial del dispositivo (ej. emulator-5554)
 * @param {string} apkPath - Ruta al archivo .apk
 */
async function installApk(serial, apkPath) {
  await client.install(serial, apkPath, { reinstall: true });
  return { serial, apkPath, installed: true };
}

/**
 * Ejecuta la actividad principal de una aplicación instalada.
 * @param {string} serial - Serial del dispositivo
 * @param {string} packageName - Paquete de la app (ej. com.example.miapp)
 */
async function runApp(serial, packageName) {
  await client.shell(
    serial,
    `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`
  );
  return { serial, packageName, launched: true };
}

/**
 * Toma una captura de pantalla del dispositivo.
 * @param {string} serial - Serial del dispositivo
 * @param {string} outputPath - Ruta donde guardar la imagen (png)
 * @returns {Promise<string>} ruta del archivo generado
 */
async function screenshot(serial, outputPath = 'screenshot.png') {
  const stream = await client.exec(serial, 'screencap -p');
  await pipeline(stream, fs.createWriteStream(outputPath));
  return outputPath;
}

/**
 * Genera reporte HTML de pruebas instrumentadas a partir de la salida de adb.
 * @param {object} options - { input, output, metadata, rawText }
 */
async function generateTestReportController(options = {}) {
  return generateTestReport(options);
}

module.exports = {
  listDevices,
  installApk,
  runApp,
  screenshot,
  generateTestReport: generateTestReportController,
};
