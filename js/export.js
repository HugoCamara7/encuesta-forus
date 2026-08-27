/* =====================================================================
   EXPORTACION
   Convierte los registros guardados en la tablet a Excel, CSV,
   respaldo .json y un .zip con las fotos y firmas.
   No editar.
   ===================================================================== */

const EXPORTAR = (function () {

  // Campos reales (los 'titulo' son solo separadores visuales)
  function campos() {
    return CONFIG.campos.filter(function (c) { return c.tipo !== 'titulo' && c.id; });
  }

  function esArchivo(campo) {
    return campo.tipo === 'foto' || campo.tipo === 'firma';
  }

  function dosDig(n) { return String(n).padStart(2, '0'); }

  // '2026-08-27T14:03:00.000Z' -> { fecha:'27/08/2026', hora:'14:03' } en hora local
  function partirFecha(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return { fecha: '', hora: '' };
    return {
      fecha: dosDig(d.getDate()) + '/' + dosDig(d.getMonth() + 1) + '/' + d.getFullYear(),
      hora:  dosDig(d.getHours()) + ':' + dosDig(d.getMinutes())
    };
  }

  // Nombre de archivo con la fecha de hoy: encuestas_2026-08-27_1430
  function sello() {
    const d = new Date();
    return d.getFullYear() + '-' + dosDig(d.getMonth() + 1) + '-' + dosDig(d.getDate()) +
           '_' + dosDig(d.getHours()) + dosDig(d.getMinutes());
  }

  // Nombre del archivo de foto asociado a un registro
  function nombreArchivo(reg, campo, dataUrl) {
    const ext = String(dataUrl || '').indexOf('image/png') >= 0 ? 'png' : 'jpg';
    return 'registro_' + String(reg.id).padStart(4, '0') + '_' + campo.id + '.' + ext;
  }

  /* ---------------------------------------------------------------
     Arma la tabla completa: encabezados + una fila por registro.
     --------------------------------------------------------------- */
  function construirFilas(registros) {
    const cs = campos();

    const encabezado = ['N', 'Fecha', 'Hora', 'Encuestador', 'Punto'];
    if (CONFIG.pedirGPS) encabezado.push('Latitud', 'Longitud');
    cs.forEach(function (c) { encabezado.push(c.id); });
    encabezado.push('Codigo unico');

    const filas = [encabezado];

    registros.forEach(function (reg) {
      const f = partirFecha(reg.creado);
      const fila = [reg.id, f.fecha, f.hora, reg.encuestador || '', reg.punto || ''];

      if (CONFIG.pedirGPS) {
        fila.push(reg.gps ? reg.gps.lat : '', reg.gps ? reg.gps.lng : '');
      }

      cs.forEach(function (c) {
        const v = (reg.datos || {})[c.id];

        if (v === undefined || v === null || v === '') { fila.push(''); return; }

        if (esArchivo(c)) {
          // En la celda va el nombre del archivo; la imagen va en el .zip
          fila.push(nombreArchivo(reg, c, v));
        } else if (Array.isArray(v)) {
          fila.push(v.join(' | '));                 // respuestas multiples
        } else if (c.tipo === 'numero' || c.tipo === 'escala') {
          const n = Number(v);
          fila.push(isFinite(n) ? n : String(v));   // numerico de verdad en Excel
        } else {
          fila.push(String(v));                     // el resto como texto
        }
      });

      fila.push(reg.uuid || '');
      filas.push(fila);
    });

    return filas;
  }

  /* ---------- Descarga de un Blob ---------- */
  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Se libera despues para no cortar la descarga en Android
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 4000);
  }

  return {

    construirFilas: construirFilas,

    /* ---------- Excel (.xlsx) ---------- */
    excel: function (registros) {
      if (!registros.length) throw new Error('No hay registros para exportar.');
      const blob = ZIP.crearExcel(construirFilas(registros), { nombreHoja: 'Encuestas' });
      descargar(blob, 'encuestas_' + sello() + '.xlsx');
      return registros.length;
    },

    /* ---------- CSV (respaldo, por si Excel falla) ----------
       Separador punto y coma y BOM UTF-8: asi Excel en espanol lo
       abre en columnas y con las tildes correctas al hacer doble clic. */
    csv: function (registros) {
      if (!registros.length) throw new Error('No hay registros para exportar.');
      const filas = construirFilas(registros);
      const texto = filas.map(function (fila) {
        return fila.map(function (v) {
          const s = (v === null || v === undefined) ? '' : String(v);
          return '"' + s.replace(/"/g, '""') + '"';
        }).join(';');
      }).join('\r\n');

      descargar(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }),
                'encuestas_' + sello() + '.csv');
      return registros.length;
    },

    /* ---------- Respaldo completo (.json) ----------
       Guarda TODO tal cual, incluidas las fotos. Sirve para restaurar
       en otra tablet o recuperar si el equipo se malogra. */
    respaldo: function (registros) {
      const paquete = {
        app: CONFIG.nombreApp,
        version: CONFIG.version,
        exportado: new Date().toISOString(),
        total: registros.length,
        registros: registros
      };
      descargar(new Blob([JSON.stringify(paquete)], { type: 'application/json' }),
                'respaldo_' + sello() + '.json');
      return registros.length;
    },

    /* ---------- Fotos y firmas en un solo .zip ---------- */
    imagenes: function (registros) {
      const cs = campos().filter(esArchivo);
      if (!cs.length) throw new Error('Esta encuesta no tiene campos de foto ni firma.');

      const archivos = [];
      registros.forEach(function (reg) {
        cs.forEach(function (c) {
          const v = (reg.datos || {})[c.id];
          if (!v || String(v).indexOf('data:') !== 0) return;
          archivos.push({ nombre: nombreArchivo(reg, c, v), datos: ZIP.dataUrlABytes(v) });
        });
      });

      if (!archivos.length) throw new Error('No hay fotos ni firmas guardadas todavia.');
      descargar(ZIP.crearZip(archivos), 'imagenes_' + sello() + '.zip');
      return archivos.length;
    }
  };
})();
