/* =====================================================================
   SERVICE WORKER
   Es lo que hace que la app abra SIN INTERNET. Guarda una copia de los
   archivos dentro de la tablet la primera vez que se abre con wifi.
   No editar. Para forzar una actualizacion, sube el numero de version
   en js/config.js
   ===================================================================== */

importScripts('js/config.js');

const CACHE = 'encuesta-v' + CONFIG.version;

const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/config.js',
  'js/db.js',
  'js/zip.js',
  'js/export.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/forus-logo.png',
  'icons/forus-logo-blanco.png'
];

/* ---- Instalacion: descarga y guarda todos los archivos ---- */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ARCHIVOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

/* ---- Activacion: borra las copias de versiones anteriores ---- */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(nombres.map(function (n) {
        return n === CACHE ? null : caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* ---- Peticiones ----
   Estrategia: responder al instante desde la copia local y, en paralelo,
   si hay internet, bajar la version nueva para la proxima vez.
   Asi la app abre rapido y offline, pero no se queda desactualizada. */
self.addEventListener('fetch', function (e) {
  const req = e.request;

  // Solo se maneja la propia app; nada de otros dominios
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (guardada) {

      const desdeRed = fetch(req).then(function (resp) {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return resp;
      }).catch(function () {
        // Sin conexion: si es una navegacion, se abre la pagina guardada
        if (req.mode === 'navigate') return caches.match('index.html');
        return guardada;
      });

      return guardada || desdeRed;
    })
  );
});
