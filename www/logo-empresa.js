/* =====================================================================
DISTRIMARKET · logo-empresa.js
---------------------------------------------------------------------
Pinta el LOGO de la empresa en el encabezado del menu (.sidebar-header)
de TODOS los modulos. Si no hay logo guardado, muestra iniciales.
Al pasar el mouse sobre el logo aparecen botones para:
[icono imagen] -> subir / cambiar logo
[icono basura] -> quitar logo
Es AUTONOMO: si DB / Notif no existen, define versiones minimas
(no rompe si falta app.js). Es idempotente (no duplica al recargar).
USO: cargar al FINAL del <body>:
<script src="logo-empresa.js"></script>
===================================================================== */
(function () {
'use strict';
/* ---- capas minimas de DB / Notif (por si faltan) ---- */
if (!window.DB || typeof window.DB.get !== 'function') {
    window.DB = {
        get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? (d === undefined ? null : d) : JSON.parse(v); } catch (e) { return d === undefined ? null : d; } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    };
}
if (!window.Notif || typeof window.Notif.success !== 'function') {
    window.Notif = {
        success: function (m) { try { console.log(m); } catch (e) {} },
        error: function (m) { try { console.error(m); } catch (e) {} },
        warning: function (m) { try { console.warn(m); } catch (e) {} },
        info: function (m) { try { console.log(m); } catch (e) {} }
    };
}

var LOGO = 'empresaLogo';
var NOMBRE = 'empresaNombre';

function getLogo() { try { return DB.get(LOGO, null) || localStorage.getItem(LOGO); } catch (e) { return null; } }
function getNombre() { try { return DB.get(NOMBRE, null) || localStorage.getItem(NOMBRE) || 'DISTRIMARKET'; } catch (e) { return 'DISTRIMARKET'; } }
// Antes, justo después de DB.set (que guarda el valor codificado en JSON), se
// volvía a escribir el mismo valor "crudo" (sin JSON.stringify) directo en
// localStorage, dejando el dato en un formato que DB.get() ya no podía leer
// (JSON.parse fallaba) — cualquier otro módulo que leyera 'empresaNombre' o
// 'empresaLogo' con DB.get() se quedaba siempre con el valor por defecto.
function setLogo(v) { try { DB.set(LOGO, v); } catch (e) {} }
function setNombre(v) { try { DB.set(NOMBRE, v); } catch (e) {} }

function iniciales(n) {
    n = String(n || '').trim();
    if (!n) return 'DM';
    var p = n.split(/[\s_-]+/);
    return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : n.substring(0, 2).toUpperCase();
}

function ensureStyle() {
    if (document.getElementById('__leLogoStyle')) return;
    var s = document.createElement('style');
    s.id = '__leLogoStyle';
    s.textContent =
        '.sidebar-header.le-rendered{display:flex;flex-direction:column;align-items:center;gap:6px;}' +
        '.le-logo-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;}' +
        '.le-logo-img{max-height:46px;max-width:150px;width:auto;height:auto;object-fit:contain;border-radius:6px;background:rgba(255,255,255,0.06);padding:3px;}' +
        '.le-logo-fb{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff;background:linear-gradient(135deg,#667eea,#764ba2);box-shadow:0 2px 8px rgba(0,0,0,.25);letter-spacing:1px;}' +
        '.le-logo-btns{position:absolute;top:-8px;right:-30px;display:flex;flex-direction:column;gap:4px;opacity:0;transition:opacity .2s;}' +
        '.sidebar-header:hover .le-logo-btns,.le-logo-wrap:focus-within .le-logo-btns{opacity:1;}' +
        '.le-logo-btns button{width:22px;height:22px;border:none;border-radius:6px;cursor:pointer;font-size:11px;background:rgba(255,255,255,.2);color:#fff;line-height:1;}' +
        '.le-logo-btns button:hover{background:rgba(255,255,255,.4);}';
    (document.head || document.documentElement).appendChild(s);
}

function pintar() {
    ensureStyle();
    var hs = document.querySelectorAll('.sidebar-header');
    if (!hs.length) return; // si aun no existe el DOM, el boot reintentara
    var logo = getLogo();
    var nombre = getNombre();

    var inner =
        '<div class="le-logo-wrap">' +
            (logo
                ? '<img class="le-logo-img" src="' + logo + '" alt="' + String(nombre).replace(/"/g, '&quot;') + '">'
                : '<span class="le-logo-fb">' + iniciales(nombre) + '</span>') +
            '<div class="le-logo-btns">' +
                '<button type="button" title="Subir / cambiar logo" class="__leUp">+</button>' +
                '<button type="button" title="Quitar logo" class="__leDel">x</button>' +
            '</div>' +
        '</div>';

    for (var i = 0; i < hs.length; i++) {
        var h = hs[i];
        // conservar el <small> original una sola vez
        if (!h.hasAttribute('data-le-sub')) {
            var sm = h.querySelector('small');
            h.setAttribute('data-le-sub', sm ? sm.textContent : '');
        }
        var sub = h.getAttribute('data-le-sub') || '';
        h.classList.add('le-rendered');
        h.innerHTML = inner + (sub ? '<small>' + sub + '</small>' : '');

        var up = h.querySelector('.__leUp');
        var del = h.querySelector('.__leDel');

        if (up) up.onclick = function () {
            var inp = document.createElement('input');
            inp.type = 'file'; inp.accept = 'image/*';
            inp.onchange = function () {
                var f = inp.files && inp.files[0];
                if (!f) return;
                if (f.size > 2 * 1024 * 1024) { try { alert('Logo muy pesado (max 2 MB).'); } catch (e) {} return; }
                var r = new FileReader();
                r.onload = function (ev) {
                    setLogo(ev.target.result);
                    var nm = null;
                    try { nm = prompt('Nombre de la empresa (se muestra bajo el logo):', getNombre()); } catch (e) {}
                    if (nm) setNombre(nm);
                    pintar();
                    try { Notif.success('Logo actualizado en todos los menus'); } catch (e) {}
                };
                r.readAsDataURL(f);
            };
            inp.click();
        };

        if (del) del.onclick = function () {
            var ok = false;
            try { ok = confirm('Quitar el logo de la empresa?'); } catch (e) { ok = true; }
            if (!ok) return;
            setLogo(null);
            pintar();
            try { Notif.info('Logo quitado'); } catch (e) {}
        };
    }
}

/* ---- API publica (por si quieres usarla desde config.html u otro modulo) ---- */
window.LogoEmpresa = {
    get: function () { return { logo: getLogo(), nombre: getNombre() }; },
    set: function (dataUri, nombre) { setLogo(dataUri); if (nombre) setNombre(nombre); pintar(); },
    setNombre: function (nombre) { setNombre(nombre); pintar(); },
    clear: function () { setLogo(null); pintar(); },
    render: pintar
};

/* ---- arranque con reintentos (por si el script corre antes del DOM) ---- */
function boot() {
    pintar();
    // reintentos de seguridad por si el menu se pinta tarde
    setTimeout(pintar, 200);
    setTimeout(pintar, 800);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

try { console.log('%c[logo-empresa.js] cargado OK (logo en el menu)', 'color:#28a745;font-weight:bold'); } catch (e) {}
})();
