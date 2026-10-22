import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
      appId: 'com.distrimarket.vendedor',
      appName: 'DISTRIMARKET Vendedor',
      webDir: 'www',
      // La app carga la página EN VIVO (app.distrimarketat.com) en vez de los
      // archivos empaquetados en www/. Así, cuando se actualice el archivo en el
      // servidor, el vendedor lo ve al abrir la app, sin reinstalar un nuevo APK.
      // vendedor:CLAVE va embebido en la URL para que el WebView se autentique solo
      // contra la clave del servidor (Basic Auth) sin pedírsela al vendedor.
      //
      // errorPath: respaldo sin internet. Si el celular no tiene señal en ese
      // momento (modo avión, zona sin cobertura, red caída), Capacitor no puede
      // cargar la URL de arriba y, SIN esto, el WebView se queda completamente en
      // blanco ("página web no disponible") -lo que reportó el vendedor al
      // probar en modo avión-. Con "errorPath" puesto, Capacitor usa su propio
      // mecanismo (ya incluido en el framework, sin tocar código nativo) para
      // mostrar en su lugar la copia local empaquetada dentro del APK
      // (www/index.html) apenas la carga en línea falla. Esa copia local no se
      // actualiza sola -solo trae lo que tenía la app en el momento en que se
      // instaló-, pero deja al vendedor seguir viendo clientes/productos y
      // trabajando en vez de una pantalla en blanco. En cuanto vuelva a abrir la
      // app con señal, vuelve a intentar primero la versión en línea como
      // siempre.
      //
      // hostname: SIN esto, esa copia local de respaldo queda en el origen
      // "localhost" del propio Capacitor, que es un almacenamiento COMPLETAMENTE
      // APARTE del de "app.distrimarketat.com" -o sea, el respaldo arrancaría
      // siempre vacío (sin los clientes/productos que ya se habían sincronizado)
      // y cualquier pedido tomado ahí quedaría atrapado sin forma de llegar a la
      // nube, incluso después de recuperar señal. Poniendo aquí el mismo dominio
      // del servidor de arriba, el navegador trata esa copia local como si fuera
      // el mismo sitio de siempre: comparte la MISMA memoria (clientes,
      // productos, usuarios, y los pedidos que el vendedor tome sin señal), así
      // que el respaldo sí tiene datos reales para trabajar, y en cuanto vuelva
      // la señal, la sincronización normal de la app (ver vendedor.html) sube
      // esos pedidos pendientes sola. Esto NO afecta la carga en línea normal:
      // Capacitor solo usa esta copia local cuando de verdad falla la conexión
      // (ver errorPath arriba); con señal, sigue yendo siempre por la red a
      // buscar la versión real y más reciente del sitio.
      server: {
              url: 'https://vendedor:0bTzn8atv3RnAFs6Y35T@app.distrimarketat.com',
              cleartext: false,
              errorPath: 'index.html',
              hostname: 'app.distrimarketat.com'
      }
};

export default config;
