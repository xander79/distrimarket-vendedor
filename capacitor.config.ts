import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.distrimarket.vendedor',
  appName: 'DISTRIMARKET Vendedor',
  webDir: 'www',
  // La app ahora carga la página EN VIVO (app.distrimarketat.com) en vez de los
  // archivos empaquetados en www/. Así, cuando se actualice el archivo en el
  // servidor, el vendedor lo ve al abrir la app, sin reinstalar un nuevo APK.
  // "www" se deja como respaldo: si el celular abre la app sin internet en ese
  // instante, Capacitor puede quedarse sin nada que mostrar, así que hay que
  // probar este cambio con el celular en modo avión antes de confiar en él.
  // vendedor:CLAVE va embebido en la URL para que el WebView se autentique solo
  // contra la clave del servidor (Basic Auth) sin pedírsela al vendedor; si en
  // el celular real sale un cuadro de clave nativo de todos modos, hace falta
  // un ajuste adicional en el código Android (MainActivity) para que no pida
  // esa clave cada vez.
  server: {
    url: 'https://vendedor:0bTzn8atv3RnAFs6Y35T@app.distrimarketat.com',
    cleartext: false
  }
};

export default config;
