/**
 * Genera un reporte HTML de pruebas instrumentadas de Android.
 *
 * Acepta:
 *  - XML JUnit (ruta de archivo o contenido)
 *  - Texto plano de salida de `am instrument`
 *
 * Resultado: archivo HTML listo para abrir en el navegador.
 */

const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

/**
 * Escapa texto para insertar en HTML.
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Intenta parsear XML JUnit y devuelve un objeto estructurado.
 */
async function parseJUnitXml(xmlContent) {
  try {
    const result = await parseStringPromise(xmlContent, { explicitArray: false, mergeAttrs: true });
    const testsuite = result.testsuite || result.testsuites?.testsuite || {};
    const suites = Array.isArray(testsuite) ? testsuite : [testsuite];

    const parsed = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      time: 0,
      cases: [],
    };

    for (const suite of suites) {
      parsed.total += Number(suite.tests || 0);
      parsed.failed += Number(suite.failures || 0);
      parsed.errors += Number(suite.errors || 0);
      parsed.skipped += Number(suite.skipped || 0);
      parsed.time += Number(suite.time || 0);

      let testcases = suite.testcase || [];
      if (!Array.isArray(testcases)) testcases = [testcases];

      for (const tc of testcases) {
        const caseObj = {
          name: tc.name || '',
          classname: tc.classname || '',
          time: Number(tc.time || 0),
          status: 'passed',
          failure: '',
          systemOut: tc['system-out'] || '',
          systemErr: tc['system-err'] || '',
        };

        if (tc.failure) {
          caseObj.status = 'failed';
          caseObj.failure = Array.isArray(tc.failure) ? tc.failure.join('\n') : String(tc.failure);
          parsed.failed++;
          parsed.passed++;
        } else if (tc.error) {
          caseObj.status = 'error';
          caseObj.failure = Array.isArray(tc.error) ? tc.error.join('\n') : String(tc.error);
          parsed.errors++;
        } else {
          parsed.passed++;
        }

        parsed.cases.push(caseObj);
      }
    }

    return parsed;
  } catch (err) {
    return null;
  }
}

/**
 * Parsea texto plano de `am instrument` y extrae un resumen básico.
 */
function parsePlainText(text) {
  const lines = String(text).split(/\r?\n/);
  const parsed = {
    total: 0, passed: 0, failed: 0, errors: 0, skipped: 0, time: 0,
    cases: [], raw: text,
  };

  // Busca resumen tipo: "Tests run: 5, Failures: 1, Errors: 0, Skipped: 0, Time: 1.234"
  const summaryMatch = text.match(/Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+)(?:,\s*Skipped:\s*(\d+))?,\s*Time:\s*([\d.]+)/i);
  if (summaryMatch) {
    parsed.total = Number(summaryMatch[1]);
    parsed.failed = Number(summaryMatch[2]);
    parsed.errors = Number(summaryMatch[3]);
    parsed.skipped = Number(summaryMatch[4] || 0);
    parsed.time = Number(summaryMatch[5]);
    parsed.passed = parsed.total - parsed.failed - parsed.errors - parsed.skipped;
  }

  // Extrae nombres de pruebas fallidas si aparecen
  const failureBlocks = text.split(/(?=FAILURE!!!|Failures:|\[FAILED\]|testFailure)/i);
  for (const block of failureBlocks) {
    const nameMatch = block.match(/test[A-Za-z0-9_]+\.([A-Za-z0-9_]+)/i) ||
                      block.match(/([A-Za-z0-9_]+)\(([A-Za-z0-9_.]+)\)/i);
    if (nameMatch) {
      parsed.cases.push({
        name: nameMatch[0],
        classname: '',
        time: 0,
        status: 'failed',
        failure: block.slice(0, 2000),
        systemOut: '', systemErr: '',
      });
    }
  }

  return parsed;
}

/**
 * Genera el HTML del reporte.
 */
