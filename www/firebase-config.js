/* =====================================================================
DISTRIMARKET · firebase-config.js (LIMPIO · a prueba de fallos)
---------------------------------------------------------------------
Capa de persistencia + sincronizacion OPCIONAL con Firebase.
Comportamiento por defecto (sin tocar nada):
-> MODO OFFLINE: todo se guarda en localStorage. CERO errores.
-> Define/refuerza DB / Notif / Utils / Format (idempotente).
Si algun dia quieres nube (Firebase Firestore):
-> Pega tus credenciales con FBConfig.setCredentials({...})
desde la consola o desde config.html, y recarga.
-> Opcionalmente activa espejo en la nube con FBConfig.setSync(true).
NUNCA rompe: si el SDK de Firebase no carga o no hay credenciales,
simplemente queda en modo localStorage y avisa por consola.
USO: cargar despues de compat.js (o de la capa embebida), al final del <body>:
<script src="firebase-config.js"></script>
===================================================================== */
(function () {
'use strict';
/* ============================================================
   1) CREDENCIALES (vacias por defecto => modo OFFLINE)
   ------------------------------------------------------------
   Puedes rellenarlas de 2 formas:
     a) Editando este objeto (pon tus valores reales).
     b) Sin tocar el archivo: desde la consola o config.html:
          FBConfig.setCredentials({ apiKey:'...', authDomain:'...', ... });
        (se guardan en localStorage y se usan al recargar).
   ============================================================ */
var DEFAULT_CFG = {
    /* Credenciales reales del proyecto de Firebase (distrimarketat). Antes este
       objeto estaba vacio y cada pagina dependia de que alguien hubiera guardado
       las credenciales a mano con FBConfig.setCredentials(...), pero eso se
       guarda en localStorage POR ORIGEN: lo que se guarda abriendo config.html
       como archivo local (origen "file://", en el computador) nunca llega al
       origen "https://app.distrimarketat.com" que carga el celular (son
       almacenamientos completamente separados). Por eso el celular nunca tenia
       credenciales aunque el computador ya estuviera "conectado". Con las
       credenciales puestas aqui, CUALQUIER pagina que cargue este archivo -el
       computador, el celular, cualquier equipo nuevo- se conecta sola, sin
       depender de que alguien las haya pegado antes en ese equipo en particular. */
    apiKey: 'AIzaSyBi2azVYJyeEGCxuNRpM0IB5eenDLktn74',
    authDomain: 'distrimarketat.firebaseapp.com',
    projectId: 'distrimarketat',
    storageBucket: 'distrimarketat.firebasestorage.app',
    messagingSenderId: '705572006338',
    appId: '1:705572006338:web:f478997a11c8ef7c4e0e5b'
};

function readStoredCreds() {
    try {
        var raw = localStorage.getItem('fbCredentials');
        if (!raw) return null;
        var o = JSON.parse(raw);
        return (o && o.apiKey) ? o : null;
    } catch (e) { return null; }
}
function mergeCfg() {
    var stored = readStoredCreds();
    var base = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) ? window.FIREBASE_CONFIG : DEFAULT_CFG;
    var src = stored || base;
    return {
        apiKey: src.apiKey || '',
        authDomain: src.authDomain || '',
        projectId: src.projectId || '',
        storageBucket: src.storageBucket || '',
        messagingSenderId: src.messagingSenderId || '',
        appId: src.appId || ''
    };
}
function hasRealCreds(c) {
    return !!(c && c.apiKey && c.projectId && c.apiKey.indexOf('TU_') !== 0 && c.apiKey.length > 10);
}

/* ============================================================
   2) CAPA MINIMA DB / Notif / Utils / Format (idempotente)
   ------------------------------------------------------------
   Si compat.js o la capa embebida ya las definieron, NO se pisan.
   Si no existen (p.ej. abriste el modulo sin ellos), se crean aqui
   para que el sistema funcione SIEMPRE.
   ============================================================ */
if (!window.DB || typeof window.DB.get !== 'function') {
    window.DB = {
        get: function (k, d) { try { var v = localStorage.getItem(k); return (v === null || v === undefined) ? (d === undefined ? null : d) : JSON.parse(v); } catch (e) { return (d === undefined ? null : d); } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
        remove: function (k) { try { localStorage.removeItem(k); return true; } catch (e) { return false; } }
    };
}
if (!window.Notif || typeof window.Notif.success !== 'function') {
    window.Notif = (function () {
        var wrap = null;
        function ensure() {
            if (wrap && document.body && document.body.contains(wrap)) return wrap;
            wrap = document.createElement('div'); wrap.id = '__leNotifWrap2';
            wrap.style.cssText = 'position:fixed;top:16px;right:16px;z-index:999999;display:flex;flex-direction:column;gap:8px;max-width:340px;pointer-events:none;';
            (document.body || document.documentElement).appendChild(wrap); return wrap;
        }
        function show(msg, type) {
            try { console[(type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log')]('[Notif:' + type + ']', msg); } catch (e) {}
            try {
                var w = ensure(); var d = document.createElement('div');
                var col = { success: '#28a745', error: '#dc3545', warning: '#d39e00', info: '#17a2b8' }[type] || '#667eea';
                d.style.cssText = 'background:#fff;border-left:4px solid ' + col + ';color:#2c3e50;padding:12px 14px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18);font:13px Segoe UI,sans-serif;opacity:0;transform:translateX(20px);transition:.25s;pointer-events:auto;';
                d.textContent = msg; w.appendChild(d);
                requestAnimationFrame(function () { d.style.opacity = '1'; d.style.transform = 'translateX(0)'; });
                setTimeout(function () { d.style.opacity = '0'; d.style.transform = 'translateX(20px)'; setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 300); }, 3600);
            } catch (e) {}
        }
        return { success: function (m) { show(m, 'success'); }, error: function (m) { show(m, 'error'); }, warning: function (m) { show(m, 'warning'); }, info: function (m) { show(m, 'info'); } };
    })();
}
if (!window.Utils || typeof window.Utils.exportarCSV !== 'function') {
    (function () {
        function esc(v) { v = (v == null ? '' : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
        function rows(rows) { if (!rows || !rows.length) return ''; var h = Object.keys(rows[0]); var o = [h.map(esc).join(',')]; for (var i = 0; i < rows.length; i++) o.push(h.map(function (k) { return esc(rows[i][k]); }).join(',')); return o.join('\n'); }
        function dl(text, name, mime) { var b = new Blob([text], { type: mime || 'text/csv;charset=utf-8;' }); var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); }
        window.Utils = window.Utils || {};
        window.Utils.generarId = window.Utils.generarId || function (p) { return (p || 'ID-') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
        window.Utils.exportarCSV = function (r, n) { if (!r || !r.length) { try { Notif.warning('Sin datos para exportar'); } catch (e) {} return; } dl(rows(r), (n || 'export') + '.csv', 'text/csv;charset=utf-8;'); try { Notif.success('CSV descargado'); } catch (e) {} };
    })();
}
if (!window.Format || typeof window.Format.dateTime !== 'function') {
    window.Format = {
        dateTime: function (iso) { if (!iso) return '-'; var d = new Date(iso); return isNaN(d.getTime()) ? '-' : d.toLocaleString('es-CO'); },
        date: function (iso) { if (!iso) return '-'; var d = new Date(iso); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-CO'); }
    };
}

// guarda referencias "buenas" para poder restaurarlas
window.__leDB = window.__leDB || window.DB;
window.__leNotif = window.__leNotif || window.Notif;
window.__leUtils = window.__leUtils || window.Utils;
window.__leFormat = window.__leFormat || window.Format;

/* ============================================================
   3) ESTADO DE FIREBASE
   ============================================================ */
var fbApp = null;     // instancia de firebase.initializeApp
var fbDb = null;      // firestore()
var fbOnline = false; // true solo si SDK cargo Y hay credenciales reales Y conecto
var fbSync = false;   // espejo en la nube (off por defecto)
/* Antes, si un write o un read a Firestore fallaba (por ejemplo por las reglas
   de seguridad del proyecto, que es la causa más común de "activé la
   sincronización en los dos equipos y aun así nunca llegó nada"), el error
   quedaba totalmente escondido: cloudWrite lo tragaba en silencio y cloudRead
   simplemente devolvía "no hay nada en la nube" como si la clave no
   existiera. Así era imposible saber si el problema era de verdad "no hay
   datos" o "Firestore está rechazando la operación". Ahora se guarda el
   último error real (con su mensaje) para que Configuración → Avanzado lo
   pueda mostrar tal cual, en vez de solo decir "activa/desactivada". */
var fbUltimoError = null; // { key, accion:'push'|'pull', mensaje, fechaMs } o null
function registrarErrorCloud(key, accion, e) {
    var mensaje = (e && e.message) ? e.message : String(e || 'error desconocido');
    fbUltimoError = { key: key, accion: accion, mensaje: mensaje, fechaMs: Date.now() };
    logErr('fallo al ' + (accion === 'push' ? 'subir' : 'bajar') + ' "' + key + '": ' + mensaje);
}

function logOk(m) { try { console.log('%c[firebase-config] ' + m, 'color:#28a745;font-weight:bold'); } catch (e) {} }
function logWarn(m) { try { console.warn('[firebase-config] ' + m); } catch (e) {} }
function logErr(m) { try { console.error('[firebase-config] ' + m); } catch (e) {} }

/* ---- carga del SDK con 2 CDN fallback (no rompe si fallan) ---- */
function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = function () { resolve(true); };
        s.onerror = function () { reject(new Error('fallo CDN ' + src)); };
        document.head.appendChild(s);
    });
}
function loadFirebaseSDK() {
    if (typeof window.firebase !== 'undefined' && window.firebase.apps) return Promise.resolve(true);
    var urls = [
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
        'https://cdn.jsdelivr.net/npm/firebase@9.23.0/dist/compat/firebase-app.js'
    ];
    function tryOne(i) {
        if (i >= urls.length) return Promise.reject(new Error('todos los CDN fallaron'));
        return loadScript(urls[i]).catch(function () { return tryOne(i + 1); });
    }
    return tryOne(0).then(function () {
        var fsUrls = [
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
            'https://cdn.jsdelivr.net/npm/firebase@9.23.0/dist/compat/firebase-firestore.js'
        ];
        function tryFs(j) {
            if (j >= fsUrls.length) return Promise.reject(new Error('firestore CDN fallo'));
            return loadScript(fsUrls[j]).catch(function () { return tryFs(j + 1); });
        }
        return tryFs(0);
    }).then(function () {
        // Carga tambien el SDK de Authentication: lo necesita el inicio de sesion
        // anonimo de mas abajo (ver initFirebase), que es lo que hace que las
        // reglas de seguridad de Firestore puedan exigir "solo si hay sesion" en
        // vez de dejar la base de datos abierta a cualquiera que descubra esta
        // configuracion.
        var authUrls = [
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
            'https://cdn.jsdelivr.net/npm/firebase@9.23.0/dist/compat/firebase-auth.js'
        ];
        function tryAuth(k) {
            if (k >= authUrls.length) return Promise.reject(new Error('auth CDN fallo'));
            return loadScript(authUrls[k]).catch(function () { return tryAuth(k + 1); });
        }
        return tryAuth(0);
    });
}

/* ---- inicializa Firebase si hay credenciales reales ----
   cb(ok, mensaje) es opcional: se llama UNA vez que se sabe el resultado real
   (conectado o no), para que una pantalla (ej. Configuracion) pueda mostrar
   el estado real en vez de adivinar con un setTimeout a ciegas. */
function initFirebase(cb) {
    var cfg = mergeCfg();
    window.FIREBASE_CONFIG = cfg;
    if (!hasRealCreds(cfg)) {
        logOk('modo OFFLINE (localStorage). Sin credenciales de Firebase configuradas.');
        fbOnline = false;
        if (cb) cb(false, 'Sin credenciales de Firebase configuradas.');
        return;
    }
    // si el usuario pidio explicitamente NO sincronizar, ni intentamos
    if (window.FB_SYNC === false && readStoredSync() === false) {
        logOk('credenciales presentes pero sincronizacion desactivada (FB_SYNC=false). Modo localStorage.');
        fbOnline = false;
        if (cb) cb(false, 'Credenciales guardadas, pero la sincronizacion esta desactivada.');
        return;
    }
    loadFirebaseSDK().then(function () {
        try {
            if (typeof window.firebase === 'undefined') throw new Error('SDK no disponible tras cargar');
            if (!window.firebase.apps.length) {
                fbApp = window.firebase.initializeApp(cfg);
            } else {
                fbApp = window.firebase.app();
            }
            fbDb = window.firebase.firestore();
            // Algunos computadores (por el antivirus, un firewall o una VPN de la
            // red de la oficina) dejan pasar la conexion inicial pero bloquean el
            // canal permanente que Firestore usa por defecto para leer/escribir
            // (WebChannel) -eso se ve como "conectado" al principio y luego, al
            // intentar leer o escribir algo real, "Failed to get document because
            // the client is offline" una y otra vez, aunque internet si funcione
            // bien para todo lo demas. autoDetectLongPolling hace que, cuando
            // detecta ese bloqueo, Firestore cambie solo a una conexion mas
            // compatible (parecida a como cargan las paginas normales) en vez de
            // insistir con el canal que esa red esta bloqueando.
            try {
                fbDb.settings({ experimentalAutoDetectLongPolling: true, merge: true });
            } catch (eSettings) { logWarn('no se pudo ajustar el modo de conexion de Firestore: ' + (eSettings && eSettings.message ? eSettings.message : eSettings)); }
            // Inicia sesion anonima ANTES de tocar Firestore: las reglas de
            // seguridad exigen "request.auth != null", asi que sin esto
            // cualquier lectura/escritura sale con "Missing or insufficient
            // permissions" aunque las credenciales del proyecto sean
            // correctas (esta fue la causa real de que la sincronizacion
            // nunca funcionara, en ningun equipo, desde siempre). El
            // vendedor no ve nada de esto: es automatico y silencioso.
            window.firebase.auth().signInAnonymously().then(function () {
                // ping de conexion
                fbDb.enableNetwork().then(function () {
                    fbOnline = true;
                    fbSync = (window.FB_SYNC === true) || (readStoredSync() === true);
                    logOk('conectado a Firestore (proyecto: ' + cfg.projectId + ', sesion anonima activa). Sincronizacion en nube: ' + (fbSync ? 'ACTIVA' : 'inactiva (solo lectura local)') + '.');
                    if (fbSync) startMirror();
                    autoBootstrapPull();
                    if (cb) cb(true, 'Conectado a Firestore (proyecto: ' + cfg.projectId + ').');
                }).catch(function (e) {
                    fbOnline = false; var msg = 'No se pudo habilitar la red de Firestore: ' + (e && e.message ? e.message : e) + '.';
                    logWarn(msg + ' Queda en modo localStorage.');
                    if (cb) cb(false, msg);
                });
            }).catch(function (e) {
                fbOnline = false; var msgA = 'No se pudo autenticar con Firebase (login anonimo): ' + (e && e.message ? e.message : e) + '.';
                logErr(msgA + ' Queda en modo localStorage. Revisa que el metodo "Anonimo" este habilitado en Firebase Authentication.');
                if (cb) cb(false, msgA);
            });
        } catch (e) {
            fbOnline = false; var msg2 = 'Error al inicializar Firebase: ' + (e && e.message ? e.message : e) + '.';
            logErr(msg2 + ' Queda en modo localStorage.');
            if (cb) cb(false, msg2);
        }
    }).catch(function (e) {
        fbOnline = false; var msg3 = 'El SDK de Firebase no cargo (' + (e && e.message ? e.message : e) + ').';
        logWarn(msg3 + ' Queda en modo localStorage (sin nube).');
        if (cb) cb(false, msg3);
    });
}

function readStoredSync() {
    try { var v = localStorage.getItem('fbSync'); return v === null ? null : (v === 'true'); } catch (e) { return null; }
}

/* ============================================================
   4) ESPEJO EN LA NUBE (solo si fbSync=true)
   ------------------------------------------------------------
   Write-through: cada DB.set guarda en localStorage (fuente local)
   Y, si hay nube activa, tambien escribe un doc en Firestore.
   get() siempre lee de localStorage (rapido y offline-first).
   Esto NUNCA bloquea la UI: los writes a la nube son "fire & forget".
   ============================================================ */
function cloudWrite(key, value) {
    if (!fbOnline || !fbSync || !fbDb) return;
    try {
        fbDb.collection('distrimarket').doc(safeDocId(key)).set({
            key: key,
            value: value,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function () {
            // recordamos que esta clave quedo al dia (asi no se vuelve a bajar como si fuera "nueva")
            var m = leerSyncMeta(); m[key] = m[key] || {}; m[key].lastPushMs = Date.now(); m[key].lastSyncMs = Date.now(); guardarSyncMeta(m);
        }).catch(function (e) { registrarErrorCloud(key, 'push', e); /* la copia local ya esta segura de todas formas */ });
    } catch (e) { registrarErrorCloud(key, 'push', e); }
}
function safeDocId(key) {
    // Firestore no permite / ni ciertos chars en doc id; los mapeamos
    return String(key).replace(/[\/#\[\]$]/g, '_');
}
function startMirror() {
    // opcional: al conectar, subir una copia de las claves clave del sistema
    // (se hace en background y sin bloquear). Solo algunas para no saturar.
    var keys = ['user', 'clientes', 'productos', 'enviosLogistica', 'transportadorasLogistica', 'bodegasMulti', 'stockMulti'];
    keys.forEach(function (k) {
        try {
            var raw = localStorage.getItem(k);
            if (raw !== null && raw !== undefined) cloudWrite(k, JSON.parse(raw));
        } catch (e) {}
    });
}

/* ============================================================
   4-bis) SINCRONIZACION REAL EN DOS SENTIDOS (nube -> local)
   ------------------------------------------------------------
   Antes de esto, firebase-config.js solo sabia EMPUJAR datos de este
   equipo hacia la nube (cloudWrite). Nunca traia nada de vuelta, asi
   que un celular de vendedor que recien se conecta nunca recibia el
   catalogo de productos ni los clientes de la oficina, y la oficina
   nunca recibia las ventas/visitas hechas desde el celular -el boton
   "Sincronizar" de la app del vendedor solo mostraba un mensaje de
   exito sin hacer nada real.

   Como se resuelve:
   - __fbSyncMeta (una clave propia en localStorage, separada de los
     datos reales) recuerda, por cada clave sincronizada, la ultima
     vez (en milisegundos) que SE SABE que local y nube quedaron
     iguales. Sirve para decidir si lo que hay en la nube es mas
     nuevo que lo que ya se tiene aqui.
   - cloudRead(key) trae el documento real de Firestore (si existe) y
     su fecha real (updatedAt, convertida a milisegundos).
   - pullKeys([...]) compara esa fecha contra __fbSyncMeta y, SOLO si
     la nube es mas nueva, sobreescribe la clave local -usando una
     bandera (_aplicandoRemoto) para que ese mismo guardado no se
     vuelva a empujar a la nube como si fuera un cambio nuevo (eso
     causaria un "ping-pong" infinito entre el equipo y la nube).
   - pushKeys([...]) sube el valor actual de cada clave, igual que
     cloudWrite, pero esperando la confirmacion real de Firestore
     para poder avisar si en verdad se guardo o no (cloudWrite es
     "disparar y olvidar": no basta para que un boton le diga a un
     vendedor si su venta en verdad subio).
   - FBConfig.syncNow({pull:[...], push:[...]}, cb) es lo que usan los
     botones "Sincronizar": primero intenta bajar lo nuevo de la nube
     y, solo para las claves que NO se acaban de actualizar desde la
     nube en esa misma vuelta, sube lo que haya localmente. cb recibe
     el resultado real (que bajo, que subio, o por que no se pudo).
   ============================================================ */
var SYNC_META_KEY = '__fbSyncMeta';
var _aplicandoRemoto = false; // true mientras se escribe localmente algo que vino de la nube

function leerSyncMeta() {
    try { var raw = localStorage.getItem(SYNC_META_KEY); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
}
function guardarSyncMeta(m) {
    try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(m)); } catch (e) {}
}
function cloudRead(key) {
    return new Promise(function (resolve) {
        if (!fbOnline || !fbDb) { resolve(null); return; }
        try {
            fbDb.collection('distrimarket').doc(safeDocId(key)).get().then(function (doc) {
                if (!doc.exists) { resolve(null); return; }
                var data = doc.data();
                var ms = 0;
                try { ms = (data.updatedAt && typeof data.updatedAt.toMillis === 'function') ? data.updatedAt.toMillis() : 0; } catch (e2) {}
                resolve({ value: data.value, updatedAtMs: ms });
            }).catch(function (e) { registrarErrorCloud(key, 'pull', e); resolve(null); });
        } catch (e) { registrarErrorCloud(key, 'pull', e); resolve(null); }
    });
}
function pullKeys(keys) {
    var meta = leerSyncMeta();
    return Promise.all((keys || []).map(function (k) {
        return cloudRead(k).then(function (remoto) {
            if (!remoto) return { key: k, estado: 'sin_datos_en_la_nube' };
            var conocidoHasta = (meta[k] && meta[k].lastSyncMs) || 0;
            if (remoto.updatedAtMs && remoto.updatedAtMs > conocidoHasta) {
                _aplicandoRemoto = true;
                try { window.DB.set(k, remoto.value); } finally { _aplicandoRemoto = false; }
                meta[k] = meta[k] || {}; meta[k].lastSyncMs = remoto.updatedAtMs; meta[k].lastPullMs = Date.now();
                return { key: k, estado: 'actualizado_desde_la_nube' };
            }
            return { key: k, estado: 'sin_cambios' };
        }).catch(function (e) { return { key: k, estado: 'error', error: e && e.message }; });
    })).then(function (resultados) { guardarSyncMeta(meta); return resultados; });
}
function pushKeys(keys) {
    return Promise.all((keys || []).map(function (k) {
        return new Promise(function (resolve) {
            if (!fbOnline || !fbSync || !fbDb) { resolve({ key: k, estado: 'sin_conexion' }); return; }
            var raw; try { raw = localStorage.getItem(k); } catch (e) { raw = null; }
            if (raw === null || raw === undefined) { resolve({ key: k, estado: 'sin_datos_locales' }); return; }
            var valor; try { valor = JSON.parse(raw); } catch (e) { resolve({ key: k, estado: 'error', error: 'dato local invalido (no es JSON)' }); return; }
            try {
                fbDb.collection('distrimarket').doc(safeDocId(k)).set({
                    key: k, value: valor, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).then(function () {
                    var m = leerSyncMeta(); m[k] = m[k] || {}; m[k].lastPushMs = Date.now(); m[k].lastSyncMs = Date.now(); guardarSyncMeta(m);
                    resolve({ key: k, estado: 'subido' });
                }).catch(function (e) { resolve({ key: k, estado: 'error', error: e && e.message }); });
            } catch (e) { resolve({ key: k, estado: 'error', error: e && e.message }); }
        });
    }));
}

/* ============================================================
   4-ter) ARRANQUE AUTOMATICO DESDE LA NUBE (bootstrap silencioso)
   ------------------------------------------------------------
   Antes de esto, un equipo o navegador que NUNCA habia abierto esta app
   (un computador nuevo, o el mismo computador pero en OTRO navegador -por
   ejemplo Chrome en vez del navegador de siempre-) arrancaba con
   localStorage completamente vacio: sin clientes, sin productos, sin
   logo, sin usuarios -como si fuera una empresa nueva desde cero-, aunque
   en la nube ya hubiera toda la informacion real. Esto pasaba porque
   localStorage es exclusivo de cada navegador: nunca se comparte solo.

   Para que "abrir esta carpeta en cualquier navegador/computador" traiga
   siempre lo ultimo real (sin tener que tocar ningun boton), cada vez que
   una pagina se conecta a Firestore trae estas claves maestras. Si
   encuentra algo mas nuevo que lo que hay localmente (o si no hay nada
   local todavia), actualiza localStorage y recarga la pagina UNA sola vez
   para que se vea de inmediato -el mismo patron que ya usa la app del
   vendedor, pero generalizado a todas las paginas que cargan este
   archivo-. Esto NO depende de que la sincronizacion este "activada" en
   ese equipo (ese interruptor solo controla si ESTE equipo sube sus
   propios cambios); traer lo que ya existe en la nube siempre es seguro. */
var CLAVES_MAESTRAS = ['clientes', 'productos', 'vendedores', 'usuariosSistema', 'empresaLogo', 'empresaNombre'];
function autoBootstrapPull() {
    if (window.DM_SKIP_AUTOBOOTSTRAP) return; // paginas que ya manejan su propio refresco (ej. vendedor.html)
    try {
        pullKeys(CLAVES_MAESTRAS).then(function (resultados) {
            var actualizadas = resultados.filter(function (r) { return r.estado === 'actualizado_desde_la_nube'; });
            if (!actualizadas.length) return;
            var yaRecargo = false;
            try { yaRecargo = sessionStorage.getItem('__dmBootstrapReload') === '1'; } catch (e) {}
            var claves = actualizadas.map(function (r) { return r.key; }).join(', ');
            if (yaRecargo) { logOk('datos de la nube actualizados en segundo plano (' + claves + '); se veran en la proxima carga.'); return; }
            try { sessionStorage.setItem('__dmBootstrapReload', '1'); } catch (e) {}
            logOk('trayendo datos reales de la nube al abrir por primera vez en este navegador (' + claves + '). Recargando...');
            location.reload();
        }).catch(function (e) { logWarn('no se pudo revisar si habia datos nuevos en la nube: ' + (e && e.message ? e.message : e)); });
    } catch (e) {}
}

// "envuelve" DB.set para hacer write-through sin romper la API existente
(function wrapDB() {
    var origSet = window.DB.set;
    if (window.DB.__fbWrapped) return;
    window.DB.__fbWrapped = true;
    window.DB.set = function (k, v) {
        var ok = false;
        try { ok = origSet.call(window.DB, k, v); } catch (e) { ok = false; }
        if (!_aplicandoRemoto) cloudWrite(k, v); // no bloquea (salvo cuando el propio valor vino de la nube)
        return ok;
    };
})();

/* ============================================================
   5) SESION DE USUARIO (lo que leen los modulos: DB.get('user'))
   ------------------------------------------------------------
   Si Firebase Auth estuviera activo, podrias enlazarlo aqui.
   Por defecto, la sesion vive en localStorage (login.html la escribe).
   ============================================================ */
function currentUser() {
    try { return window.DB.get('user', null); } catch (e) { return null; }
}

/* ============================================================
   6) API PUBLICA: window.FBConfig
   ============================================================ */
window.FBConfig = {
    // pega credenciales sin editar el archivo (se guardan en localStorage)
    setCredentials: function (obj) {
        try {
            if (!obj || typeof obj !== 'object') { logErr('setCredentials: objeto invalido'); return false; }
            localStorage.setItem('fbCredentials', JSON.stringify(obj));
            window.FIREBASE_CONFIG = mergeCfg();
            logOk('credenciales guardadas. Recarga para aplicar (Ctrl+Shift+R).');
            try { Notif.success('Credenciales de Firebase guardadas. Recarga la pagina.'); } catch (e) {}
            return true;
        } catch (e) { logErr('no se pudieron guardar las credenciales: ' + (e && e.message ? e.message : e)); return false; }
    },
    clearCredentials: function () {
        try { localStorage.removeItem('fbCredentials'); window.FIREBASE_CONFIG = DEFAULT_CFG; logOk('credenciales borradas. Recarga para volver a modo OFFLINE.'); try { Notif.info('Credenciales borradas. Recarga la pagina.'); } catch (e) {} return true; } catch (e) { return false; }
    },
    // activa/desactiva el espejo en la nube
    setSync: function (on) {
        try { localStorage.setItem('fbSync', on ? 'true' : 'false'); window.FB_SYNC = !!on; logOk('sincronizacion en nube: ' + (on ? 'ACTIVA' : 'DESACTIVADA') + '. Recarga para aplicar.'); try { Notif.success('Sincronizacion ' + (on ? 'activada' : 'desactivada') + '. Recarga la pagina.'); } catch (e) {} return true; } catch (e) { return false; }
    },
    isOnline: function () { return fbOnline; },
    // El último error real de Firestore (push o pull), o null si nunca ha fallado
    // uno desde que se cargó la página. Úsalo para mostrar la causa real (por
    // ejemplo "Missing or insufficient permissions" = las reglas de seguridad de
    // Firestore están bloqueando la escritura/lectura) en vez de solo "no sincronizó".
    ultimoError: function () { return fbUltimoError; },
    // Lee primero lo que el usuario guardó (localStorage), no solo la variable en memoria.
    // La variable fbSync solo se actualiza DESPUÉS de que Firestore termine de conectar
    // (eso es asíncrono - tarda un instante). Si una pantalla pregunta "¿está activa la
    // sincronización?" justo al cargar la página (antes de que termine esa conexión), fbSync
    // todavía tiene su valor por defecto (false), aunque el usuario ya la haya activado y eso
    // esté guardado en localStorage. Por eso el checkbox de Configuración se recargaba y
    // volvía a aparecer destildado: estaba leyendo la variable vieja, no lo guardado.
    isSync: function () {
        var guardado = readStoredSync();
        return guardado !== null ? guardado : fbSync;
    },
    getConfig: function () { return mergeCfg(); },
    currentUser: currentUser,
    // fuerza un re-chequeo (util tras pegar credenciales). cb(ok, mensaje) opcional: avisa el resultado real.
    reconnect: function (cb) { fbOnline = false; fbDb = null; fbApp = null; initFirebase(cb); },
    // Sincronizacion real en dos sentidos. opts: { pull:[claves a traer de la nube si son mas nuevas],
    // push:[claves a subir con el valor que hay en este equipo] }. cb(resultado) opcional.
    // resultado = {ok:true, pull:[{key,estado}...], push:[{key,estado}...]} o {ok:false, motivo:'sin_credenciales'|'sin_conexion'|'error'}
    syncNow: function (opts, cb) {
        opts = opts || {};
        var pull = opts.pull || [];
        var push = opts.push || [];
        if (!fbOnline || !fbDb) {
            var motivo = !hasRealCreds(mergeCfg()) ? 'sin_credenciales' : (fbSync ? 'sin_conexion' : 'sincronizacion_desactivada');
            var r0 = { ok: false, motivo: motivo };
            if (cb) cb(r0);
            return Promise.resolve(r0);
        }
        return pullKeys(pull).then(function (resultadosPull) {
            // lo que acaba de bajar de la nube no se vuelve a subir en la misma vuelta (ya estan iguales)
            var actualizadas = resultadosPull.filter(function (r) { return r.estado === 'actualizado_desde_la_nube'; }).map(function (r) { return r.key; });
            var aPushear = push.filter(function (k) { return actualizadas.indexOf(k) === -1; });
            return pushKeys(aPushear).then(function (resultadosPush) {
                var resultado = { ok: true, pull: resultadosPull, push: resultadosPush };
                if (cb) cb(resultado);
                return resultado;
            });
        }).catch(function (e) {
            var r1 = { ok: false, motivo: 'error', error: e && e.message };
            if (cb) cb(r1);
            return r1;
        });
    }
};

/* ============================================================
   7) WATCHDOG: restaura globals si algo las pisa despues
   ============================================================ */
window.__leEnsureGlobals = function () {
    try { if (!window.DB || typeof window.DB.get !== 'function') window.DB = window.__leDB; else window.DB.get('__ping__', null); } catch (e) { window.DB = window.__leDB; }
    if (!window.Notif || typeof window.Notif.success !== 'function') window.Notif = window.__leNotif;
    if (!window.Utils || typeof window.Utils.exportarCSV !== 'function') window.Utils = window.__leUtils;
    if (!window.Format || typeof window.Format.dateTime !== 'function') window.Format = window.__leFormat;
};
setTimeout(function () { try { window.__leEnsureGlobals(); } catch (e) {} }, 0);
setTimeout(function () { try { window.__leEnsureGlobals(); } catch (e) {} }, 1200);

/* ============================================================
   8) ARRANQUE
   ============================================================ */
function boot() {
    try { window.__leEnsureGlobals(); } catch (e) {}
    initFirebase();
    // logs de diagnostico utiles (los que veias en app.js: user / inicializado)
    try {
        var u = currentUser();
        console.log('%cDISTRIMARKET App.js inicializado', 'color:#28a745;font-weight:bold');
        console.log('%cDatos actualizados: user', 'color:#28a745', u ? ('-> ' + (u.nombre || u.usuario || u.email || 'sin nombre')) : '-> (sin sesion)');
    } catch (e) {}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
