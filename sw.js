/* =====================================================================
   SERVICE WORKER
   Es lo que hace que la app abra SIN INTERNET. Guarda una copia de los
   archivos dentro de la tablet la primera vez que se abre con wifi.

   No editar salvo para agregar archivos nuevos a las listas de abajo.
   Para forzar una actualizacion, sube el numero de version en config.js
   ===================================================================== */

importScripts('js/config.js');

const CACHE = 'encuesta-v' + CONFIG.version;

/* Sin estos archivos la app no funciona: si uno falla, la instalacion
   del modo offline se cancela y se reintenta en la proxima visita. */
const ESENCIALES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/config.js',
  'js/banco-preguntas.js',
  'js/plantillas.js',
  'js/marcas.js',
  'js/validacion.js',
  'js/campos.js',
  'js/db.js',
  'js/zip.js',
  'js/export.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/forus-logo.png',
  'icons/forus-logo-blanco.png'
];

/* Logos de marca: se guardan uno por uno y si alguno todavia no existe
   simplemente se omite. Una marca sin archivo de logo muestra su nombre
   en texto, y el modo offline sigue funcionando igual. */
const OPCIONALES = [
  'icons/marcas/norseg.png',
  'icons/marcas/columbia.png',
  'icons/marcas/vans.png',
  'icons/marcas/hushpuppies.png',
  'icons/marcas/rockford.png',
  'icons/marcas/patagonia.png',
  'icons/marcas/mhw.png',
  'icons/marcas/sorel.png',
  'icons/marcas/keds.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ESENCIALES).then(function () {
        return Promise.all(OPCIONALES.map(function (url) {
          return c.add(url).catch(function () { /* logo ausente: se ignora */ });
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(nombres.map(function (n) {
        return n === CACHE ? null : caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Responde al instante desde la copia local y, si hay internet, baja la
   version nueva en paralelo para la proxima vez. */
self.addEventListener('fetch', function (e) {
  const req = e.request;
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
        if (req.mode === 'navigate') return caches.match('index.html');
        return guardada;
      });

      return guardada || desdeRed;
    })
  );
});
