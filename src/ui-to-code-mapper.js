/**
 * UI-to-Code Mapper para Android.
 *
 * Une el inspector de UI (jerarquía de vistas del emulador) con un APK
 * descompilado (apktool) para decirte exactamente qué archivo XML de layout
 * editar para cada elemento de pantalla.
 *
 * Flujo:
 *   1. Descompilas el APK con apktool (obtienes res/layout/*.xml)
 *   2. Capturas la jerarquía de vistas del emulador en ejecución
 *   3. Este script busca cada resource-id en los XML descompilados
 *   4. Genera un reporte HTML: "Botón X está en activity_main.xml → edita ahí"
 */

const fs = require('fs');
const path = require('path');

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extrae todos los resource-id y sus nombres de un XML de layout descompilado.
 * Devuelve un mapa: { "@id/mi_boton": { file: "activity_main.xml", line: 42, class: "Button" } }
 */
function indexLayoutXml(layoutDir) {
  const index = {};
  if (!fs.existsSync(layoutDir)) return index;

  const files = fs.readdirSync(layoutDir).filter(f => f.endsWith('.xml'));
  for (const file of files) {
    const filePath = path.join(layoutDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    // Busca android:id="@+id/..." o android:id="@id/..."
    const idRegex = /android:id="@(?:id\/|\+id\/)([^"]+)"/g;
    let match;
    while ((match = idRegex.exec(content)) !== null) {
      const idName = match[1];
      // Encontrar la línea aproximada
      const before = content.substring(0, match.index);
      const lineNumber = before.split(/\r?\n/).length;

      // Buscar la clase del elemento en esa línea o cerca
      const lineContent = lines[lineNumber - 1] || '';
      const classMatch = lineContent.match(/class="([^"]+)"/) ||
                         lineContent.match(/<([A-Za-z][A-Za-z0-9_.]*)\s/);
      const viewClass = classMatch ? classMatch[1] : 'Unknown';

      index[`@id/${idName}`] = {
        file,
        line: lineNumber,
        class: viewClass,
        id: idName,
      };
    }
  }
  return index;
}

/**
 * Parsea el XML de uiautomator y extrae nodos con resource-id.
 * @param {string} xml - Contenido XML del dump
 * @returns {Array<{id:string, class:string, text:string, bounds:string}>}
 */
function parseHierarchyWithIds(xml) {
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

    if (!resourceId) continue;

    // resource-id suele ser "com.example.app:id/mi_boton"
    const idShort = resourceId.split('/').pop() || resourceId;

    nodes.push({
      id: idShort,
      fullId: resourceId,
      class: cls,
      text: text.trim(),
      bounds,
    });
  }

  return nodes;
}

/**
 * Genera el reporte HTML que une emulador ↔ código descompilado.
 * @param {Array} nodes - Nodos de la jerarquía del emulador
 * @param {object} layoutIndex - Índice de XML de layouts descompilados
 * @param {string} apkName - Nombre del APK original
 * @param {string} outputPath - Ruta del HTML de salida
 * @returns {string} ruta del HTML generado
 */
