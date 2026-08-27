/* =====================================================================
   BASE DE DATOS LOCAL (IndexedDB)
   Guarda las encuestas dentro de la tablet. No requiere internet.
   No editar.
   ===================================================================== */

const DB = (function () {

  const NOMBRE  = 'encuestas_offline';
  const VERSION = 1;
  const STORE   = 'registros';

  let _db = null;

  function abrir() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (ok, err) {
      const req = indexedDB.open(NOMBRE, VERSION);

      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const st = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          st.createIndex('creado', 'creado', { unique: false });
          st.createIndex('uuid',   'uuid',   { unique: true  });
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

  // Envuelve una transaccion y resuelve cuando termina de escribirse en disco
  function tx(modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (ok, err) {
        const t = db.transaction(STORE, modo);
        const store = t.objectStore(STORE);
        let resultado;
        try { resultado = fn(store); } catch (e) { err(e); return; }
        t.oncomplete = function () { ok(resultado && resultado.__req ? resultado.__req.result : resultado); };
        t.onerror    = function () { err(t.error); };
        t.onabort    = function () { err(t.error || new Error('Transaccion cancelada')); };
      });
    });
  }

  function pedir(request) { return { __req: request }; }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }

  return {

    // Crea un registro nuevo. Devuelve el id asignado.
    crear: function (registro) {
      const ahora = new Date().toISOString();
      const r = Object.assign({}, registro, {
        uuid: registro.uuid || uuid(),
        creado: ahora,
        actualizado: ahora
      });
      delete r.id;
      return tx('readwrite', function (s) { return pedir(s.add(r)); });
    },

    // Sobrescribe un registro existente (debe traer .id)
    actualizar: function (registro) {
      const r = Object.assign({}, registro, { actualizado: new Date().toISOString() });
      return tx('readwrite', function (s) { return pedir(s.put(r)); });
    },

    obtener: function (id) {
      return tx('readonly', function (s) { return pedir(s.get(Number(id))); });
    },

    // Todos los registros, del mas reciente al mas antiguo
    todos: function () {
      return tx('readonly', function (s) { return pedir(s.getAll()); })
        .then(function (lista) {
          return (lista || []).sort(function (a, b) {
            return String(b.creado).localeCompare(String(a.creado));
          });
        });
    },

    eliminar: function (id) {
      return tx('readwrite', function (s) { return pedir(s.delete(Number(id))); });
    },

    contar: function () {
      return tx('readonly', function (s) { return pedir(s.count()); });
    },

    // Borra TODO. Solo se llama desde Ajustes, con doble confirmacion.
    vaciar: function () {
      return tx('readwrite', function (s) { return pedir(s.clear()); });
    },

    // Reinserta registros desde un archivo de respaldo .json.
    // Salta los que ya existen (compara por uuid) para no duplicar.
    importar: function (lista) {
      return this.todos().then(function (actuales) {
        const vistos = new Set(actuales.map(function (r) { return r.uuid; }));
        const nuevos = lista.filter(function (r) { return r.uuid && !vistos.has(r.uuid); });
        if (!nuevos.length) return { insertados: 0, omitidos: lista.length };
        return tx('readwrite', function (s) {
          nuevos.forEach(function (r) {
            const copia = Object.assign({}, r);
            delete copia.id;
            s.add(copia);
          });
          return { insertados: nuevos.length, omitidos: lista.length - nuevos.length };
        });
      });
    },

    // Espacio de almacenamiento usado y disponible en la tablet
    espacio: function () {
      if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
      return navigator.storage.estimate().catch(function () { return null; });
    },

    // Pide al navegador que NO borre los datos si se queda sin espacio
    protegerDatos: function () {
      if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
      return navigator.storage.persisted().then(function (ya) {
        return ya ? true : navigator.storage.persist();
      }).catch(function () { return false; });
    }
  };
})();
