/**
 * UI Watcher automático para Android.
 *
 * Monitorea los archivos XML de un APK descompilado (apktool) y, cada vez
 * que guardes un cambio, recompila, firma e instala automáticamente el APK
 * en el emulador. Ideal para iterar rápido en el diseño de la UI.
 *
 * Requisitos: apktool, jarsigner (JDK), adb y emulador corriendo.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { generateTestReport } = require('./test-report-generator');

/**
 * Ejecuta un comando y devuelve una promesa con su salida.
 */
function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const stdio = options.silent ? 'pipe' : 'inherit';
    const proc = spawn(cmd, args, { stdio, shell: true });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve({ code, out, err });
      else reject(new Error(err.trim() || `comando falló con código ${code}`));
    });
    proc.on('error', reject);
  });
}

/**
 * Espera un tiempo (debounce).
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Inicia el watcher automático.
 * @param {object} options
 * @param {string} options.decompiledDir - Carpeta descompilada por apktool
 * @param {string} options.outputApk - Ruta del APK de salida (firmado)
 * @param {string} [options.serial] - Serial del emulador (opcional)
 * @param {string} [options.packageName] - Paquete de la app para reiniciar tras instalar
 * @param {boolean} [options.autoRestart=true] - Reiniciar la app tras instalar
 * @param {number} [options.debounceMs=1000] - Tiempo de espera tras un cambio antes de recompilar
 * @returns {Promise<void>}
 */
async function startWatch({
  decompiledDir,
  outputApk,
  serial,
  packageName,
  autoRestart = true,
  debounceMs = 1000,
}) {
  const layoutDir = path.join(decompiledDir, 'res', 'layout');
  const valuesDir = path.join(decompiledDir, 'res', 'values');

  if (!fs.existsSync(decompiledDir)) {
    throw new Error(`No se encontró la carpeta descompilada: ${decompiledDir}`);
  }

  if (!fs.existsSync(layoutDir)) {
    console.warn(`⚠️  No se encontró res/layout en ${decompiledDir}`);
  }

  const adbArgs = serial ? ['-s', serial] : [];
  let pendingTimeout = null;
  let isBuilding = false;
  let lastChangeTime = 0;

  const log = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const colors = {
      info: '\x1b[36m',   // cyan
      ok: '\x1b[32m',     // green
      warn: '\x1b[33m',   // yellow
      err: '\x1b[31m',    // red
      reset: '\x1b[0m',
    };
    console.log(`${colors[type]}[${time}]${colors.reset} ${msg}`);
  };

  const buildAndInstall = async (changedFiles) => {
    if (isBuilding) {
      log('Ya hay una compilación en curso, omitiendo...', 'warn');
      return;
    }
    isBuilding = true;

    try {
      log(`🔧 Cambios detectados en: ${changedFiles.join(', ')}`);
      log('Recompilando APK con apktool...');

      const apkUnsigned = outputApk.replace(/\.apk$/i, '-unsigned.apk');
      await runCommand('apktool', ['b', decompiledDir, '-o', apkUnsigned]);
      log('APK recompilado.', 'ok');

      // Firmar con debug.keystore
      const debugKeystore = path.join(require('os').homedir(), '.android', 'debug.keystore');
      if (!fs.existsSync(debugKeystore)) {
        throw new Error(`No se encontró debug.keystore en ${debugKeystore}`);
      }

      log('Firmando APK...');
      await runCommand('jarsigner', [
        '-verbose',
        '-sigalg', 'SHA1withRSA',
        '-digestalg', 'SHA1',
        '-keystore', debugKeystore,
        outputApk,
        'androiddebugkey',
        '-storepass', 'android',
        '-keypass', 'android',
      ]);
      log('APK firmado.', 'ok');

      // Instalar en el emulador
      log('Instalando APK en el emulador...');
      await runCommand('adb', [...adbArgs, 'install', '-r', outputApk]);
      log('APK instalado.', 'ok');

      // Reiniciar la app si se pidió
      if (autoRestart && packageName) {
        log('Reiniciando la aplicación...');
        await runCommand('adb', [
          ...adbArgs,
          'shell',
          'monkey',
          '-p', packageName,
          '-c', 'android.intent.category.LAUNCHER',
          '1',
        ]);
        log('App reiniciada.', 'ok');
      }

      log('✅ Cambios aplicados en el emulador.', 'ok');
    } catch (err) {
      log(`❌ Error: ${err.message}`, 'err');
    } finally {
      isBuilding = false;
    }
  };

  // Debounced build
  const scheduleBuild = (changedFiles) => {
    lastChangeTime = Date.now();
    if (pendingTimeout) clearTimeout(pendingTimeout);
    pendingTimeout = setTimeout(() => {
      const now = Date.now();
      if (now - lastChangeTime < debounceMs - 50) return; // aún hay cambios recientes
      buildAndInstall(changedFiles);
    }, debounceMs);
  };

  // Watcher recursivo sobre layout y values
  const watchDirs = [layoutDir, valuesDir].filter((d) => fs.existsSync(d));

  if (watchDirs.length === 0) {
    throw new Error('No hay directorios de recursos para vigilar (res/layout o res/values).');
  }

  log('👀 Iniciando watcher automático...');
  log(`   Carpeta descompilada: ${decompiledDir}`);
  log(`   APK de salida: ${outputApk}`);
  log(`   Emulador: ${serial || 'default'}`);
  log(`   Reiniciar app: ${autoRestart && packageName ? 'sí (' + packageName + ')' : 'no'}`);
  log(`   Presiona Ctrl+C para detener.\n`);

  for (const dir of watchDirs) {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const fullPath = path.join(dir, filename);
      if (filename.endsWith('.xml') || filename.endsWith('.png') || filename.endsWith('.jpg')) {
        log(`📝 Cambio detectado: ${fullPath}`);
        scheduleBuild([fullPath]);
      }
    });
  }

  // Mantener el proceso vivo
  process.on('SIGINT', () => {
    log('\n🛑 Deteniendo watcher...');
    process.exit(0);
  });
}

module.exports = {
  startWatch,
};
