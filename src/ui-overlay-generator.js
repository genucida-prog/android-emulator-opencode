/**
 * Genera un código de overlay (Kotlin/Java + XML) que se puede añadir a un proyecto Android
 * para superponer botones, acciones o modificaciones visuales sobre la app original sin
 * necesidad de tocar los layouts originales.
 *
 * Esto es útil para añadir botones de prueba, acciones rápidas o paneles de control
 * sobre la APK mientras pruebas.
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
 * Genera un layout XML de overlay flotante.
 * @param {string} packageName - Paquete de la app
 * @param {Array} buttons - [{id, text, x, y, w, h, action}]
 * @returns {string}
 */
function generateOverlayLayout(packageName, buttons = []) {
  const btnsXml = buttons.map((b) => {
    return `
    <Button
        android:id="@+id/overlay_${b.id}"
        android:layout_width="${b.w}dp"
        android:layout_height="${b.h}dp"
        android:layout_x="${b.x}dp"
        android:layout_y="${b.y}dp"
        android:text="${escapeHtml(b.text)}"
        android:background="#1a237e"
        android:textColor="#ffffff"
        android:elevation="8dp"/>
  `;
  }).join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

${btnsXml}

</FrameLayout>`;
}

/**
 * Genera una Activity de servicio de overlay (requiere permiso SYSTEM_ALERT_WINDOW).
 * @param {string} packageName
 * @returns {string}
 */
function generateOverlayService(packageName) {
  return `package ${packageName}.ui;

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity

class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var overlayView: FrameLayout

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        overlayView = FrameLayout(this)

        val params = WindowManager.LayoutParams().apply {
            type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            format = android.graphics.PixelFormat.TRANSLUCENT
            width = WindowManager.LayoutParams.MATCH_PARENT
            height = WindowManager.LayoutParams.MATCH_PARENT
        }

        windowManager.addView(overlayView, params)
    }

    override fun onDestroy() {
        super.onDestroy()
        windowManager.removeView(overlayView)
    }
}`;
}

/**
 * Genera el reporte HTML explicando cómo usar el overlay.
 * @param {string} outputPath
 * @param {object} options
 * @returns {string}
 */
function generateOverlayReport(outputPath = 'ui-overlay-report.html', options = {}) {
  const { packageName = 'com.example.app', buttons = [] } = options;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Overlay UI Generator</title>
<style>
  body{font-family:system-ui,sans-serif;margin:40px;background:#f5f5f5;}
  h1{color:#1a237e;}
  pre{background:#272822;color:#f8f8f2;padding:16px;border-radius:6px;overflow-x:auto;}
  .card{background:#fff;padding:20px;border-radius:8px;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
  .btn{background:#1a237e;color:#fff;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;margin-right:8px;}
  .btn:hover{background:#3949ab;}
  .warn{background:#fff3e0;border-left:4px solid #ff9800;padding:12px;border-radius:4px;}
</style>
</head>
<body>
<h1>🎨 Generador de Overlay de UI</h1>

<div class="card">
  <h2>¿Qué hace esto?</h2>
  <p>Genera código para superponer botones y acciones sobre tu APK sin modificar los layouts originales. Ideal para añadir botones de prueba mientras depuras.</p>
</div>

<div class="card">
  <h2>1. Layout XML (overlay_layout.xml)</h2>
  <pre>${escapeHtml(generateOverlayLayout(packageName, buttons))}</pre>
</div>

<div class="card">
  <h2>2. Servicio de Overlay (OverlayService.kt)</h2>
  <pre>${escapeHtml(generateOverlayService(packageName))}</pre>
</div>

<div class="card warn">
  <h2>⚠️ Permiso requerido</h2>
  <p>El overlay necesita el permiso <code>SYSTEM_ALERT_WINDOW</code>. El usuario debe concederlo en Ajustes > Apps > Especial acceso > Mostrar sobre otras apps.</p>
</div>

<div class="card">
  <h2>3. Cómo usarlo</h2>
  <ol>
    <li>Añade el layout y el servicio a tu proyecto Android Studio.</li>
    <li>Declara el servicio en <code>AndroidManifest.xml</code> con el permiso.</li>
    <li>Inicia el servicio desde tu Activity principal.</li>
    <li>Instala el APK modificado en el emulador con <code>npm run install-apk</code>.</li>
  </ol>
</div>

<button onclick="window.print()">Imprimir / Guardar PDF</button>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
  return path.resolve(outputPath);
}

module.exports = {
  generateOverlayLayout,
  generateOverlayService,
  generateOverlayReport,
};
