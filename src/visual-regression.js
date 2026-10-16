/**
 * Visual regression testing para capturas de emulador Android.
 *
 * Compara una captura actual contra una "línea base" (baseline) y, si hay
 * diferencias, genera una imagen de diferencia (diff) y un resumen.
 *
 * Dependencias: pngjs, pixelmatch
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const adb = require('adbkit');

const client = adb.createClient();

/**
 * Calcula un hash SHA-256 de un archivo.
 */
function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Compara dos imágenes PNG y devuelve un reporte de diferencias.
 * @param {string} baselinePath - Ruta a la imagen de referencia
 * @param {string} currentPath  - Ruta a la imagen actual
 * @param {string} [diffOutputPath] - Si se indica y hay diferencias, se escribe el diff aquí
 * @returns {Promise<{status:string, mismatchedPixels:number, percent:string, total:number, baselineSize:{w,h}, currentSize:{w,h}}>}
 */
async function compareImages(baselinePath, currentPath, diffOutputPath) {
  if (!fs.existsSync(baselinePath)) {
    return {
      status: 'no-baseline',
      baseline: baselinePath,
      current: currentPath,
    };
  }

  const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
  const img2 = PNG.sync.read(fs.readFileSync(currentPath));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return {
      status: 'size-mismatch',
      baselineSize: { w: img1.width, h: img1.height },
      currentSize: { w: img2.width, h: img2.height },
    };
  }

  const diff = new PNG({ width: img1.width, height: img1.height });
  const mismatchedPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    img1.width,
    img1.height,
    { threshold: 0.1 }
  );

  if (diffOutputPath && mismatchedPixels > 0) {
    fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));
  }

  const total = img1.width * img1.height;
  const percent = ((mismatchedPixels / total) * 100).toFixed(2);

  return {
    status: mismatchedPixels === 0 ? 'identical' : 'different',
    mismatchedPixels,
    percent,
    total,
  };
}

/**
 * Toma una captura del emulador y la compara contra una baseline.
 * Si no existe baseline, guarda la captura actual como nueva baseline.
 * @param {string} serial - Serial del dispositivo/emulador
 * @param {string} name - Nombre de la prueba visual (se usa como nombre de archivo)
 * @param {object} options - { baselineDir, diffDir, outputDir }
 * @returns {Promise<{result:object, paths:{baseline:string,current:string,diff?:string}}>}
 */
async function captureAndCompare(serial, name, options = {}) {
  const {
    baselineDir = 'visual-baseline',
    diffDir = 'visual-diffs',
    outputDir = 'visual-captures',
  } = options;

  for (const dir of [baselineDir, diffDir, outputDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const baselinePath = path.join(baselineDir, `${name}.png`);
  const currentPath = path.join(outputDir, `${name}-${Date.now()}.png`);
  const diffPath = path.join(diffDir, `${name}-diff.png`);

  // Capturar pantalla del emulador
  const stream = await client.exec(serial, 'screencap -p');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  fs.writeFileSync(currentPath, Buffer.concat(chunks));

  let result;
  if (!fs.existsSync(baselinePath)) {
    // Primera vez: guardar como baseline
    fs.copyFileSync(currentPath, baselinePath);
    result = {
      status: 'baseline-created',
      message: 'No existía baseline. Se creó una nueva de referencia.',
    };
  } else {
    result = await compareImages(baselinePath, currentPath, diffPath);
  }

  return {
    result,
    paths: {
      baseline: path.resolve(baselinePath),
      current: path.resolve(currentPath),
      diff: result.mismatchedPixels > 0 ? path.resolve(diffPath) : undefined,
    },
  };
}

/**
 * Genera un reporte HTML simple de los resultados de visual regression.
 * @param {Array} results - Array de resultados de captureAndCompare
 * @param {string} outputPath - Ruta del HTML de salida
 * @returns {string} ruta del archivo generado
 */
function generateVisualReport(results, outputPath = 'visual-reports/report.html') {
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const rows = results.map((r) => {
    const res = r.result;
    let statusClass = 'status-unknown';
    let statusText = res.status;
    let detail = '';

    if (res.status === 'identical') {
      statusClass = 'status-identical';
      statusText = 'IDÉNTICO';
    } else if (res.status === 'different') {
      statusClass = 'status-different';
      statusText = `DIFERENTE (${res.percent}% de píxeles)`;
      detail = `<img src="${path.basename(r.paths.diff)}" alt="diff" style="max-width:300px;">`;
    } else if (res.status === 'baseline-created') {
      statusClass = 'status-baseline';
      statusText = 'BASELINE CREADA';
    } else if (res.status === 'no-baseline') {
      statusClass = 'status-warning';
      statusText = 'SIN BASELINE';
    } else if (res.status === 'size-mismatch') {
      statusClass = 'status-error';
      statusText = 'TAMAÑO DISTINTO';
      detail = `Baseline: ${res.baselineSize.w}x${res.baselineSize.h} vs Actual: ${res.currentSize.w}x${res.currentSize.h}`;
    }

    return `
      <tr class="${statusClass}">
        <td>${escapeHtml(r.paths.baseline.split(path.sep).pop())}</td>
        <td class="status-${res.status}">${statusText}</td>
        <td>${detail}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Visual Regression Report</title>
<style>
  body{font-family:sans-serif;margin:40px;background:#f5f5f5;}
  h1{color:#1a237e;}
  table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;}
  th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd;}
  th{background:#3949ab;color:#fff;}
  tr.status-identical{background:#e8f5e9;}
  tr.status-different{background:#ffebee;}
  tr.status-baseline{background:#fff3e0;}
  tr.status-warning{background:#e3f2fd;}
  tr.status-error{background:#ffcdd2;}
  td.status-different{color:#c62828;font-weight:bold;}
  td.status-identical{color:#2e7d32;font-weight:bold;}
  td.status-baseline{color:#ef6c00;font-weight:bold;}
  td.status-error{color:#b71c1c;font-weight:bold;}
  img{border:1px solid #ccc;border-radius:4px;}
</style>
</head>
<body>
<h1>🖼️ Visual Regression Report</h1>
<p>Generado: ${new Date().toLocaleString('es-ES')}</p>
<table>
<thead><tr><th>Prueba</th><th>Estado</th><th>Diferencia</th></tr></thead>
<tbody>
${rows || '<tr><td colspan="3">Sin resultados.</td></tr>'}
</tbody>
</table>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
  return path.resolve(outputPath);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  compareImages,
  captureAndCompare,
  generateVisualReport,
  fileHash,
};
