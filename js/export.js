/* =====================================================================
   EXPORTACION
   ---------------------------------------------------------------------
   Toda salida (Excel, CSV, respaldo, imagenes) parte del MISMO filtro:

       { marcaId, activacionId, plantillaId, desde, hasta }

   Asi lo que ves en pantalla es exactamente lo que se descarga, y una
   marca nunca puede llevarse datos de otra por accidente.

   Las columnas salen de la copia congelada de preguntas de cada
   activacion. Si el filtro abarca varias activaciones, se arma la union
   de sus columnas respetando el orden de aparicion.
   ===================================================================== */

const EXPORTAR = (function () {

  function dosDig(n) { return String(n).padStart(2, '0'); }

  function partirFecha(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return { fecha: '', hora: '' };
    return {
      fecha: dosDig(d.getDate()) + '/' + dosDig(d.getMonth() + 1) + '/' + d.getFullYear(),
      hora:  dosDig(d.getHours()) + ':' + dosDig(d.getMinutes())
    };
  }

  function sello() {
    const d = new Date();
    return d.getFullYear() + '-' + dosDig(d.getMonth() + 1) + '-' + dosDig(d.getDate()) +
           '_' + dosDig(d.getHours()) + dosDig(d.getMinutes());
  }

  // Nombre de archivo seguro: sin tildes, espacios ni signos
  function limpiarNombre(t) {
    const desarmado = String(t || '').normalize('NFD');
    let sinTildes = '';
    for (let i = 0; i < desarmado.length; i++) {
      const c = desarmado.charCodeAt(i);
      if (c >= 0x0300 && c <= 0x036F) continue;   // marcas diacriticas
      sinTildes += desarmado.charAt(i);
    }
    const limpio = sinTildes.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return limpio.slice(0, 40) || 'datos';
  }

  function esArchivo(campo) { return campo.tipo === 'foto' || campo.tipo === 'firma'; }

  /* Preguntas de una activacion: la copia congelada, y si es null (datos
     migrados de la v1) se resuelve con la plantilla actual. */
  function camposDe(activacion) {
    if (activacion && activacion.campos && activacion.campos.length) return activacion.campos;
    if (!activacion) return [];
    return PLANTILLA.resolver(activacion.plantillaId, MARCA.porId(activacion.marcaId));
  }

  function nombreArchivoImagen(resp, campo, dataUrl) {
    const ext = String(dataUrl || '').indexOf('image/png') >= 0 ? 'png' : 'jpg';
    return 'registro_' + String(resp.id).padStart(4, '0') + '_' + campo.id + '.' + ext;
  }

  /* ---------------------------------------------------------------
     Arma la tabla: encabezados + una fila por respuesta.
     --------------------------------------------------------------- */
  function construirFilas(respuestas, activacionesPorId) {

    // Union de columnas, en orden de aparicion
    const orden = [];
    const vistos = {};
    const defPorId = {};

    respuestas.forEach(function (r) {
      camposDe(activacionesPorId[r.activacionId]).forEach(function (c) {
        if (!vistos[c.id]) { vistos[c.id] = true; orden.push(c.id); defPorId[c.id] = c; }
      });
    });

    const encabezado = ['N', 'Marca', 'Activacion', 'Plantilla', 'Fecha', 'Hora', 'Encuestador']
      .concat(orden, ['Codigo unico']);

    const filas = [encabezado];

    respuestas.forEach(function (r) {
      const act = activacionesPorId[r.activacionId] || {};
      const marca = MARCA.porId(r.marcaId);
      const plantilla = PLANTILLA.porId(r.plantillaId);
      const f = partirFecha(r.creado);

      const fila = [
        r.id,
        marca ? marca.nombre : (r.marcaId || ''),
        act.nombre || '',
        plantilla ? plantilla.nombre : (r.plantillaId || ''),
        f.fecha,
        f.hora,
        r.encuestador || ''
      ];

      orden.forEach(function (id) {
        const c = defPorId[id];
        const v = (r.datos || {})[id];

        if (v === undefined || v === null || v === '') { fila.push(''); return; }

        if (esArchivo(c)) {
          fila.push(nombreArchivoImagen(r, c, v));
        } else if (Array.isArray(v)) {
          fila.push(v.join(' | '));
        } else if (c.tipo === 'numero' || c.tipo === 'escala' || c.tipo === 'nps') {
          const n = Number(v);
          fila.push(isFinite(n) ? n : String(v));
        } else {
          fila.push(String(v));   // texto: conserva ceros a la izquierda del DNI/RUC
        }
      });

      fila.push(r.uuid || '');
      filas.push(fila);
    });

    return filas;
  }

  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 4000);
  }

  /* Trae respuestas + sus activaciones segun el filtro */
  function cargar(filtro) {
    return Promise.all([
      DB.respuestas.filtrar(filtro),
      DB.activaciones.todas()
    ]).then(function (r) {
      const porId = {};
      r[1].forEach(function (a) { porId[a.id] = a; });
      return { respuestas: r[0], activaciones: porId };
    });
  }

  /* Nombre de archivo que refleja el filtro aplicado */
  function nombreBase(filtro, activaciones) {
    const partes = [];
    if (filtro.marcaId) {
      const m = MARCA.porId(filtro.marcaId);
      partes.push(limpiarNombre(m ? m.nombre : filtro.marcaId));
    }
    if (filtro.activacionId && activaciones[filtro.activacionId]) {
      partes.push(limpiarNombre(activaciones[filtro.activacionId].nombre));
    } else if (filtro.plantillaId) {
      const p = PLANTILLA.porId(filtro.plantillaId);
      partes.push(limpiarNombre(p ? p.nombre : filtro.plantillaId));
    }
    if (!partes.length) partes.push('todas_las_marcas');
    return partes.join('_');
  }

  return {

    construirFilas: construirFilas,
    camposDe: camposDe,

    /* ---------- Excel ---------- */
    excel: function (filtro) {
      return cargar(filtro).then(function (d) {
        if (!d.respuestas.length) throw new Error('No hay registros que coincidan con el filtro.');
        const filas = construirFilas(d.respuestas, d.activaciones);
        const hoja = (MARCA.porId(filtro.marcaId) || {}).nombre || 'Respuestas';
        descargar(ZIP.crearExcel(filas, { nombreHoja: hoja }),
                  nombreBase(filtro, d.activaciones) + '_' + sello() + '.xlsx');
        return d.respuestas.length;
      });
    },

    /* ---------- CSV ---------- */
    csv: function (filtro) {
      return cargar(filtro).then(function (d) {
        if (!d.respuestas.length) throw new Error('No hay registros que coincidan con el filtro.');
        const filas = construirFilas(d.respuestas, d.activaciones);
        const texto = filas.map(function (fila) {
          return fila.map(function (v) {
            const s = (v === null || v === undefined) ? '' : String(v);
            return '"' + s.replace(/"/g, '""') + '"';
          }).join(';');
        }).join('\r\n');

        descargar(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }),
                  nombreBase(filtro, d.activaciones) + '_' + sello() + '.csv');
        return d.respuestas.length;
      });
    },

    /* ---------- Imagenes ---------- */
    imagenes: function (filtro) {
      return cargar(filtro).then(function (d) {
        const archivos = [];
        d.respuestas.forEach(function (r) {
          camposDe(d.activaciones[r.activacionId]).filter(esArchivo).forEach(function (c) {
            const v = (r.datos || {})[c.id];
            if (!v || String(v).indexOf('data:') !== 0) return;
            archivos.push({ nombre: nombreArchivoImagen(r, c, v), datos: ZIP.dataUrlABytes(v) });
          });
        });
        if (!archivos.length) throw new Error('No hay fotos ni firmas en los registros filtrados.');
        descargar(ZIP.crearZip(archivos),
                  'imagenes_' + nombreBase(filtro, d.activaciones) + '_' + sello() + '.zip');
        return archivos.length;
      });
    },

    /* ---------- Respaldo completo (siempre todo, sin filtro) ---------- */
    respaldo: function () {
      return DB.exportarTodo().then(function (todo) {
        const paquete = {
          app: CONFIG.nombreApp,
          version: CONFIG.version,
          exportado: new Date().toISOString(),
          activaciones: todo.activaciones,
          respuestas: todo.respuestas
        };
        descargar(new Blob([JSON.stringify(paquete)], { type: 'application/json' }),
                  'respaldo_completo_' + sello() + '.json');
        return todo.respuestas.length;
      });
    }
  };
})();
