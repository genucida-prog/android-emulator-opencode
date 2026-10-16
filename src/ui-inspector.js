/**
 * UI Inspector para emulador Android.
 *
 * Dumpa la jerarquía de vistas (uiautomator), captura la pantalla y
 * permite exportar un reporte visual con coordenadas de cada elemento.
 * Útil para saber qué editar y dónde están los elementos en la APK.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const adb = require('adbkit');

const client = adb.createClient();

/**
 * Dumpa la jerarquía de vistas actual del dispositivo.
 * @param {string} serial - Serial del emulador/dispositivo
 * @returns {Promise<string>} XML de la jerarquía
 */
async function dumpHierarchy(serial) {
  const stream = await client.exec(serial, 'uiautomator dump /dev/stdout');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Captura pantalla del dispositivo.
 * @param {string} serial - Serial del dispositivo
 * @param {string} outputPath - Ruta donde guardar el PNG
 * @returns {Promise<string>} ruta del archivo
 */
async function captureScreen(serial, outputPath = 'ui-screenshot.png') {
  const stream = await client.exec(serial, 'screencap -p');
  await pipeline(stream, fs.createWriteStream(outputPath));
  return path.resolve(outputPath);
}

/**
 * Parsea el XML de uiautomator y extrae elementos clicables/interactivos.
 * @param {string} xml - Contenido XML del dump
 * @returns {Array<{id:string, class:string, text:string, bounds:string, x:number, y:number, w:number, h:number, clickable:boolean}>}
 */
function parseHierarchy(xml) {
  const nodes = [];
  const regex = /<node[^>]*>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const tag = match[0];
    const getAttr = (name) => {
      const m = tag.match(new RegExp(`${name}="([^"]*)"`));
      return m ? m[1] : '';
    };

    const resourceId = getAttr('resource-id');
    const cls = getAttr('class');
    const text = getAttr('text') || getAttr('content-desc') || '';
    const bounds = getAttr('bounds');
    const clickable = getAttr('clickable') === 'true';
    const checkable = getAttr('checkable') === 'true';

    if (!bounds) continue;

    const boundsMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!boundsMatch) continue;

    const x = parseInt(boundsMatch[1], 10);
    const y = parseInt(boundsMatch[2], 10);
    const x2 = parseInt(boundsMatch[3], 10);
    const y2 = parseInt(boundsMatch[4], 10);

    nodes.push({
      id: resourceId || cls.split('.').pop(),
      class: cls,
      text: text.trim(),
      bounds,
      x, y,
      w: x2 - x,
      h: y2 - y,
      clickable,
      checkable,
      interactive: clickable || checkable || cls.includes('Button') || cls.includes('TextView') || cls.includes('EditText')
    });
  }

  return nodes;
}

/**
 * Genera un reporte HTML con la captura y los elementos detectados,
 * superponiendo cajas y etiquetas para que el usuario vea qué se puede editar.
 * @param {string} screenshotPath - Ruta a la captura PNG
 * @param {Array} nodes - Nodos parseados
 * @param {string} outputPath - Ruta del HTML de salida
 * @returns {string} ruta del HTML generado
 */
function generateInspectorReport(screenshotPath, nodes, outputPath = 'ui-inspection-report.html') {
  const imgName = path.basename(screenshotPath);

  // Calcular dimensiones aproximadas (usamos 1080x2400 como referencia si no se sabe)
  // En un entorno real se podría leer del wm size, pero para el reporte basta.
  const scale = 1;

  const boxes = nodes.map((n) => {
    const color = n.interactive ? '#2e7d32' : '#9e9e9e';
    const border = n.interactive ? '2px solid #2e7d32' : '1px dashed #9e9e9e';
    return `
      <div class="box ${n.interactive ? 'interactive' : ''}"
           style="left:${n.x * scale}px; top:${n.y * scale}px; width:${n.w * scale}px; height:${n.h * scale}px; border:${border}; background:${color}22;"
           data-id="${escapeHtml(n.id)}"
           data-class="${escapeHtml(n.class)}"
           data-text="${escapeHtml(n.text)}"
           data-bounds="${escapeHtml(n.bounds)}"
           data-clickable="${n.clickable}">
        <div class="label">${escapeHtml(n.text || n.id)}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UI Inspector - ${imgName}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #f0f0f0; color: #333; }
  .container { max-width: 1200px; margin: 20px auto; padding: 20px; }
  header { background: #1a237e; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
  .stage { position: relative; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: inline-block; }
  .stage img { display: block; max-width: 100%; height: auto; }
  .box { position: absolute; box-sizing: border-box; cursor: pointer; border-radius: 4px; transition: all 0.2s; user-select: none; }
  .box:hover { z-index: 10; box-shadow: 0 0 0 2px #1a237e; }
  .box.interactive:hover { background: #2e7d3222; }
  .label { position: absolute; top: -20px; left: 0; background: #1a237e; color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 3px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.2s; }
  .box:hover .label { opacity: 1; }
  .stats { margin-top: 20px; background: #fff; padding: 16px; border-radius: 8px; }
  .stats h2 { margin-top: 0; font-size: 16px; color: #1a237e; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-right: 6px; }
  .badge.interactive { background: #c8e6c9; color: #1b5e20; }
  .badge.static { background: #e0e0e0; color: #616161; }
  .controls { margin-bottom: 12px; }
  button { background: #1a237e; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px; }
  button:hover { background: #3949ab; }
  .json-pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; max-height: 300px; overflow-y: auto; margin-top: 10px; }
  .edit-note { background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin-top: 16px; border-radius: 4px; font-size: 14px; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>🔍 UI Inspector - Android Emulator</h1>
    <p>Captura: ${escapeHtml(imgName)} · Elementos detectados: ${nodes.length} · Interactivos: ${nodes.filter(n => n.interactive).length}</p>
  </header>

  <div class="controls">
    <button onclick="toggleBoxes()">Mostrar/Ocultar cajas</button>
    <button onclick="exportJSON()">Exportar JSON de elementos</button>
    <span id="boxCount" class="badge interactive">Cajas: ${nodes.length}</span>
  </div>

  <div class="stage">
    <img id="screenImg" src="${imgName}" alt="Pantalla del emulador">
    ${boxes}
  </div>

  <div class="edit-note">
    <strong>⚠️ Nota importante:</strong> Un APK es un binario compilado. No se pueden mover botones "en vivo" como en una web.
    <br>
    Para editar la UI realmente necesitas:
    <ul>
      <li>El código fuente (layouts XML en <code>res/layout/</code>) y recompilar con Android Studio, o</li>
      <li>Descompilar con <strong>apktool</strong>, editar los XML y recompilar el APK, o</li>
      <li>Inyectar una capa de overlay con botones extra desde este mismo emulador.</li>
    </ul>
    Usa este inspector para identificar qué elementos quieres mover o añadir.
  </div>

  <div class="stats">
    <h2>Elementos detectados</h2>
    <div class="json-pre" id="jsonOutput">${escapeHtml(JSON.stringify(nodes, null, 2))}</div>
  </div>
</div>

<script>
  const boxes = document.querySelectorAll('.box');
  const count = document.getElementById('boxCount');
  function toggleBoxes() {
    boxes.forEach(b => b.style.display = b.style.display === 'none' ? 'block' : 'none');
  }
  function exportJSON() {
    const data = ${JSON.stringify(nodes)};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ui-elements.json';
    a.click();
  }
</script>
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
  dumpHierarchy,
  captureScreen,
  parseHierarchy,
  generateInspectorReport,
};
