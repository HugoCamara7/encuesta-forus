/* =====================================================================
   APLICACION
   ---------------------------------------------------------------------
   Solo orquesta pantallas. No contiene preguntas, ni reglas de
   validacion, ni definiciones de marcas: todo eso vive en sus modulos.

   Flujo: Activaciones -> Nueva -> Plantilla -> Marca -> Configurar
          -> Vista previa -> Publicar -> Encuestar
   ===================================================================== */

const APP = (function () {

  const AJUSTES_KEY  = 'ajustes_encuesta';
  const BORRADOR_KEY = 'borrador_respuesta';

  const estado = {
    vista: 'inicio',
    pila: [],          // historial para el boton atras
    nueva: null,       // activacion en construccion
    activacion: null,  // activacion en la que se esta encuestando
    form: null,        // formulario vivo
    editandoId: null,
    filtro: {}         // filtro de resultados
  };

  /* ================= Utilidades ================= */

  const $ = function (s) { return document.querySelector(s); };

  function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function boton(texto, clase, alHacerClic) {
    const b = el('button', 'boton ' + (clase || 'secundario'), texto);
    b.type = 'button';
    b.addEventListener('click', alHacerClic);
    return b;
  }

  function ajustes() {
    try { return JSON.parse(localStorage.getItem(AJUSTES_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function guardarAjustes(a) { localStorage.setItem(AJUSTES_KEY, JSON.stringify(a)); }

  let tempAviso = null;
  function avisar(mensaje, tipo) {
    const caja = $('#aviso');
    caja.textContent = mensaje;
    caja.className = 'aviso ' + (tipo || 'ok') + ' visible';
    clearTimeout(tempAviso);
    tempAviso = setTimeout(function () { caja.className = 'aviso'; }, 3600);
  }

  function fechaCorta(iso) {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /* ================= Navegacion ================= */

  const VISTAS = {
    inicio:        { titulo: 'Activaciones',      render: renderInicio,      tab: 'inicio'  },
    plantillas:    { titulo: 'Elegir plantilla',  render: renderPlantillas,  atras: true    },
    marcas:        { titulo: 'Elegir marca',      render: renderMarcas,      atras: true    },
    configurar:    { titulo: 'Configurar',        render: renderConfigurar,  atras: true    },
    preview:       { titulo: 'Vista previa',      render: renderPreview,     atras: true    },
    encuestar:     { titulo: 'Nueva encuesta',    render: renderEncuestar,   atras: true    },
    resultados:    { titulo: 'Resultados',        render: renderResultados,  tab: 'resultados' },
    ajustes:       { titulo: 'Ajustes',           render: renderAjustes,     tab: 'ajustes' }
  };

  function ir(vista, apilar) {
    const def = VISTAS[vista];
    if (!def) return;
    if (apilar !== false && estado.vista !== vista) estado.pila.push(estado.vista);
    estado.vista = vista;

    $('#titulo-vista').textContent = def.titulo;
    $('#btn-atras').hidden = !def.atras;

    ['inicio', 'resultados', 'ajustes'].forEach(function (t) {
      $('#tab-' + t).classList.toggle('activa', def.tab === t);
    });
    $('#pestanas').hidden = !def.tab;

    // Identidad visual segun el contexto
    const marcaCtx = (estado.activacion && estado.activacion.marcaId) ||
                     (estado.nueva && estado.nueva.marcaId) ||
                     (estado.filtro && estado.filtro.marcaId) || null;
    MARCA.aplicarIdentidad(vista === 'inicio' ? null : marcaCtx);
    pintarMarcaCabecera(vista === 'inicio' ? null : marcaCtx);

    $('#barra-accion').innerHTML = '';
    $('#barra-accion').hidden = true;

    $('#contenido').innerHTML = '';
    def.render();
    window.scrollTo({ top: 0 });
  }

  function atras() {
    const anterior = estado.pila.pop() || 'inicio';
    estado.vista = null;
    ir(anterior, false);
  }

  function pintarMarcaCabecera(marcaId) {
    const caja = $('#marca-cabecera');
    caja.innerHTML = '';
    const marca = marcaId && MARCA.porId(marcaId);
    caja.hidden = !marca;
    if (marca) caja.appendChild(MARCA.nodoLogo(marca, 'marca-logo chip'));
  }

  function accion(botones) {
    const barra = $('#barra-accion');
    barra.innerHTML = '';
    botones.forEach(function (b) { barra.appendChild(b); });
    barra.hidden = botones.length === 0;
  }

  /* =====================================================================
     VISTA: INICIO - lista de activaciones
     ===================================================================== */

  function renderInicio() {
    const cont = $('#contenido');

    Promise.all([DB.activaciones.todas(), DB.respuestas.conteoPorActivacion()])
      .then(function (r) {
        const activaciones = r[0], conteo = r[1];

        cont.innerHTML = '';

        if (!activaciones.length) {
          const vacio = el('div', 'vacio-grande');
          vacio.appendChild(el('div', 'vacio-icono', '📋'));
          vacio.appendChild(el('h2', null, 'Todavia no hay activaciones'));
          vacio.appendChild(el('p', null,
            'Una activacion es una campana concreta: una feria, un evento o un periodo en tienda. ' +
            'Elige una plantilla y una marca para empezar.'));
          vacio.appendChild(boton('Crear la primera activacion', 'principal', nuevaActivacion));
          cont.appendChild(vacio);
          return;
        }

        // Agrupadas por marca: nunca se mezcla informacion entre marcas
        const porMarca = {};
        activaciones.forEach(function (a) {
          (porMarca[a.marcaId] = porMarca[a.marcaId] || []).push(a);
        });

        Object.keys(porMarca).forEach(function (marcaId) {
          const marca = MARCA.porId(marcaId);
          const grupo = el('section', 'grupo-marca');
          if (marca) grupo.style.setProperty('--marca-primario', marca.colores.primario);

          const cab = el('div', 'grupo-cab');
          if (marca) cab.appendChild(MARCA.nodoLogo(marca, 'marca-logo lista'));
          else cab.appendChild(el('span', 'marca-logo-texto', marcaId));
          cab.appendChild(el('span', 'grupo-conteo',
            porMarca[marcaId].length + (porMarca[marcaId].length === 1 ? ' activacion' : ' activaciones')));
          grupo.appendChild(cab);

          porMarca[marcaId].forEach(function (a) {
            grupo.appendChild(tarjetaActivacion(a, conteo[a.id] || 0));
          });

          cont.appendChild(grupo);
        });
      });

    accion([boton('+  Nueva activacion', 'principal', nuevaActivacion)]);
  }

  function tarjetaActivacion(act, n) {
    const plantilla = PLANTILLA.porId(act.plantillaId);
    const t = el('article', 'tarjeta activacion');

    const cab = el('div', 'tarjeta-cab');
    cab.appendChild(el('h3', 'tarjeta-titulo', act.nombre));
    const estadoChip = el('span', 'chip-estado ' + act.estado, act.estado === 'activa' ? 'Activa' : 'Cerrada');
    cab.appendChild(estadoChip);
    t.appendChild(cab);

    t.appendChild(el('div', 'tarjeta-meta',
      (plantilla ? plantilla.icono + ' ' + plantilla.nombre : act.plantillaId) +
      '  ·  ' + n + (n === 1 ? ' respuesta' : ' respuestas') +
      '  ·  ' + fechaCorta(act.creada)));

    const acc = el('div', 'tarjeta-acciones');

    if (act.estado === 'activa') {
      acc.appendChild(boton('Encuestar', 'principal chico', function () {
        estado.activacion = act;
        estado.editandoId = null;
        ir('encuestar');
      }));
    }

    acc.appendChild(boton('Resultados', 'secundario chico', function () {
      estado.filtro = { marcaId: act.marcaId, activacionId: act.id };
      estado.pila.push('inicio');
      ir('resultados', false);
    }));

    acc.appendChild(boton('Duplicar', 'secundario chico', function () { duplicar(act); }));

    acc.appendChild(boton(act.estado === 'activa' ? 'Cerrar' : 'Reabrir', 'secundario chico', function () {
      act.estado = act.estado === 'activa' ? 'cerrada' : 'activa';
      DB.activaciones.actualizar(act).then(function () {
        avisar('Activacion ' + (act.estado === 'activa' ? 'reabierta' : 'cerrada') + '.', 'ok');
        ir('inicio', false);
      });
    }));

    acc.appendChild(boton('Eliminar', 'peligro chico', function () {
      if (!confirm('Eliminar "' + act.nombre + '" y sus ' + n + ' respuestas?\n\nNo se puede deshacer.')) return;
      DB.activaciones.eliminar(act.id).then(function () {
        avisar('Activacion eliminada.', 'ok');
        ir('inicio', false);
      });
    }));

    t.appendChild(acc);
    return t;
  }

  function nuevaActivacion() {
    estado.nueva = { plantillaId: null, marcaId: null, nombre: '', campos: null };
    estado.activacion = null;
    ir('plantillas');
  }

  function duplicar(act) {
    estado.nueva = {
      plantillaId: act.plantillaId,
      marcaId: act.marcaId,
      nombre: act.nombre + ' (copia)',
      campos: JSON.parse(JSON.stringify(EXPORTAR.camposDe(act)))
    };
    estado.activacion = null;
    estado.pila.push('inicio');
    ir('configurar', false);
    avisar('Copia lista. Ajusta lo que necesites y publica.', 'info');
  }

  /* =====================================================================
     VISTA: ELEGIR PLANTILLA
     ===================================================================== */

  function renderPlantillas() {
    const cont = $('#contenido');
    cont.appendChild(el('p', 'intro',
      'Cada plantilla define que preguntas se hacen. Podras ajustarlas antes de publicar.'));

    const rejilla = el('div', 'rejilla');

    PLANTILLAS.forEach(function (p) {
      const card = el('button', 'card-plantilla');
      card.type = 'button';
      card.appendChild(el('div', 'card-icono', p.icono));
      card.appendChild(el('h3', 'card-titulo', p.nombre));
      card.appendChild(el('p', 'card-desc', p.descripcion));

      const total = p.secciones.reduce(function (s, x) { return s + x.preguntas.length; }, 0);
      const oblig = p.secciones.reduce(function (s, x) {
        return s + x.preguntas.filter(function (q) { return q.requerido; }).length;
      }, 0);
      card.appendChild(el('div', 'card-pie', total + ' preguntas · ' + oblig + ' obligatorias'));

      card.addEventListener('click', function () {
        estado.nueva.plantillaId = p.id;
        estado.nueva.campos = null;
        ir('marcas');
      });

      rejilla.appendChild(card);
    });

    cont.appendChild(rejilla);
  }

  /* =====================================================================
     VISTA: ELEGIR MARCA
     ===================================================================== */

  function renderMarcas() {
    const cont = $('#contenido');
    const plantilla = PLANTILLA.porId(estado.nueva.plantillaId);

    cont.appendChild(el('p', 'intro',
      'Plantilla elegida: ' + (plantilla ? plantilla.nombre : '') +
      '. Cada marca guarda su base de clientes por separado.'));

    const disponibles = MARCA.conPlantilla(estado.nueva.plantillaId);
    const rejilla = el('div', 'rejilla marcas');

    disponibles.forEach(function (m) {
      const card = el('button', 'card-marca');
      card.type = 'button';
      card.style.setProperty('--marca-primario', m.colores.primario);
      card.style.setProperty('--marca-suave', m.colores.suave);

      card.appendChild(MARCA.nodoLogo(m, 'marca-logo card'));
      card.appendChild(el('h3', 'card-titulo', m.nombre));
      card.appendChild(el('p', 'card-desc', m.descripcion));

      card.addEventListener('click', function () {
        estado.nueva.marcaId = m.id;
        estado.nueva.campos = PLANTILLA.resolver(estado.nueva.plantillaId, m);
        if (!estado.nueva.nombre) {
          estado.nueva.nombre = plantilla.nombre + ' - ' + m.nombre;
        }
        ir('configurar');
      });

      rejilla.appendChild(card);
    });

    cont.appendChild(rejilla);
  }

  /* =====================================================================
     VISTA: CONFIGURAR ACTIVACION
     ===================================================================== */

  function renderConfigurar() {
    const cont = $('#contenido');
    const n = estado.nueva;
    const marca = MARCA.porId(n.marcaId);
    const plantilla = PLANTILLA.porId(n.plantillaId);

    if (!n.campos) n.campos = PLANTILLA.resolver(n.plantillaId, marca);

    // --- Nombre de la activacion ---
    const caja = el('div', 'campo');
    const lbl = el('label', 'etiqueta', 'Nombre de la activacion');
    lbl.setAttribute('for', 'nombre-activacion');
    lbl.appendChild(el('span', 'req', ' *'));
    caja.appendChild(lbl);

    const inp = el('input', 'entrada');
    inp.id = 'nombre-activacion';
    inp.value = n.nombre || '';
    inp.placeholder = 'Ej: Feria Expomin 2026';
    inp.addEventListener('input', function () { n.nombre = inp.value; });
    caja.appendChild(inp);
    caja.appendChild(el('div', 'ayuda',
      'Asi la vas a reconocer despues al filtrar y exportar. ' +
      (marca ? 'Marca: ' + marca.nombre + '.' : '') +
      (plantilla ? ' Plantilla: ' + plantilla.nombre + '.' : '')));
    cont.appendChild(caja);

    // --- Preguntas ---
    cont.appendChild(el('h2', 'seccion', 'Preguntas'));
    cont.appendChild(el('p', 'ayuda',
      'Marca cuales son obligatorias. Las que quites no se le mostraran al encuestador.'));

    const lista = el('div', 'lista-config');
    cont.appendChild(lista);
    pintarListaConfig(lista);

    // --- Agregar preguntas del banco ---
    const disponibles = PLANTILLA.disponibles(n.campos);
    if (disponibles.length) {
      cont.appendChild(el('h2', 'seccion', 'Agregar mas preguntas'));

      const sel = el('select', 'entrada');
      sel.appendChild(new Option('-- Elegir una pregunta --', ''));
      disponibles.forEach(function (d) { sel.appendChild(new Option(d.etiqueta, d.id)); });

      const fila = el('div', 'fila-agregar');
      fila.appendChild(sel);
      fila.appendChild(boton('Agregar', 'secundario', function () {
        if (!sel.value) return;
        const base = BANCO_PREGUNTAS[sel.value];
        const ajuste = (marca && marca.ajustesPreguntas && marca.ajustesPreguntas[sel.value]) || {};
        n.campos.push(Object.assign({}, base, ajuste, {
          id: sel.value,
          requerido: false,
          seccion: 'Preguntas adicionales'
        }));
        ir('configurar', false);
      }));
      cont.appendChild(fila);
    }

    accion([
      boton('Vista previa', 'principal', function () {
        if (!n.nombre || !n.nombre.trim()) {
          avisar('Ponle un nombre a la activacion.', 'error');
          inp.focus();
          return;
        }
        if (!n.campos.length) {
          avisar('La activacion necesita al menos una pregunta.', 'error');
          return;
        }
        ir('preview');
      })
    ]);
  }

  function pintarListaConfig(lista) {
    const n = estado.nueva;
    lista.innerHTML = '';

    let seccionActual = null;
    n.campos.forEach(function (campo, i) {
      if (campo.seccion !== seccionActual) {
        seccionActual = campo.seccion;
        lista.appendChild(el('div', 'sub-seccion', seccionActual || 'Sin seccion'));
      }

      const fila = el('div', 'fila-config');

      const txt = el('div', 'fila-config-txt');
      txt.appendChild(el('div', 'fila-config-etq', campo.etiqueta));
      txt.appendChild(el('div', 'fila-config-tipo', tipoLegible(campo)));
      fila.appendChild(txt);

      const controles = el('div', 'fila-config-btns');

      const oblig = el('button', 'pastilla' + (campo.requerido ? ' activa' : ''),
                       campo.requerido ? 'Obligatoria' : 'Opcional');
      oblig.type = 'button';
      oblig.addEventListener('click', function () {
        campo.requerido = !campo.requerido;
        pintarListaConfig(lista);
      });
      controles.appendChild(oblig);

      const quitar = el('button', 'pastilla quitar', 'Quitar');
      quitar.type = 'button';
      quitar.addEventListener('click', function () {
        n.campos.splice(i, 1);
        ir('configurar', false);
      });
      controles.appendChild(quitar);

      fila.appendChild(controles);
      lista.appendChild(fila);
    });
  }

  function tipoLegible(campo) {
    const nombres = {
      texto: 'Texto', parrafo: 'Texto largo', numero: 'Numero', telefono: 'Celular',
      correo: 'Correo', documento: 'Documento', fecha: 'Fecha', lista: 'Lista desplegable',
      radio: 'Una opcion', multiple: 'Varias opciones', escala: 'Escala 1-5',
      nps: 'Escala 0-10', sino: 'Si / No', foto: 'Foto', firma: 'Firma'
    };
    let t = nombres[campo.tipo] || campo.tipo;
    if (campo.condicion) t += ' · condicional';
    return t;
  }

  /* =====================================================================
     VISTA: VISTA PREVIA
     ===================================================================== */

  function renderPreview() {
    const cont = $('#contenido');
    const n = estado.nueva;

    const nota = el('div', 'panel-aviso');
    nota.appendChild(el('strong', null, 'Asi lo vera el encuestador'));
    nota.appendChild(el('p', null,
      'Puedes probarlo libremente: nada de lo que escribas aqui se guarda.'));
    cont.appendChild(nota);

    const caja = el('div');
    cont.appendChild(caja);
    FORMULARIO.crear(caja, n.campos, {});

    accion([
      boton('Ajustar', 'secundario', function () { atras(); }),
      boton('Publicar activacion', 'principal', publicar)
    ]);
  }

  function publicar() {
    const n = estado.nueva;
    DB.activaciones.crear({
      nombre: n.nombre.trim(),
      marcaId: n.marcaId,
      plantillaId: n.plantillaId,
      campos: n.campos,     // copia congelada
      estado: 'activa'
    }).then(function (id) {
      return DB.activaciones.obtener(id);
    }).then(function (act) {
      estado.nueva = null;
      estado.activacion = act;
      estado.pila = ['inicio'];
      avisar('Activacion publicada. Ya puedes encuestar.', 'ok');
      ir('encuestar', false);
    }).catch(function (e) {
      avisar('No se pudo publicar: ' + e.message, 'error');
    });
  }

  /* =====================================================================
     VISTA: ENCUESTAR
     ===================================================================== */

  function claveBorrador() {
    return BORRADOR_KEY + '_' + (estado.activacion ? estado.activacion.id : 'x');
  }

  function renderEncuestar() {
    const cont = $('#contenido');
    const act = estado.activacion;
    if (!act) { ir('inicio', false); return; }

    const a = ajustes();
    if (!a.encuestador) {
      const av = el('div', 'panel-aviso');
      av.appendChild(el('strong', null, 'Falta el nombre del encuestador'));
      av.appendChild(el('p', null, 'Se pide una sola vez por tablet y queda guardado.'));
      av.appendChild(boton('Ir a Ajustes', 'principal', function () { ir('ajustes'); }));
      cont.appendChild(av);
      return;
    }

    const campos = EXPORTAR.camposDe(act);

    const cab = el('div', 'cab-activacion');
    cab.appendChild(el('div', 'cab-activacion-nombre', act.nombre));
    cab.appendChild(el('div', 'cab-activacion-meta', 'Encuestador: ' + a.encuestador));
    cont.appendChild(cab);

    const caja = el('div');
    cont.appendChild(caja);

    let iniciales = {};
    if (estado.editandoId === null) {
      try { iniciales = JSON.parse(localStorage.getItem(claveBorrador())) || {}; }
      catch (e) { iniciales = {}; }
      // Valores por defecto de la plantilla
      campos.forEach(function (c) {
        if (c.valor !== undefined && iniciales[c.id] === undefined) iniciales[c.id] = c.valor;
      });
    } else {
      iniciales = estado.valoresEdicion || {};
    }

    estado.form = FORMULARIO.crear(caja, campos, iniciales);

    if (estado.editandoId === null) {
      estado.form.alCambiar(function (v) {
        try { localStorage.setItem(claveBorrador(), JSON.stringify(v)); } catch (e) {}
      });
    }

    const botones = [];
    if (estado.editandoId !== null) {
      botones.push(boton('Cancelar', 'secundario', function () {
        estado.editandoId = null;
        estado.valoresEdicion = null;
        atras();
      }));
    } else {
      botones.push(boton('Limpiar', 'secundario', function () {
        if (!confirm('Borrar lo escrito en este formulario?')) return;
        localStorage.removeItem(claveBorrador());
        ir('encuestar', false);
      }));
    }
    botones.push(boton(estado.editandoId !== null ? 'Guardar cambios' : 'Guardar encuesta',
                       'principal', guardarRespuesta));
    accion(botones);
  }

  function guardarRespuesta() {
    const act = estado.activacion;
    if (!estado.form.validar()) {
      avisar('Revisa los campos marcados.', 'error');
      return;
    }

    const valores = JSON.parse(JSON.stringify(estado.form.valores));
    const campos = EXPORTAR.camposDe(act);
    const campoDoc = campos.filter(function (c) { return c.tipo === 'documento'; })[0];

    const revisarDuplicado = (campoDoc && valores[campoDoc.id])
      ? DB.respuestas.buscarDocumento(act.id, campoDoc.id, valores[campoDoc.id], estado.editandoId)
      : Promise.resolve(null);

    revisarDuplicado.then(function (repetido) {
      if (repetido) {
        const seguir = confirm('El documento ' + valores[campoDoc.id] +
          ' ya fue registrado en esta activacion el ' + fechaCorta(repetido.creado) +
          '.\n\nGuardar de todas formas?');
        if (!seguir) throw { cancelado: true };
      }

      const base = {
        activacionId: act.id,
        marcaId: act.marcaId,
        plantillaId: act.plantillaId,
        encuestador: ajustes().encuestador,
        datos: valores
      };

      if (estado.editandoId !== null) {
        return DB.respuestas.obtener(estado.editandoId).then(function (orig) {
          return DB.respuestas.actualizar(Object.assign({}, orig, base));
        }).then(function () { return 'editada'; });
      }
      return DB.respuestas.crear(base).then(function () { return 'creada'; });

    }).then(function (accionHecha) {
      if (accionHecha === 'editada') {
        estado.editandoId = null;
        estado.valoresEdicion = null;
        avisar('Cambios guardados.', 'ok');
        atras();
      } else {
        localStorage.removeItem(claveBorrador());
        avisar('Encuesta guardada.', 'ok');
        if (navigator.vibrate) navigator.vibrate(60);
        ir('encuestar', false);
      }
    }).catch(function (e) {
      if (!e || !e.cancelado) avisar('No se pudo guardar: ' + (e.message || 'error'), 'error');
    });
  }

  /* =====================================================================
     VISTA: RESULTADOS
     ===================================================================== */

  function renderResultados() {
    const cont = $('#contenido');
    const f = estado.filtro;

    /* ---- Filtros ---- */
    const panel = el('div', 'panel-filtros');

    // Marca
    const selMarca = el('select', 'entrada');
    selMarca.appendChild(new Option('Todas las marcas', ''));
    MARCAS.forEach(function (m) { selMarca.appendChild(new Option(m.nombre, m.id)); });
    selMarca.value = f.marcaId || '';
    selMarca.addEventListener('change', function () {
      estado.filtro = { marcaId: selMarca.value || undefined };
      ir('resultados', false);
    });
    panel.appendChild(campoFiltro('Marca', selMarca));

    // Activacion (solo las de la marca elegida)
    const selAct = el('select', 'entrada');
    selAct.appendChild(new Option('Todas las activaciones', ''));
    panel.appendChild(campoFiltro('Activacion', selAct));

    // Plantilla
    const selPla = el('select', 'entrada');
    selPla.appendChild(new Option('Todas las plantillas', ''));
    PLANTILLAS.forEach(function (p) { selPla.appendChild(new Option(p.nombre, p.id)); });
    selPla.value = f.plantillaId || '';
    selPla.addEventListener('change', function () {
      estado.filtro.plantillaId = selPla.value || undefined;
      ir('resultados', false);
    });
    panel.appendChild(campoFiltro('Plantilla', selPla));

    // Fechas
    const desde = el('input', 'entrada'); desde.type = 'date'; desde.value = f.desde || '';
    const hasta = el('input', 'entrada'); hasta.type = 'date'; hasta.value = f.hasta || '';
    desde.addEventListener('change', function () { estado.filtro.desde = desde.value || undefined; ir('resultados', false); });
    hasta.addEventListener('change', function () { estado.filtro.hasta = hasta.value || undefined; ir('resultados', false); });
    panel.appendChild(campoFiltro('Desde', desde));
    panel.appendChild(campoFiltro('Hasta', hasta));

    cont.appendChild(panel);

    const buscar = el('input', 'entrada buscar');
    buscar.type = 'search';
    buscar.placeholder = 'Buscar por nombre, documento, correo...';
    buscar.value = f.texto || '';
    let tBusq = null;
    buscar.addEventListener('input', function () {
      clearTimeout(tBusq);
      tBusq = setTimeout(function () {
        estado.filtro.texto = buscar.value || undefined;
        cargarLista();
      }, 250);
    });
    cont.appendChild(buscar);

    const resumen = el('p', 'resumen');
    cont.appendChild(resumen);
    const lista = el('div');
    cont.appendChild(lista);

    /* Poblar activaciones segun la marca */
    DB.activaciones.todas().then(function (acts) {
      const suyas = f.marcaId ? acts.filter(function (a) { return a.marcaId === f.marcaId; }) : acts;
      suyas.forEach(function (a) {
        const m = MARCA.porId(a.marcaId);
        selAct.appendChild(new Option(a.nombre + (f.marcaId ? '' : '  (' + (m ? m.nombre : a.marcaId) + ')'), a.id));
      });
      selAct.value = f.activacionId || '';
      selAct.addEventListener('change', function () {
        estado.filtro.activacionId = selAct.value || undefined;
        ir('resultados', false);
      });
      cargarLista();
    });

    function cargarLista() {
      Promise.all([DB.respuestas.filtrar(estado.filtro), DB.activaciones.todas()])
        .then(function (r) {
          const respuestas = r[0];
          const porId = {};
          r[1].forEach(function (a) { porId[a.id] = a; });

          resumen.textContent = respuestas.length
            ? respuestas.length + (respuestas.length === 1 ? ' respuesta' : ' respuestas')
            : 'Ninguna respuesta coincide con el filtro.';

          lista.innerHTML = '';
          respuestas.slice(0, 200).forEach(function (resp) {
            lista.appendChild(tarjetaRespuesta(resp, porId[resp.activacionId]));
          });
          if (respuestas.length > 200) {
            lista.appendChild(el('p', 'ayuda',
              'Se muestran las 200 mas recientes. La exportacion incluye las ' + respuestas.length + '.'));
          }

          accion([
            boton('Excel', 'principal', function () { exportar('excel'); }),
            boton('CSV', 'secundario', function () { exportar('csv'); }),
            boton('Imagenes', 'secundario', function () { exportar('imagenes'); })
          ]);
        });
    }
  }

  function campoFiltro(etiqueta, control) {
    const c = el('div', 'campo-filtro');
    c.appendChild(el('label', 'etiqueta-filtro', etiqueta));
    c.appendChild(control);
    return c;
  }

  function resumenRespuesta(resp, campos) {
    const textos = campos.filter(function (c) {
      return ['texto', 'documento', 'correo', 'telefono'].indexOf(c.tipo) >= 0;
    }).slice(0, 2);
    const partes = textos.map(function (c) { return (resp.datos || {})[c.id]; }).filter(Boolean);
    return partes.length ? partes.join(' ') : 'Respuesta ' + resp.id;
  }

  function tarjetaRespuesta(resp, act) {
    const campos = EXPORTAR.camposDe(act);
    const marca = MARCA.porId(resp.marcaId);
    const t = el('article', 'tarjeta');

    const cab = el('div', 'tarjeta-cab');
    cab.appendChild(el('span', 'tarjeta-num', '#' + resp.id));
    cab.appendChild(el('span', 'tarjeta-titulo', resumenRespuesta(resp, campos)));
    t.appendChild(cab);

    t.appendChild(el('div', 'tarjeta-meta',
      (marca ? marca.nombre : resp.marcaId) + '  ·  ' + (act ? act.nombre : '') +
      '  ·  ' + fechaCorta(resp.creado) + '  ·  ' + (resp.encuestador || '')));

    const acc = el('div', 'tarjeta-acciones');

    acc.appendChild(boton('Ver', 'secundario chico', function () { verDetalle(resp, act); }));

    acc.appendChild(boton('Editar', 'secundario chico', function () {
      estado.activacion = act;
      estado.editandoId = resp.id;
      estado.valoresEdicion = JSON.parse(JSON.stringify(resp.datos || {}));
      ir('encuestar');
    }));

    acc.appendChild(boton('Eliminar', 'peligro chico', function () {
      if (!confirm('Eliminar la respuesta #' + resp.id + '?')) return;
      DB.respuestas.eliminar(resp.id).then(function () {
        avisar('Respuesta eliminada.', 'ok');
        ir('resultados', false);
      });
    }));

    t.appendChild(acc);
    return t;
  }

  function verDetalle(resp, act) {
    const cuerpo = $('#detalle-cuerpo');
    cuerpo.innerHTML = '';

    const marca = MARCA.porId(resp.marcaId);
    const plantilla = PLANTILLA.porId(resp.plantillaId);

    const meta = el('div', 'detalle-meta');
    meta.appendChild(el('div', null, 'Respuesta #' + resp.id));
    meta.appendChild(el('div', null, (marca ? marca.nombre : '') + ' · ' + (act ? act.nombre : '')));
    meta.appendChild(el('div', null, (plantilla ? plantilla.nombre : '') + ' · ' + fechaCorta(resp.creado)));
    meta.appendChild(el('div', null, 'Encuestador: ' + (resp.encuestador || '')));
    cuerpo.appendChild(meta);

    EXPORTAR.camposDe(act).forEach(function (c) {
      const v = (resp.datos || {})[c.id];
      if (v === undefined || v === null || v === '') return;

      const f = el('div', 'detalle-fila');
      f.appendChild(el('div', 'detalle-etq', c.etiqueta));
      if ((c.tipo === 'foto' || c.tipo === 'firma') && String(v).indexOf('data:') === 0) {
        const img = el('img', 'detalle-img');
        img.src = v;
        f.appendChild(img);
      } else {
        f.appendChild(el('div', 'detalle-val', Array.isArray(v) ? v.join(', ') : String(v)));
      }
      cuerpo.appendChild(f);
    });

    $('#detalle').showModal();
  }

  function exportar(tipo) {
    EXPORTAR[tipo](estado.filtro).then(function (n) {
      avisar('Archivo generado con ' + n + (tipo === 'imagenes' ? ' imagenes.' : ' registros.') +
             ' Busca en Descargas.', 'ok');
    }).catch(function (e) {
      avisar(e.message || 'No se pudo exportar.', 'error');
    });
  }

  /* =====================================================================
     VISTA: AJUSTES
     ===================================================================== */

  function renderAjustes() {
    const cont = $('#contenido');
    const a = ajustes();

    cont.appendChild(el('h2', 'seccion', 'Esta tablet'));

    const c1 = el('div', 'campo');
    const l1 = el('label', 'etiqueta', 'Nombre del encuestador');
    l1.setAttribute('for', 'in-encuestador');
    l1.appendChild(el('span', 'req', ' *'));
    c1.appendChild(l1);
    const i1 = el('input', 'entrada');
    i1.id = 'in-encuestador';
    i1.value = a.encuestador || '';
    i1.placeholder = 'Ej: Ana Quispe';
    i1.addEventListener('input', function () {
      const x = ajustes(); x.encuestador = i1.value.trim(); guardarAjustes(x);
    });
    c1.appendChild(i1);
    c1.appendChild(el('div', 'ayuda', 'Queda registrado en cada encuesta que se guarde en este equipo.'));
    cont.appendChild(c1);

    cont.appendChild(el('h2', 'seccion', 'Respaldo de seguridad'));
    cont.appendChild(el('p', 'ayuda',
      'El respaldo guarda TODO: activaciones, respuestas y fotos de todas las marcas. ' +
      'Hazlo al final de cada jornada.'));

    const pila = el('div', 'pila');
    pila.appendChild(boton('Crear respaldo (.json)', 'secundario', function () {
      EXPORTAR.respaldo().then(function (n) {
        avisar('Respaldo creado con ' + n + ' respuestas.', 'ok');
      });
    }));

    const lblImp = el('label', 'boton secundario etiqueta-archivo');
    lblImp.textContent = 'Restaurar desde un respaldo';
    const inpImp = el('input');
    inpImp.type = 'file';
    inpImp.accept = '.json,application/json';
    inpImp.hidden = true;
    inpImp.addEventListener('change', function () {
      const f = inpImp.files && inpImp.files[0];
      if (f) importar(f);
      inpImp.value = '';
    });
    lblImp.appendChild(inpImp);
    pila.appendChild(lblImp);
    cont.appendChild(pila);

    cont.appendChild(el('h2', 'seccion', 'Instalar en la pantalla de inicio'));
    const ayudaInst = el('p', 'ayuda');
    ayudaInst.id = 'ayuda-instalar';
    ayudaInst.textContent = 'Menu del navegador (tres puntos) → Instalar aplicacion.';
    cont.appendChild(ayudaInst);
    const pilaInst = el('div', 'pila');
    const btnInst = boton('Instalar la aplicacion', 'principal', function () {
      if (window.__instalacionPendiente) {
        window.__instalacionPendiente.prompt();
        window.__instalacionPendiente = null;
        btnInst.hidden = true;
      }
    });
    btnInst.hidden = !window.__instalacionPendiente;
    pilaInst.appendChild(btnInst);
    cont.appendChild(pilaInst);

    cont.appendChild(el('h2', 'seccion', 'Almacenamiento'));
    const esp = el('p', 'ayuda', 'Calculando...');
    cont.appendChild(esp);
    DB.espacio().then(function (e) {
      if (!e || !e.quota) { esp.textContent = ''; return; }
      esp.textContent = 'Usado: ' + (e.usage / 1048576).toFixed(1) + ' MB de ' +
                        (e.quota / 1048576).toFixed(0) + ' MB disponibles.';
    });

    cont.appendChild(el('h2', 'seccion', 'Borrar datos de una marca'));
    cont.appendChild(el('p', 'ayuda',
      'Borra unicamente las respuestas de la marca elegida. Las demas marcas no se tocan. ' +
      'Exporta el Excel y el respaldo antes.'));

    const selBorrar = el('select', 'entrada');
    selBorrar.appendChild(new Option('-- Elegir marca --', ''));
    MARCAS.forEach(function (m) { selBorrar.appendChild(new Option(m.nombre, m.id)); });

    const filaBorrar = el('div', 'fila-agregar');
    filaBorrar.appendChild(selBorrar);
    filaBorrar.appendChild(boton('Borrar respuestas', 'peligro', function () {
      if (!selBorrar.value) { avisar('Elige una marca primero.', 'info'); return; }
      const m = MARCA.porId(selBorrar.value);
      DB.respuestas.filtrar({ marcaId: selBorrar.value }).then(function (rs) {
        if (!rs.length) { avisar('Esa marca no tiene respuestas.', 'info'); return; }
        if (!confirm('Vas a borrar ' + rs.length + ' respuestas de ' + m.nombre + '.\n\nYa exportaste?')) return;
        if (prompt('Para confirmar, escribe:  BORRAR') !== 'BORRAR') {
          avisar('Cancelado. No se borro nada.', 'info');
          return;
        }
        DB.vaciar({ marcaId: selBorrar.value }).then(function (n) {
          avisar('Se borraron ' + n + ' respuestas de ' + m.nombre + '.', 'ok');
        });
      });
    }));
    cont.appendChild(filaBorrar);

    const pie = el('div', 'pie-marca');
    const img = el('img');
    img.src = 'icons/forus-logo.png';
    img.alt = 'Forus';
    pie.appendChild(img);
    cont.appendChild(pie);
  }

  function importar(archivo) {
    const lector = new FileReader();
    lector.onload = function () {
      let paquete;
      try { paquete = JSON.parse(lector.result); }
      catch (e) { avisar('El archivo no es un respaldo valido.', 'error'); return; }

      DB.importar(paquete).then(function (r) {
        avisar('Importado: ' + r.activaciones + ' activaciones y ' + r.respuestas + ' respuestas.' +
               (r.omitidas ? ' (' + r.omitidas + ' ya existian)' : ''), 'ok');
      }).catch(function (e) {
        avisar('Error al importar: ' + e.message, 'error');
      });
    };
    lector.readAsText(archivo);
  }

  /* ================= Arranque ================= */

  function iniciar() {
    document.title = CONFIG.nombreApp;
    $('#version').textContent = 'v' + CONFIG.version;

    DB.protegerDatos();

    $('#btn-atras').addEventListener('click', atras);
    $('#tab-inicio').addEventListener('click', function () { estado.pila = []; ir('inicio', false); });
    $('#tab-resultados').addEventListener('click', function () { estado.pila = []; ir('resultados', false); });
    $('#tab-ajustes').addEventListener('click', function () { estado.pila = []; ir('ajustes', false); });
    $('#cerrar-detalle').addEventListener('click', function () { $('#detalle').close(); });

    ir('inicio', false);
  }

  return { iniciar: iniciar, ir: ir, _estado: estado };
})();

document.addEventListener('DOMContentLoaded', APP.iniciar);
