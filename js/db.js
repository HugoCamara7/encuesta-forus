/* =====================================================================
   BASE DE DATOS LOCAL (IndexedDB)
   ---------------------------------------------------------------------
   Dos almacenes:

     activaciones  Cada campana o evento. Guarda a que marca y plantilla
                   pertenece y una COPIA CONGELADA de sus preguntas.
     respuestas    Cada encuesta llenada, siempre ligada a una activacion.

   Por que la copia congelada de preguntas: si manana cambias una
   plantilla, las activaciones ya publicadas siguen exportando con las
   preguntas que realmente se usaron. Los datos historicos no se
   deforman.

   La separacion por marca es logica: una sola base, pero todo se filtra
   por marcaId y nunca se mezclan resultados entre marcas.
   ===================================================================== */

const DB = (function () {

  const NOMBRE  = 'encuestas_offline';
  const VERSION = 2;
  const ACTIVACIONES = 'activaciones';
  const RESPUESTAS   = 'respuestas';

  let _db = null;

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }

  function abrir() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (ok, err) {
      const req = indexedDB.open(NOMBRE, VERSION);

      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        const tx = e.target.transaction;

        if (!db.objectStoreNames.contains(ACTIVACIONES)) {
          const a = db.createObjectStore(ACTIVACIONES, { keyPath: 'id', autoIncrement: true });
          a.createIndex('uuid',    'uuid',    { unique: true  });
          a.createIndex('marcaId', 'marcaId', { unique: false });
          a.createIndex('creada',  'creada',  { unique: false });
        }

        if (!db.objectStoreNames.contains(RESPUESTAS)) {
          const r = db.createObjectStore(RESPUESTAS, { keyPath: 'id', autoIncrement: true });
          r.createIndex('uuid',         'uuid',         { unique: true  });
          r.createIndex('activacionId', 'activacionId', { unique: false });
          r.createIndex('marcaId',      'marcaId',      { unique: false });
          r.createIndex('plantillaId',  'plantillaId',  { unique: false });
          r.createIndex('creado',       'creado',       { unique: false });
        }

        /* ---- Migracion desde la version 1 ----
           Los registros del formulario unico pasan a una activacion
           llamada "Migracion v1" de Norseg / Captacion, que fue el
           formulario que existia. El almacen viejo NO se borra: queda
           como respaldo por si algo saliera mal. */
        if (db.objectStoreNames.contains('registros')) {
          const viejos = tx.objectStore('registros');
          viejos.getAll().onsuccess = function (ev) {
            const filas = ev.target.result || [];
            if (!filas.length) return;

            const ahora = new Date().toISOString();
            const act = {
              uuid: uuid(),
              nombre: 'Migracion v1',
              marcaId: 'norseg',
              plantillaId: 'captacion',
              campos: null,            // se resuelve con la plantilla actual
              estado: 'cerrada',
              creada: ahora,
              actualizada: ahora,
              nota: 'Registros recuperados de la version anterior de la app.'
            };

            tx.objectStore(ACTIVACIONES).add(act).onsuccess = function (evA) {
              const actId = evA.target.result;
              const store = tx.objectStore(RESPUESTAS);
              filas.forEach(function (r) {
                store.add({
                  uuid: r.uuid || uuid(),
                  activacionId: actId,
                  marcaId: 'norseg',
                  plantillaId: 'captacion',
                  encuestador: r.encuestador || '',
                  punto: r.punto || '',
                  gps: r.gps || null,
                  datos: r.datos || {},
                  creado: r.creado || ahora,
                  actualizado: r.actualizado || ahora
                });
              });
            };
          };
        }
      };

      req.onsuccess = function (e) {
        _db = e.target.result;
        _db.onversionchange = function () { _db.close(); _db = null; };
        ok(_db);
      };

      req.onerror = function () {
        err(new Error('No se pudo abrir la base de datos local: ' + req.error));
      };
    });
  }

  function tx(almacen, modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (ok, err) {
        const t = db.transaction(almacen, modo);
        const store = t.objectStore(almacen);
        let res;
        try { res = fn(store); } catch (e) { err(e); return; }
        t.oncomplete = function () { ok(res && res.__req ? res.__req.result : res); };
        t.onerror    = function () { err(t.error); };
        t.onabort    = function () { err(t.error || new Error('Transaccion cancelada')); };
      });
    });
  }

  function pedir(request) { return { __req: request }; }

  function porFecha(lista, campo) {
    return (lista || []).sort(function (a, b) {
      return String(b[campo]).localeCompare(String(a[campo]));
    });
  }

  /* =================================================================== */

  return {

    uuid: uuid,

    /* ------------------------- ACTIVACIONES ------------------------- */

    activaciones: {

      crear: function (act) {
        const ahora = new Date().toISOString();
        const a = Object.assign({}, act, {
          uuid: act.uuid || uuid(),
          estado: act.estado || 'activa',
          creada: ahora,
          actualizada: ahora
        });
        delete a.id;
        return tx(ACTIVACIONES, 'readwrite', function (s) { return pedir(s.add(a)); });
      },

      actualizar: function (act) {
        const a = Object.assign({}, act, { actualizada: new Date().toISOString() });
        return tx(ACTIVACIONES, 'readwrite', function (s) { return pedir(s.put(a)); });
      },

      obtener: function (id) {
        return tx(ACTIVACIONES, 'readonly', function (s) { return pedir(s.get(Number(id))); });
      },

      todas: function () {
        return tx(ACTIVACIONES, 'readonly', function (s) { return pedir(s.getAll()); })
          .then(function (l) { return porFecha(l, 'creada'); });
      },

      porMarca: function (marcaId) {
        return this.todas().then(function (l) {
          return l.filter(function (a) { return a.marcaId === marcaId; });
        });
      },

      eliminar: function (id) {
        // Se borran tambien todas sus respuestas: no dejar huerfanas
        return DB.respuestas.filtrar({ activacionId: Number(id) }).then(function (rs) {
          return Promise.all(rs.map(function (r) { return DB.respuestas.eliminar(r.id); }));
        }).then(function () {
          return tx(ACTIVACIONES, 'readwrite', function (s) { return pedir(s.delete(Number(id))); });
        });
      }
    },

    /* -------------------------- RESPUESTAS -------------------------- */

    respuestas: {

      crear: function (resp) {
        const ahora = new Date().toISOString();
        const r = Object.assign({}, resp, {
          uuid: resp.uuid || uuid(),
          creado: ahora,
          actualizado: ahora
        });
        delete r.id;
        return tx(RESPUESTAS, 'readwrite', function (s) { return pedir(s.add(r)); });
      },

      actualizar: function (resp) {
        const r = Object.assign({}, resp, { actualizado: new Date().toISOString() });
        return tx(RESPUESTAS, 'readwrite', function (s) { return pedir(s.put(r)); });
      },

      obtener: function (id) {
        return tx(RESPUESTAS, 'readonly', function (s) { return pedir(s.get(Number(id))); });
      },

      eliminar: function (id) {
        return tx(RESPUESTAS, 'readwrite', function (s) { return pedir(s.delete(Number(id))); });
      },

      todas: function () {
        return tx(RESPUESTAS, 'readonly', function (s) { return pedir(s.getAll()); })
          .then(function (l) { return porFecha(l, 'creado'); });
      },

      /* filtro = { marcaId, activacionId, plantillaId, desde, hasta, texto }
         Todos opcionales. Es el motor de la pantalla de resultados y de
         las exportaciones. */
      filtrar: function (filtro) {
        filtro = filtro || {};
        return this.todas().then(function (lista) {
          return lista.filter(function (r) {
            if (filtro.marcaId      && r.marcaId      !== filtro.marcaId)      return false;
            if (filtro.plantillaId  && r.plantillaId  !== filtro.plantillaId)  return false;
            if (filtro.activacionId && r.activacionId !== Number(filtro.activacionId)) return false;
            if (filtro.desde && r.creado < filtro.desde) return false;
            if (filtro.hasta && r.creado > filtro.hasta + 'T23:59:59.999Z') return false;
            if (filtro.texto) {
              const q = filtro.texto.toLowerCase();
              const heno = (JSON.stringify(r.datos || {}) + ' ' + (r.encuestador || '')).toLowerCase();
              if (heno.indexOf(q) < 0) return false;
            }
            return true;
          });
        });
      },

      contar: function () {
        return tx(RESPUESTAS, 'readonly', function (s) { return pedir(s.count()); });
      },

      /* { activacionId: cuantas } para pintar los contadores de las tarjetas */
      conteoPorActivacion: function () {
        return this.todas().then(function (lista) {
          const c = {};
          lista.forEach(function (r) { c[r.activacionId] = (c[r.activacionId] || 0) + 1; });
          return c;
        });
      },

      /* Evita duplicados dentro de la MISMA activacion */
      buscarDocumento: function (activacionId, campoId, valor, exceptoId) {
        return this.filtrar({ activacionId: activacionId }).then(function (lista) {
          return lista.filter(function (r) {
            return r.id !== exceptoId &&
                   String((r.datos || {})[campoId] || '') === String(valor);
          })[0] || null;
        });
      }
    },

    /* --------------------------- GENERAL ---------------------------- */

    /* Borra las respuestas de una marca (o de una activacion puntual)
       sin tocar las demas marcas. */
    vaciar: function (filtro) {
      return this.respuestas.filtrar(filtro || {}).then(function (rs) {
        return Promise.all(rs.map(function (r) { return DB.respuestas.eliminar(r.id); }))
          .then(function () { return rs.length; });
      });
    },

    /* Respaldo completo: activaciones + respuestas */
    exportarTodo: function () {
      return Promise.all([this.activaciones.todas(), this.respuestas.todas()])
        .then(function (r) { return { activaciones: r[0], respuestas: r[1] }; });
    },

    /* Importa un respaldo sin duplicar: compara por uuid y remapea los
       id de activacion para que las respuestas sigan apuntando bien. */
    importar: function (paquete) {
      const actsNuevas = paquete.activaciones || [];
      const respNuevas = paquete.respuestas || paquete.registros || [];

      return this.exportarTodo().then(function (actual) {
        const uuidsAct  = {};
        const mapaUuidId = {};
        actual.activaciones.forEach(function (a) { uuidsAct[a.uuid] = a.id; mapaUuidId[a.uuid] = a.id; });
        const uuidsResp = {};
        actual.respuestas.forEach(function (r) { uuidsResp[r.uuid] = true; });

        // id viejo -> uuid, para reconectar las respuestas
        const idViejoAUuid = {};
        actsNuevas.forEach(function (a) { idViejoAUuid[a.id] = a.uuid; });

        const pendientes = actsNuevas.filter(function (a) { return a.uuid && !uuidsAct[a.uuid]; });

        return pendientes.reduce(function (cadena, a) {
          return cadena.then(function () {
            const copia = Object.assign({}, a);
            delete copia.id;
            return DB.activaciones.crear(copia).then(function (nuevoId) {
              mapaUuidId[a.uuid] = nuevoId;
            });
          });
        }, Promise.resolve()).then(function () {

          const aInsertar = respNuevas.filter(function (r) { return r.uuid && !uuidsResp[r.uuid]; });

          return aInsertar.reduce(function (cadena, r) {
            return cadena.then(function () {
              const copia = Object.assign({}, r);
              delete copia.id;
              const uuidAct = idViejoAUuid[r.activacionId];
              if (uuidAct && mapaUuidId[uuidAct]) copia.activacionId = mapaUuidId[uuidAct];
              return DB.respuestas.crear(copia);
            });
          }, Promise.resolve()).then(function () {
            return {
              activaciones: pendientes.length,
              respuestas: aInsertar.length,
              omitidas: respNuevas.length - aInsertar.length
            };
          });
        });
      });
    },

    espacio: function () {
      if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
      return navigator.storage.estimate().catch(function () { return null; });
    },

    protegerDatos: function () {
      if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
      return navigator.storage.persisted().then(function (ya) {
        return ya ? true : navigator.storage.persist();
      }).catch(function () { return false; });
    }
  };
})();
