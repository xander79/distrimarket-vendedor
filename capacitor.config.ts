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
    server: {
          url: 'https://vendedor:0bTzn8atv3RnAFs6Y35T@app.distrimarketat.com',
          cleartext: false,
          errorPath: 'index.html'
    }
};

export default config;
