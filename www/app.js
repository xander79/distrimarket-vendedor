/* =====================================================================
DISTRIMARKET · app.js
---------------------------------------------------------------------
Control de acceso por rol, real y compartido por todos los modulos.

Que resuelve: antes de este archivo, la pestana "Permisos" de
Configuracion mostraba una advertencia ("ControlAcceso no esta
disponible") y nada de lo que se marcara ahi tenia ningun efecto,
porque este archivo -que es justo donde debia vivir ControlAcceso-
nunca se habia creado. Cada modulo cargaba <script src="app.js">,
recibia un error 404 silencioso, y seguia de largo.

Como funciona ahora:
- ControlAcceso.permisos es un mapa { rol: [modulo1, modulo2, ...] }.
  El comodin '*' en la lista de un rol significa "acceso a todo".
- Los permisos guardados por el usuario desde Configuracion viven en
  DB.get('controlAccesoPermisos'); si todavia no se ha guardado nada,
  se usan los permisos por defecto definidos aqui (pensados para una
  distribuidora TAT real: un vendedor no necesita ver Contabilidad,
  un bodeguero no necesita ver Caja, etc.). El rol 'admin' siempre
  tiene acceso total, pase lo que pase, para que nunca se pueda
  quedar la aplicacion sin administrador.
- ControlAcceso.verificarAcceso('modulo') lo llama cada pagina al
  cargar. Si el rol actual no tiene permiso, ControlAcceso.bloquearPagina()
  oculta el contenido real y muestra un aviso claro de "Acceso
  restringido" con un boton para volver al panel principal, en vez de
  dejar la pantalla en blanco para siempre (que es lo que pasaba antes
  en los 4 modulos que ya intentaban usar este control).

Nota importante (alcance real de esta version): hoy, el unico usuario
que puede iniciar sesion es el admin por defecto (admin / admin123)
que crea login.html, porque el modulo "Usuarios" de Configuracion
guarda personas en una lista separada (DB 'usuarios') que login.html
no lee todavia para autenticar. Mientras eso no se conecte, los
permisos de los demas roles quedan listos y funcionando, pero no se
podran probar con un usuario real hasta crear ese puente -que es un
cambio sobre el sistema de inicio de sesion y conviene hacerlo aparte,
con tu confirmacion, por lo delicado que es tocar el login.

Es AUTONOMO: si DB / Notif no existen todavia (segun el orden en que
cada pagina carga sus <script>), define versiones minimas, igual que
compat.js y logo-empresa.js. Es idempotente (no rompe nada si el
navegador lo carga dos veces).
===================================================================== */
(function () {
    'use strict';

    /* ---- capas minimas de DB / Notif (por si este archivo carga antes que compat.js) ---- */
    if (!window.DB || typeof window.DB.get !== 'function') {
        window.DB = {
            get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? (d === undefined ? null : d) : JSON.parse(v); } catch (e) { return d === undefined ? null : d; } },
            set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
            remove: function (k) { try { localStorage.removeItem(k); return true; } catch (e) { return false; } }
        };
    }
    if (!window.Notif || typeof window.Notif.info !== 'function') {
        window.Notif = {
            success: function (m) { try { console.log(m); } catch (e) {} },
            error: function (m) { try { console.error(m); } catch (e) {} },
            warning: function (m) { try { console.warn(m); } catch (e) {} },
            info: function (m) { try { console.log(m); } catch (e) {} }
        };
    }

    var CLAVE_PERMISOS = 'controlAccesoPermisos';

    /* Catalogo completo de modulos reales de la aplicacion (nombre de archivo sin ".html").
       Si se agrega un modulo nuevo a la app, hay que sumarlo aqui Y en MODULOS_CATALOGO
       de config.html para poder administrar su permiso desde la pestana Permisos. */
    var TODOS_LOS_MODULOS = [
        'adminvendedores', 'alertas', 'backup_auto', 'bi', 'caja', 'callcenter', 'cartera',
        'chat', 'clientes', 'comisiones', 'compras', 'conciliacion', 'config', 'contabilidad',
        'crm', 'dashboard_ejecutivo', 'entregadores', 'facturacion', 'facturas_automaticas',
        'fidelizacion', 'firmas', 'garantias', 'importador', 'integraciones', 'inventario',
        'inventario_multi', 'link_pago', 'logistica', 'manual', 'mapa', 'marketing', 'nomina',
        'pedidos_whatsapp', 'personalizacion', 'posmovil', 'presupuesto', 'productos', 'pruebas',
        'push', 'reportes', 'rutas', 'tienda_online', 'ventas'
    ];

    /* Modulos que un Supervisor (un mando medio de confianza) NO ve por defecto:
       configuracion del sistema, respaldos, personalizacion de marca, nomina (datos de
       salario) y el modulo interno de pruebas. Todo lo demas, lo ve. */
    var RESTRINGIDO_SUPERVISOR = ['config', 'backup_auto', 'pruebas', 'nomina', 'personalizacion'];

    var PERMISOS_DEFECTO = {
        admin: ['*'],
        supervisor: TODOS_LOS_MODULOS.filter(function (m) { return RESTRINGIDO_SUPERVISOR.indexOf(m) === -1; }),
        vendedor: ['ventas', 'posmovil', 'clientes', 'pedidos_whatsapp', 'fidelizacion', 'garantias', 'rutas', 'mapa', 'productos', 'chat', 'manual'],
        cajero: ['ventas', 'posmovil', 'caja', 'clientes', 'facturacion', 'cartera', 'productos', 'chat', 'manual'],
        bodeguero: ['inventario', 'inventario_multi', 'productos', 'compras', 'entregadores', 'rutas', 'mapa', 'logistica', 'importador', 'chat', 'manual'],
        contador: ['contabilidad', 'facturacion', 'facturas_automaticas', 'cartera', 'conciliacion', 'comisiones', 'reportes', 'presupuesto', 'dashboard_ejecutivo', 'bi', 'nomina', 'link_pago', 'chat', 'manual']
    };

    function permisosActuales() {
        var guardados = null;
        try { guardados = DB.get(CLAVE_PERMISOS, null); } catch (e) {}
        if (guardados && typeof guardados === 'object' && Object.keys(guardados).length) return guardados;
        return PERMISOS_DEFECTO;
    }

    function usuarioActual() {
        try { return DB.get('user', null); } catch (e) { return null; }
    }

    function rolActual() {
        var u = usuarioActual();
        return (u && u.rol) ? String(u.rol).trim().toLowerCase() : null;
    }

    function verificarAcceso(modulo) {
        var rol = rolActual();
        // Sin sesion reconocible (por ejemplo, abriendo el archivo directo sin haber hecho
        // login todavia): no bloqueamos aqui, porque esa validacion ya le corresponde a cada
        // pagina decidir si exige login. Esto evita falsos bloqueos antes de iniciar sesion.
        if (!rol) return true;
        if (rol === 'admin') return true;
        var permisos = permisosActuales();
        var asignados = permisos[rol];
        // Rol que no existe en la configuracion de permisos: no lo restringimos por defecto,
        // para no dejar afuera por sorpresa a un rol nuevo que el usuario acabe de inventar
        // en Configuracion y que todavia no haya configurado modulo por modulo.
        if (!asignados) return true;
        if (asignados.indexOf('*') !== -1) return true;
        return asignados.indexOf(modulo) !== -1;
    }

    function bloquearPagina(modulo) {
        try {
            document.documentElement.style.visibility = 'hidden';
            var pintar = function () {
                document.documentElement.style.visibility = '';
                if (!document.body) return;
                document.body.innerHTML =
                    '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                    'text-align:center;padding:30px;font-family:Inter,Segoe UI,system-ui,sans-serif;background:#1a1d2e;color:#fff;">' +
                    '<div style="font-size:52px;margin-bottom:14px;">🔒</div>' +
                    '<h2 style="margin:0 0 10px;font-size:22px;">Acceso restringido</h2>' +
                    '<p style="color:#aab0c8;max-width:380px;margin:0 0 26px;line-height:1.5;">Tu rol no tiene permiso para entrar a este modulo' +
                    (modulo ? ' (<code style="background:rgba(255,255,255,.12);padding:2px 6px;border-radius:4px;">' + String(modulo).replace(/</g, '') + '</code>)' : '') +
                    '. Si crees que deberias tener acceso, pide a un administrador que lo habilite en Configuracion &rarr; Permisos.</p>' +
                    '<a href="index.html" style="background:#667eea;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Volver al panel principal</a>' +
                    '</div>';
            };
            if (document.body) pintar();
            else document.addEventListener('DOMContentLoaded', pintar);
        } catch (e) {}
    }

    window.ControlAcceso = {
        permisos: permisosActuales(),
        modulos: TODOS_LOS_MODULOS,
        verificarAcceso: verificarAcceso,
        rolActual: rolActual,
        bloquearPagina: bloquearPagina
    };

    try { console.log('%c[app.js] ControlAcceso listo (permisos por rol activos)', 'color:#28a745;font-weight:bold'); } catch (e) {}
})();
