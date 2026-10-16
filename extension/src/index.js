/**
 * Punto de entrada de la extensión de OpenCode: Android Emulator.
 *
 * Expone herramientas para controlar un emulador de Android y probar APKs
 * desde OpenCode. Usa `adbkit` para hablar con adb y `child_process` para
 * lanzar el emulador (`emulator`).
 *
 * Nota: la API exacta de registro de herramientas de OpenCode puede variar
 * según la versión. Ajusta el objeto exportado (`module.exports`) a la firma
 * que requiera tu instalación de OpenCode.
 */

const adb = require('adbkit');
const { pipeline } = require('stream/promises');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateTestReport } = require('../src/test-report-generator');

const client = adb.createClient();

/** @type {string | undefined} */
let avdName = process.env.AVD_NAME;

/**
 * Ejecuta un comando de consola y devuelve su salida como texto.
 */
function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `comando falló con código ${code}`));
    });
  });
}

/** Lista dispositivos y emuladores conectados. */
async function android_list_devices() {
  const devices = await client.listDevices();
  return devices.map((d) => ({
    serial: d.id,
    state: d.state,
    model: d.model || '',
  }));
}

/** Inicia el emulador configurado en AVD_NAME. */
async function android_start_emulator() {
  if (!avdName) {
    throw new Error('AVD_NAME no definido. Configúralo en .env o en la variable de entorno.');
  }
  await runCommand('emulator', [`@${avdName}`, '-no-snapshot-load', '-wipe-data']);
  return { avdName, started: true };
}

/** Instala un APK en el emulador. */
async function android_install_apk({ serial, apkPath }) {
  await client.install(serial, apkPath, { reinstall: true });
  return { serial, apkPath, installed: true };
}

/** Ejecuta la actividad principal de una app instalada. */
async function android_run_app({ serial, packageName }) {
  await client.shell(
    serial,
    `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`
  );
  return { serial, packageName, launched: true };
}

/** Ejecuta pruebas instrumentadas (Espresso / UI Automator). */
async function android_run_tests({ serial, testPackage, runner = 'androidx.test.runner.AndroidJUnitRunner' }) {
  await client.shell(serial, `am instrument -w -r ${testPackage}/${runner}`);
  return { serial, testPackage, runner, finished: true };
}

/** Toma una captura de pantalla del emulador. */
async function android_screenshot({ serial, outputPath = 'screenshot.png' }) {
  const stream = await client.exec(serial, 'screencap -p');
  await pipeline(stream, fs.createWriteStream(outputPath));
  return { outputPath };
}

/** Muestra los registros (logcat) del emulador. */
async function android_logcat({ serial, packageName }) {
  const cmd = packageName ? `logcat | findstr ${packageName}` : 'logcat';
  const output = await runCommand('adb', serial ? ['-s', serial, 'shell', cmd] : ['shell', cmd]);
  return { output };
}

/** Desinstala una aplicación. */
async function android_uninstall_app({ serial, packageName }) {
  await client.shell(serial, `pm uninstall ${packageName}`);
  return { serial, packageName, uninstalled: true };
}

/** Limpia los datos de una aplicación. */
async function android_clear_app_data({ serial, packageName }) {
  await client.shell(serial, `pm clear ${packageName}`);
  return { serial, packageName, cleared: true };
}

/** Abre una URL en el navegador del emulador. */
async function android_open_url({ serial, url }) {
  await client.shell(serial, `am start -a android.intent.action.VIEW -d ${url}`);
  return { serial, url, opened: true };
}

/** Muestra información del dispositivo. */
async function android_device_info({ serial }) {
  const props = [
    'ro.product.model',
    'ro.build.version.release',
    'ro.build.version.sdk',
  ];
  const results = {};
  for (const prop of props) {
    results[prop] = await client.shell(serial, `getprop ${prop}`);
  }
  results['wm.size'] = await client.shell(serial, 'wm size');
  results['wm.density'] = await client.shell(serial, 'wm density');
  return { serial, info: results };
}

/** Copia un archivo del emulador al PC (adb pull). */
async function android_pull_file({ serial, remote, local }) {
  await runCommand('adb', serial ? ['-s', serial, 'pull', remote, local] : ['pull', remote, local]);
  return { remote, local, pulled: true };
}

/** Copia un archivo del PC al emulador (adb push). */
async function android_push_file({ serial, local, remote }) {
  await runCommand('adb', serial ? ['-s', serial, 'push', local, remote] : ['push', local, remote]);
  return { local, remote, pushed: true };
}

/** Reinicia el emulador (mata y vuelve a iniciar el AVD). */
async function android_restart_emulator() {
  try {
    await runCommand('adb', ['emu', 'kill']);
  } catch (e) {
    // emu kill puede no estar disponible en todas las versiones de adb
  }
  await new Promise((r) => setTimeout(r, 2000));
  return android_start_emulator();
}

/** Abre la visualización del emulador (scrcpy si está disponible, si no capturas periódicas). */
async function android_view_emulator({ serial }) {
  try {
    const proc = spawn('scrcpy', serial ? ['-s', serial] : [], { stdio: 'inherit' });
    await new Promise((resolve, reject) => {
      proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`scrcpy cerró con código ${code}`)));
      proc.on('error', reject);
    });
    return { serial, viewed: true, method: 'scrcpy' };
  } catch (e) {
    // Fallback: hacer una captura simple
    const output = `view-emulator-${Date.now()}.png`;
    const stream = await client.exec(serial || (await client.listDevices())[0].id, 'screencap -p');
    await pipeline(stream, fs.createWriteStream(output));
    return { serial, viewed: true, method: 'screenshot', output, note: 'Instala scrcpy para ver en tiempo real.' };
  }
}

/** Genera reporte HTML de pruebas instrumentadas. */
async function android_generate_test_report({ input, output = 'test-reports/report.html', metadata = {} }) {
  const result = await generateTestReport({ input, output, metadata });
  return result;
}

/**
 * Herramientas expuestas a OpenCode.
 */
const tools = {
  android_list_devices,
  android_start_emulator,
  android_install_apk,
  android_run_app,
  android_run_tests,
  android_screenshot,
  android_logcat,
  android_uninstall_app,
  android_clear_app_data,
  android_open_url,
  android_device_info,
  android_pull_file,
  android_push_file,
  android_restart_emulator,
  android_view_emulator,
  android_generate_test_report,
};

module.exports = {
  name: 'opencode-android-emulator',
  version: '1.2.0',
  description: 'Controla un emulador de Android para instalar y probar APKs desde OpenCode',
  tools,
  // Expone también las funciones sueltas por si se necesitan directamente.
  listDevices: android_list_devices,
  startEmulator: android_start_emulator,
  viewEmulator: android_view_emulator,
  installApk: android_install_apk,
  runApp: android_run_app,
  runTests: android_run_tests,
  generateTestReport: android_generate_test_report,
  screenshot: android_screenshot,
  logcat: android_logcat,
  uninstallApp: android_uninstall_app,
  clearAppData: android_clear_app_data,
  openUrl: android_open_url,
  deviceInfo: android_device_info,
  pullFile: android_pull_file,
  pushFile: android_push_file,
  restartEmulator: android_restart_emulator,
};