function generateHtmlReport(data, metadata = {}) {
  const { total = 0, passed = 0, failed = 0, errors = 0, skipped = 0, time = 0, cases = [], raw = '' } = data;
  const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  const rows = cases.map((c) => {
    const statusClass = c.status === 'passed' ? 'status-passed' :
                        c.status === 'failed' ? 'status-failed' : 'status-error';
    const statusText = c.status === 'passed' ? 'PASS' :
                       c.status === 'failed' ? 'FAIL' : 'ERROR';
    const failureHtml = c.failure ? `<pre class="failure">${escapeHtml(c.failure)}</pre>` : '';
    const outHtml = c.systemOut ? `<pre class="output">${escapeHtml(c.systemOut)}</pre>` : '';
    return `
      <tr class="${statusClass}">
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.classname)}</td>
        <td>${c.time.toFixed(3)} s</td>
        <td class="status-${c.status}">${statusText}</td>
        <td>${failureHtml}${outHtml}</td>
      </tr>
    `;
  }).join('');

  const statusColor = failed === 0 && errors === 0 ? '#2e7d32' : '#c62828';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte de Pruebas Android</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f5f5f5; color: #333; }
  .container { max-width: 1100px; margin: 40px auto; padding: 0 20px; }
  header { background: linear-gradient(135deg, #1a237e, #3949ab); color: #fff; padding: 30px; border-radius: 10px 10px 0 0; }
  header h1 { margin: 0; font-size: 26px; }
  header .subtitle { opacity: 0.9; margin-top: 8px; font-size: 14px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding: 20px; background: #fff; }
  .meta-card { background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #3949ab; }
  .meta-card .label { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 6px; }
  .meta-card .value { font-size: 20px; font-weight: bold; color: #333; }
  .summary { display: flex; gap: 10px; padding: 20px; background: #fff; }
  .stat { flex: 1; padding: 20px; border-radius: 8px; color: #fff; text-align: center; }
  .stat.passed { background: #2e7d32; }
  .stat.failed { background: #c62828; }
  .stat.errors { background: #ef6c00; }
  .stat.skipped { background: #fdd835; color: #333; }
  .stat.total { background: #3949ab; }
  .stat .num { font-size: 32px; font-weight: bold; display: block; }
  .stat .lbl { font-size: 14px; opacity: 0.9; margin-top: 4px; }
  .success-rate { text-align: center; padding: 16px; background: #fff; font-size: 20px; font-weight: bold; color: ${statusColor}; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  th, td { padding: 14px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #3949ab; color: #fff; font-size: 13px; text-transform: uppercase; }
  tr.status-passed { background: #e8f5e9; }
  tr.status-failed { background: #ffebee; }
  tr.status-error { background: #fff3e0; }
  td.status-passed { color: #2e7d32; font-weight: bold; }
  td.status-failed { color: #c62828; font-weight: bold; }
  td.status-error { color: #ef6c00; font-weight: bold; }
  pre.failure { background: #ffebee; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin: 8px 0; border-left: 3px solid #c62828; }
  pre.output { background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin: 8px 0; color: #555; }
  .raw-section { margin-top: 30px; background: #fff; padding: 20px; border-radius: 8px; }
  .raw-section pre { background: #272822; color: #f8f8f2; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 12px; max-height: 400px; overflow-y: auto; }
  footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>📱 Reporte de Pruebas Android</h1>
    <div class="subtitle">Generado por OpenCode Android Emulator · ${escapeHtml(metadata.device || 'Desconocido')} · ${new Date().toLocaleString('es-ES')}</div>
  </header>

  <div class="meta">
    <div class="meta-card"><div class="label">Dispositivo / Emulador</div><div class="value">${escapeHtml(metadata.serial || '—')}</div></div>
    <div class="meta-card"><div class="label">Paquete de pruebas</div><div class="value">${escapeHtml(metadata.testPackage || '—')}</div></div>
    <div class="meta-card"><div class="label">Runner</div><div class="value">${escapeHtml(metadata.runner || '—')}</div></div>
    <div class="meta-card"><div class="label">Fecha</div><div class="value">${escapeHtml(metadata.date || new Date().toISOString())}</div></div>
  </div>

  <div class="summary">
    <div class="stat total"><span class="num">${total}</span><span class="lbl">Total</span></div>
    <div class="stat passed"><span class="num">${passed}</span><span class="lbl">Pasadas</span></div>
    <div class="stat failed"><span class="num">${failed}</span><span class="lbl">Fallidas</span></div>
    <div class="stat errors"><span class="num">${errors}</span><span class="lbl">Errores</span></div>
    <div class="stat skipped"><span class="num">${skipped}</span><span class="lbl">Omitidas</span></div>
  </div>

  <div class="success-rate">Tasa de éxito: ${successRate}% &nbsp;|&nbsp; Tiempo total: ${time.toFixed(3)} s</div>

  <h2 style="margin-top:30px;">Detalle de casos de prueba</h2>
  <table>
    <thead><tr><th>Prueba</th><th>Clase</th><th>Tiempo</th><th>Estado</th><th>Detalle</th></tr></thead>
    <tbody>
      ${rows || '<tr><td colspan="5">No se encontraron casos de prueba individuales.</td></tr>'}
    </tbody>
  </table>

  ${raw ? `
  <div class="raw-section">
    <h2>Salida cruda de adb / am instrument</h2>
    <pre>${escapeHtml(raw)}</pre>
  </div>
  ` : ''}

  <footer>
    Generado automáticamente por android-emulator-opencode · ${new Date().toLocaleString('es-ES')}
  </footer>
</div>
</body>
</html>`;
}

/**
 * Genera el reporte HTML.
 * @param {object} options
 * @param {string} [options.input] - Ruta al archivo de resultados (XML JUnit o texto)
 * @param {string} [options.output] - Ruta del HTML de salida (default: test-reports/report.html)
 * @param {object} [options.metadata] - Metadatos para el reporte (serial, testPackage, runner, device, date)
 * @param {string} [options.rawText] - Contenido de texto si no se quiere leer de archivo
 * @returns {Promise<{htmlPath: string, summary: object}>}
 */
async function generateTestReport(options = {}) {
  const {
    input,
    output = 'test-reports/report.html',
    metadata = {},
    rawText,
  } = options;

  const outDir = path.dirname(output);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let content = rawText;
  if (!content && input) {
    content = fs.readFileSync(input, 'utf8');
  }

  let data;
  if (content && content.trim().startsWith('<')) {
    data = await parseJUnitXml(content);
    if (!data) {
      data = parsePlainText(content);
      data.raw = content;
    }
  } else {
    data = parsePlainText(content || '');
    data.raw = content || '';
  }

  const html = generateHtmlReport(data, metadata);
  fs.writeFileSync(output, html, 'utf8');

  return {
    htmlPath: path.resolve(output),
    summary: {
      total: data.total,
      passed: data.passed,
      failed: data.failed,
      errors: data.errors,
      skipped: data.skipped,
      time: data.time,
    },
  };
}

module.exports = { generateTestReport, parseJUnitXml, parsePlainText, generateHtmlReport };