function generateMappingReport(nodes, layoutIndex, apkName, outputPath = 'ui-to-code-report.html') {
  const rows = nodes.map((node) => {
    const lookupKey = `@id/${node.id}`;
    const mapping = layoutIndex[lookupKey];

    let statusClass = 'status-not-found';
    let statusText = 'No encontrado en código';
    let fileInfo = '';
    let action = '';

    if (mapping) {
      statusClass = 'status-found';
      statusText = `Encontrado en ${mapping.file}`;
      fileInfo = `<strong>Archivo:</strong> ${escapeHtml(mapping.file)}<br>
                  <strong>Línea:</strong> ${mapping.line}<br>
                  <strong>Clase XML:</strong> ${escapeHtml(mapping.class)}`;
      action = `<a href="${escapeHtml(mapping.file)}" target="_blank">Abrir en editor</a>`;
    }

    return `
      <tr class="${statusClass}">
        <td>${escapeHtml(node.id)}</td>
        <td>${escapeHtml(node.text)}</td>
        <td>${escapeHtml(node.class)}</td>
        <td>${escapeHtml(node.bounds)}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>${fileInfo}</td>
        <td>${action}</td>
      </tr>
    `;
  }).join('');

  const foundCount = nodes.filter(n => layoutIndex[`@id/${n.id}`]).length;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>UI → Code Mapper</title>
<style>
  body{font-family:system-ui,sans-serif;margin:40px;background:#f5f5f5;color:#333;}
  h1{color:#1a237e;}
  table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;}
  th,td{padding:12px;text-align:left;border-bottom:1px solid #eee;}
  th{background:#3949ab;color:#fff;text-transform:uppercase;font-size:12px;}
  tr.status-found{background:#e8f5e9;}
  tr.status-not-found{background:#ffebee;}
  td.status-found{color:#2e7d32;font-weight:bold;}
  td.status-not-found{color:#c62828;}
  .summary{display:flex;gap:20px;margin:20px 0;}
  .stat{flex:1;background:#fff;padding:20px;border-radius:8px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
  .stat .num{font-size:32px;font-weight:bold;display:block;}
  .stat.passed{color:#2e7d32;}
  .stat.missing{color:#c62828;}
  .instructions{background:#fff;padding:20px;border-radius:8px;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
  .instructions ol{padding-left:20px;}
  .instructions code{background:#f5f5f5;padding:2px 6px;border-radius:4px;font-family:monospace;}
</style>
</head>
<body>
<h1>🔗 UI → Código Fuente</h1>
<p>APK: ${escapeHtml(apkName)} · Elementos en pantalla: ${nodes.length} · Encontrados en código: ${foundCount}</p>

<div class="summary">
  <div class="stat"><span class="num">${nodes.length}</span><span>Elementos en UI</span></div>
  <div class="stat"><span class="num passed">${foundCount}</span><span>Mapeados a código</span></div>
  <div class="stat"><span class="num missing">${nodes.length - foundCount}</span><span>Sin mapeo</span></div>
</div>

<div class="instructions">
  <h2>Cómo aplicar los cambios al código</h2>
  <ol>
    <li><strong>Descompila el APK:</strong> <code>npm run decompile-apk -- -Apk tu-app.apk</code></li>
    <li><strong>Ejecuta el inspector:</strong> <code>npm run ui-inspector</code> (en el emulador con la app instalada)</li>
    <li><strong>Ejecuta este mapeo:</strong> <code>npm run ui-to-code -- -Apk tu-app.apk</code></li>
    <li><strong>Abre el reporte HTML</strong> generado y haz clic en los archivos para editar</li>
    <li><strong>Edita los XML en <code>app-descompilada/res/layout/</code></code> (mueve botones, cambia textos, colores, etc.)</li>
    <li><strong>Recompila:</strong> <code>npm run recompile-apk -- -Folder app-descompilada -Out app-modificada.apk</code></li>
    <li><strong>Instala en el emulador:</strong> <code>npm run install-apk -- app-modificada.apk</code></li>
  </ol>
  <p><strong>Nota:</strong> Los APKs compilados no contienen código Kotlin/Java original, solo XML de layouts y bytecode smali.
     Con apktool puedes editar los diseños visuales, pero para cambiar la lógica necesitas el proyecto original de Android Studio.</p>
</div>

<table>
  <thead>
    <tr>
      <th>ID del elemento</th>
      <th>Texto</th>
      <th>Clase</th>
      <th>Coordenadas</th>
      <th>Estado</th>
      <th>Archivo de código</th>
      <th>Acción</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="7">Sin elementos con resource-id detectados.</td></tr>'}
  </tbody>
</table>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
  return path.resolve(outputPath);
}

module.exports = {
  indexLayoutXml,
  parseHierarchyWithIds,
  generateMappingReport,
};
