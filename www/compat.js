/* =====================================================================
DISTRIMARKET · compat.js (capa de compatibilidad AUTONOMA y REUTILIZABLE)
---------------------------------------------------------------------
Hace que TODOS los modulos funcionen aunque app.js / firebase-config.js
NO existan o NO definan DB / Notif / Utils / Format / XLSX.
- DB -> persistencia en localStorage (JSON)
- Notif -> toasts visuales (success / error / warning / info)
- Utils -> generarId + exportarCSV
- Format -> dateTime / date
- XLSX -> polyfill OFFLINE: con internet usa el .xlsx real del CDN;
sin internet (o si el CDN falla) descarga .csv.
Es IDEMPOTENTE: usa guardas (window.X = window.X || impl) y guarda cada
implementacion en window.__le* para que __leEnsureGlobals() la restaure
si algun app.js "roto" la pisa.
USO: cargar como PRIMER <script> del <body> (o embebido en el <head>):
<script src="compat.js"></script>
===================================================================== */
(function () {
'use strict';
/* ---------------- DB (localStorage) ---------------- */
var DBimpl = {
    get: function (k, d) {
        try {
            var v = localStorage.getItem(k);
            if (v === null || v === undefined) return (d === undefined ? null : d);
            return JSON.parse(v);
        } catch (e) { return (d === undefined ? null : d); }
    },
    set: function (k, v) {
        try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    remove: function (k) {
        try { localStorage.removeItem(k); return true; } catch (e) { return false; }
    }
};
window.__leDB = DBimpl;
if (!window.DB || typeof window.DB.get !== 'function') window.DB = DBimpl;

/* ---------------- Apariencia (tema claro/oscuro, color, fuente, tamano de letra) ----------------
   Configuracion > General > Apariencia guarda estas preferencias en 'configGeneral'
   (tema, colorPrincipal, fuente, tamanoLetra), pero antes nada las aplicaba de verdad:
   el selector podia decir "Claro" y la pantalla se quedaba oscura siempre, porque no
   existia ningun mecanismo que leyera ese valor guardado y cambiara los estilos. Como
   compat.js lo carga CADA pagina del sistema (es de los primeros scripts de cada
   modulo), este es el unico lugar donde se puede aplicar la preferencia a TODA la
   aplicacion de una sola vez, sin tener que tocar los ~60 archivos HTML uno por uno.
   Los colores en si (tema claro) y el escalado de tamano de letra viven en
   estilos.css; aqui solo se decide que atributos ponerle a <html>. */
function aplicarApariencia() {
    try {
        var cfg = DBimpl.get('configGeneral', {}) || {};
        var raiz = document.documentElement;

        var tema = cfg.tema || 'oscuro';
        var temaFinal = tema;
        if (tema === 'automatico') {
            try { temaFinal = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'claro' : 'oscuro'; }
            catch (e) { temaFinal = 'oscuro'; }
        }
        if (temaFinal === 'claro') raiz.setAttribute('data-theme', 'claro');
        else raiz.removeAttribute('data-theme');

        if (cfg.colorPrincipal) raiz.style.setProperty('--color-primary', cfg.colorPrincipal);
        else raiz.style.removeProperty('--color-primary');

        if (cfg.fuente) raiz.style.setProperty('--font-family', cfg.fuente);
        else raiz.style.removeProperty('--font-family');

        if (cfg.tamanoLetra && cfg.tamanoLetra !== 'normal') raiz.setAttribute('data-font-size', cfg.tamanoLetra);
        else raiz.removeAttribute('data-font-size');
    } catch (e) {}
}
// Se aplica de inmediato (compat.js se carga antes de pintar el <body>, para evitar el
// "parpadeo" de ver primero oscuro y luego claro) y queda disponible como
// window.Apariencia.aplicar() para que config.html la vuelva a llamar justo despues de
// guardar cambios, mostrando el resultado al instante sin recargar la pagina.
aplicarApariencia();
window.Apariencia = { aplicar: aplicarApariencia };

/* ---------------- Notif (toasts) ---------------- */
var NotifImpl = (function () {
    var wrap = null;
    function ensure() {
        if (wrap && document.body && document.body.contains(wrap)) return wrap;
        wrap = document.createElement('div');
        wrap.id = '__leNotifWrap';
        wrap.style.cssText = 'position:fixed;top:16px;right:16px;z-index:999999;display:flex;flex-direction:column;gap:8px;max-width:340px;pointer-events:none;';
        (document.body || document.documentElement).appendChild(wrap);
        return wrap;
    }
    function show(msg, type) {
        try { console[(type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log')]('[Notif:' + type + ']', msg); } catch (e) {}
        try {
            var w = ensure();
            var d = document.createElement('div');
            var col = { success: '#28a745', error: '#dc3545', warning: '#d39e00', info: '#17a2b8' }[type] || '#667eea';
            d.style.cssText = 'background:#fff;border-left:4px solid ' + col + ';color:#2c3e50;padding:12px 14px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18);font:13px Segoe UI,sans-serif;opacity:0;transform:translateX(20px);transition:.25s;pointer-events:auto;';
            d.textContent = msg;
            w.appendChild(d);
            requestAnimationFrame(function () { d.style.opacity = '1'; d.style.transform = 'translateX(0)'; });
            setTimeout(function () {
                d.style.opacity = '0'; d.style.transform = 'translateX(20px)';
                setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 300);
            }, 3600);
        } catch (e) {}
    }
    return {
        success: function (m) { show(m, 'success'); },
        error: function (m) { show(m, 'error'); },
        warning: function (m) { show(m, 'warning'); },
        info: function (m) { show(m, 'info'); }
    };
})();
window.__leNotif = NotifImpl;
if (!window.Notif || typeof window.Notif.success !== 'function') window.Notif = NotifImpl;

/* ---------------- Utils ---------------- */
function _escCSV(v) { v = (v == null ? '' : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function _rowsToCSV(rows) {
    if (!rows || !rows.length) return '';
    var h = Object.keys(rows[0]);
    var out = [h.map(_escCSV).join(',')];
    for (var i = 0; i < rows.length; i++) out.push(h.map(function (k) { return _escCSV(rows[i][k]); }).join(','));
    return out.join('\n');
}
function _downloadText(text, name, mime) {
    var b = new Blob([text], { type: mime || 'text/csv;charset=utf-8;' });
    var u = URL.createObjectURL(b);
    var a = document.createElement('a');
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
}
var UtilsImpl = {
    generarId: function (p) { return (p || 'ID-') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    exportarCSV: function (rows, name) {
        if (!rows || !rows.length) { try { Notif.warning('Sin datos para exportar'); } catch (e) {} return; }
        _downloadText('' + _rowsToCSV(rows), (name || 'export') + '.csv', 'text/csv;charset=utf-8;');
        try { Notif.success('CSV descargado'); } catch (e) {}
    },
    // Varios módulos (config.html, facturacion.html, chat.html, backup_auto.html, firmas.html)
    // llaman a Utils.descargarArchivo(contenido, nombreArchivo, mime) para descargar un archivo
    // de texto/JSON generado en el navegador. Nunca estaba definida en ningún lado: cada llamada
    // terminaba en "Utils.descargarArchivo is not a function", interrumpiendo silenciosamente la
    // función justo en ese punto (lo anterior ya se guardaba, pero nada de lo que seguía se
    // ejecutaba: ni la descarga, ni el aviso de éxito, ni refrescar las listas en pantalla).
    descargarArchivo: function (contenido, nombreArchivo, mime) {
        _downloadText('' + (contenido == null ? '' : contenido), nombreArchivo || 'archivo.txt', mime || 'text/plain;charset=utf-8;');
    },
    _rowsToCSV: _rowsToCSV,
    _downloadText: _downloadText
};
window.__leUtils = UtilsImpl;
if (!window.Utils || typeof window.Utils.exportarCSV !== 'function') window.Utils = UtilsImpl;

/* ---------------- Format ---------------- */
var FormatImpl = {
    dateTime: function (iso) { if (!iso) return '-'; var d = new Date(iso); return isNaN(d.getTime()) ? '-' : d.toLocaleString('es-CO'); },
    date: function (iso) { if (!iso) return '-'; var d = new Date(iso); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-CO'); }
};
window.__leFormat = FormatImpl;
if (!window.Format || typeof window.Format.dateTime !== 'function') window.Format = FormatImpl;

/* ---------------- Polyfill XLSX (OFFLINE) ---------------- */
function _parseCSVText(text) {
    var rows = [], field = '', rec = [], inQ = false;
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    function pushField() { rec.push(field); field = ''; }
    function pushRec() { rows.push(rec); rec = []; }
    for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (inQ) {
            if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQ = false; } }
            else { field += ch; }
        } else {
            if (ch === '"') { inQ = true; }
            else if (ch === ',') { pushField(); }
            else if (ch === '\n') { pushField(); pushRec(); }
            else { field += ch; }
        }
    }
    if (field.length || rec.length) { pushField(); pushRec(); }
    while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
    if (!rows.length) return [];
    var header = rows[0], out = [];
    for (var r = 1; r < rows.length; r++) {
        var o = {};
        for (var c = 0; c < header.length; c++) o[header[c]] = (rows[r][c] !== undefined ? rows[r][c] : '');
        out.push(o);
    }
    return out;
}
var XlsxPoly = {
    __polyfill: true,
    utils: {
        book_new: function () { return { Sheets: {}, SheetNames: [] }; },
        json_to_sheet: function (arr) { return { __rows: (arr || []), __poly: true }; },
        book_append_sheet: function (wb, ws, name) { wb.Sheets[name] = ws; wb.SheetNames.push(name); },
        sheet_to_json: function (sheet) { return (sheet && sheet.__rows) ? sheet.__rows : []; }
    },
    read: function (data, opts) {
        var str = '';
        if (typeof data === 'string') str = data;
        else if (data && data.length !== undefined) {
            try {
                str = (typeof TextDecoder !== 'undefined')
                    ? new TextDecoder('utf-8').decode(data)
                    : (function () { var s = ''; for (var i = 0; i < data.length; i++) s += String.fromCharCode(data[i]); return s; })();
            } catch (e) { str = ''; }
        }
        // Si empieza con "PK" es un .xlsx real (ZIP): sin libreria no se puede parsear offline.
        if (str.charCodeAt(0) === 0x50 && str.charCodeAt(1) === 0x4B) {
            throw new Error('Leer .xlsx sin conexion no esta disponible; use .csv o conecte internet.');
        }
        var rows = _parseCSVText(str);
        var wb = { Sheets: {}, SheetNames: ['Sheet1'] };
        wb.Sheets['Sheet1'] = { __rows: rows, __poly: true };
        return wb;
    },
    writeFile: function (wb, filename) {
        var parts = [];
        (wb.SheetNames || []).forEach(function (n) {
            var ws = wb.Sheets[n];
            if (ws && ws.__rows) {
                if ((wb.SheetNames || []).length > 1) parts.push('### Hoja: ' + n + ' ###');
                parts.push(_rowsToCSV(ws.__rows));
            }
        });
        var name = String(filename || 'export.xlsx').replace(/\.xlsx$/i, '.csv').replace(/\.xls$/i, '.csv');
        _downloadText('' + parts.join('\n'), name, 'text/csv;charset=utf-8;');
        try { Notif.warning('Sin libreria Excel (offline): se descargo CSV. Con internet se genera .xlsx real.'); } catch (e) {}
    }
};
window.__leXlsx = XlsxPoly;
if (typeof window.XLSX === 'undefined') window.XLSX = XlsxPoly;

/* ---------------- ensureGlobals (restaura si algo las piso) ---------------- */
window.__leEnsureGlobals = function () {
    try {
        if (!window.DB || typeof window.DB.get !== 'function') window.DB = window.__leDB;
        else window.DB.get('__ping__', null);
    } catch (e) { window.DB = window.__leDB; }
    if (!window.Notif || typeof window.Notif.success !== 'function') window.Notif = window.__leNotif;
    if (!window.Utils || typeof window.Utils.exportarCSV !== 'function') window.Utils = window.__leUtils;
    if (!window.Format || typeof window.Format.dateTime !== 'function') window.Format = window.__leFormat;
    if (typeof window.XLSX === 'undefined') window.XLSX = window.__leXlsx;
};

try { console.log('%c[compat.js] capa autonoma cargada (DB/Notif/Utils/Format/XLSX)', 'color:#28a745;font-weight:bold'); } catch (e) {}
})();