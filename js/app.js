/* =====================================================================
   LOGICA DE LA APLICACION
   No editar. Para cambiar las preguntas edita js/config.js
   ===================================================================== */

const APP = (function () {

  const estado = {
    vista: 'formulario',
    valores: {},        // respuestas del formulario en curso
    editandoId: null,   // id del registro que se esta editando, o null
    registros: [],
    filtro: ''
  };

  const AJUSTES_KEY = 'ajustes_encuesta';
  const BORRADOR_KEY = 'borrador_encuesta';

  /* ================= Utilidades ================= */

  const $ = function (sel) { return document.querySelector(sel); };

  function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function ajustes() {
    try { return JSON.parse(localStorage.getItem(AJUSTES_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function guardarAjustes(a) {
    localStorage.setItem(AJUSTES_KEY, JSON.stringify(a));
  }

  let temporizadorAviso = null;
  function avisar(mensaje, tipo) {
    const caja = $('#aviso');
    caja.textContent = mensaje;
    caja.className = 'aviso ' + (tipo || 'ok') + ' visible';
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { caja.className = 'aviso'; }, 3800);
  }

  function camposReales() {
    return CONFIG.campos.filter(function (c) { return c.tipo !== 'titulo' && c.id; });
  }

  /* ================= Visibilidad condicional ================= */

  function visible(campo) {
    if (!campo.condicion) return true;
    const v = estado.valores[campo.condicion.campo];
    if (Array.isArray(v)) return v.indexOf(campo.condicion.igual) >= 0;
    return v === campo.condicion.igual;
  }

  function refrescarCondicionales() {
    CONFIG.campos.forEach(function (campo) {
      if (!campo.id || !campo.condicion) return;
      const fila = document.getElementById('fila-' + campo.id);
      if (!fila) return;
      const mostrar = visible(campo);
      fila.hidden = !mostrar;
      // Si se oculta, su respuesta deja de contar
      if (!mostrar && estado.valores[campo.id] !== undefined) {
        delete estado.valores[campo.id];
        const dentro = fila.querySelectorAll('input, textarea, select');
        dentro.forEach(function (i) {
          if (i.type === 'checkbox' || i.type === 'radio') i.checked = false;
          else i.value = '';
        });
        fila.querySelectorAll('.opcion.activa').forEach(function (b) {
          b.classList.remove('activa');
        });
      }
    });
  }

  function alCambiar(id, valor) {
    if (valor === '' || valor === null || valor === undefined) delete estado.valores[id];
    else estado.valores[id] = valor;
    refrescarCondicionales();
    guardarBorrador();
  }

  /* ================= Borrador automatico ================= */
  /* Si la tablet se apaga o se cierra la app a medio llenar, al volver
     a abrir se recupera lo que se habia escrito.                        */

  let temporizadorBorrador = null;
  function guardarBorrador() {
    if (estado.editandoId) return;   // editando: no se toca el borrador
    clearTimeout(temporizadorBorrador);
    temporizadorBorrador = setTimeout(function () {
      try { localStorage.setItem(BORRADOR_KEY, JSON.stringify(estado.valores)); }
      catch (e) { /* sin espacio: no es critico */ }
    }, 400);
  }

  function limpiarBorrador() { localStorage.removeItem(BORRADOR_KEY); }

  function leerBorrador() {
    try {
      const b = JSON.parse(localStorage.getItem(BORRADOR_KEY));
      return (b && Object.keys(b).length) ? b : null;
    } catch (e) { return null; }
  }

  /* ================= Construccion del formulario ================= */

  function construirCampo(campo) {
    const fila = el('div', 'campo');
    fila.id = 'fila-' + campo.id;

    const etq = el('label', 'etiqueta');
    etq.textContent = campo.etiqueta;
    if (campo.requerido) etq.appendChild(el('span', 'req', ' *'));
    etq.setAttribute('for', 'c-' + campo.id);
    fila.appendChild(etq);

    const valor = estado.valores[campo.id];

    switch (campo.tipo) {

      case 'parrafo': {
        const t = el('textarea', 'entrada');
        t.id = 'c-' + campo.id;
        t.rows = 3;
        t.value = valor || '';
        t.addEventListener('input', function () { alCambiar(campo.id, t.value.trim()); });
        fila.appendChild(t);
        break;
      }

      case 'lista': {
        const s = el('select', 'entrada');
        s.id = 'c-' + campo.id;
        s.appendChild(new Option('-- Seleccione --', ''));
        (campo.opciones || []).forEach(function (o) {
          s.appendChild(new Option(o, o));
        });
        s.value = valor || '';
        s.addEventListener('change', function () { alCambiar(campo.id, s.value); });
        fila.appendChild(s);
        break;
      }

      case 'radio':
      case 'sino': {
        const opciones = campo.tipo === 'sino' ? ['Si', 'No'] : (campo.opciones || []);
        const caja = el('div', 'opciones' + (campo.tipo === 'sino' ? ' dos' : ''));
        opciones.forEach(function (o) {
          const b = el('button', 'opcion', o);
          b.type = 'button';
          if (valor === o) b.classList.add('activa');
          b.addEventListener('click', function () {
            const yaEstaba = b.classList.contains('activa');
            caja.querySelectorAll('.opcion').forEach(function (x) { x.classList.remove('activa'); });
            if (yaEstaba && !campo.requerido) {
              alCambiar(campo.id, '');          // permite desmarcar si es opcional
            } else {
              b.classList.add('activa');
              alCambiar(campo.id, o);
            }
          });
          caja.appendChild(b);
        });
        fila.appendChild(caja);
        break;
      }

      case 'multiple': {
        const caja = el('div', 'opciones');
        const sel = Array.isArray(valor) ? valor.slice() : [];
        (campo.opciones || []).forEach(function (o) {
          const b = el('button', 'opcion', o);
          b.type = 'button';
          if (sel.indexOf(o) >= 0) b.classList.add('activa');
          b.addEventListener('click', function () {
            const i = sel.indexOf(o);
            if (i >= 0) { sel.splice(i, 1); b.classList.remove('activa'); }
            else { sel.push(o); b.classList.add('activa'); }
            alCambiar(campo.id, sel.length ? sel.slice() : '');
          });
          caja.appendChild(b);
        });
        fila.appendChild(caja);
        break;
      }

      case 'escala': {
        const min = campo.min || 1, max = campo.max || 5;
        const caja = el('div', 'opciones escala');
        for (let n = min; n <= max; n++) {
          const b = el('button', 'opcion', String(n));
          b.type = 'button';
          if (String(valor) === String(n)) b.classList.add('activa');
          (function (num) {
            b.addEventListener('click', function () {
              caja.querySelectorAll('.opcion').forEach(function (x) { x.classList.remove('activa'); });
              b.classList.add('activa');
              alCambiar(campo.id, num);
            });
          })(n);
          caja.appendChild(b);
        }
        fila.appendChild(caja);
        break;
      }

      case 'foto': {
        const caja = el('div', 'foto-caja');
        const vista = el('img', 'foto-vista');
        vista.hidden = !valor;
        if (valor) vista.src = valor;

        const input = el('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.hidden = true;

        const btn = el('button', 'boton secundario', valor ? 'Cambiar foto' : 'Tomar foto');
        btn.type = 'button';
        btn.addEventListener('click', function () { input.click(); });

        const quitar = el('button', 'boton peligro chico', 'Quitar');
        quitar.type = 'button';
        quitar.hidden = !valor;
        quitar.addEventListener('click', function () {
          vista.hidden = true; vista.removeAttribute('src');
          quitar.hidden = true; btn.textContent = 'Tomar foto';
          input.value = '';
          alCambiar(campo.id, '');
        });

        input.addEventListener('change', function () {
          const f = input.files && input.files[0];
          if (!f) return;
          btn.disabled = true; btn.textContent = 'Procesando...';
          comprimirImagen(f).then(function (dataUrl) {
            vista.src = dataUrl; vista.hidden = false;
            quitar.hidden = false;
            btn.disabled = false; btn.textContent = 'Cambiar foto';
            alCambiar(campo.id, dataUrl);
          }).catch(function () {
            btn.disabled = false; btn.textContent = 'Tomar foto';
            avisar('No se pudo procesar la foto.', 'error');
          });
        });

        caja.appendChild(vista);
        const acciones = el('div', 'fila-botones');
        acciones.appendChild(btn);
        acciones.appendChild(quitar);
        caja.appendChild(acciones);
        caja.appendChild(input);
        fila.appendChild(caja);
        break;
      }

      case 'firma': {
        fila.appendChild(construirFirma(campo, valor));
        break;
      }

      default: {   // texto, numero, telefono, correo, documento, fecha
        const i = el('input', 'entrada');
        i.id = 'c-' + campo.id;
        i.value = valor === undefined ? '' : valor;

        if (campo.tipo === 'numero') {
          i.type = 'number'; i.inputMode = 'decimal';
          if (campo.min !== undefined) i.min = campo.min;
          if (campo.max !== undefined) i.max = campo.max;
        } else if (campo.tipo === 'telefono') {
          i.type = 'tel'; i.inputMode = 'numeric'; i.maxLength = 9;
          i.placeholder = '9########';
        } else if (campo.tipo === 'correo') {
          i.type = 'email'; i.inputMode = 'email';
          i.autocapitalize = 'off'; i.spellcheck = false;
          i.placeholder = 'nombre@correo.com';
        } else if (campo.tipo === 'documento') {
          i.type = 'text'; i.inputMode = 'numeric'; i.maxLength = 12;
          i.autocapitalize = 'characters';
        } else if (campo.tipo === 'fecha') {
          i.type = 'date';
          i.max = new Date().toISOString().slice(0, 10);   // no fechas futuras
        } else {
          i.type = 'text';
          i.autocapitalize = 'words';
        }

        i.addEventListener('input', function () { alCambiar(campo.id, i.value.trim()); });
        fila.appendChild(i);
        break;
      }
    }

    if (campo.ayuda) fila.appendChild(el('div', 'ayuda', campo.ayuda));
    fila.appendChild(el('div', 'error'));
    return fila;
  }

  /* ---------- Firma con el dedo ---------- */

  function construirFirma(campo, valor) {
    const caja = el('div', 'firma-caja');
    const lienzo = el('canvas', 'firma');
    lienzo.width = 600; lienzo.height = 220;
    const ctx = lienzo.getContext('2d');

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';

    let vacia = true;
    if (valor) {
      const img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height); };
      img.src = valor;
      vacia = false;
    }

    let dibujando = false;

    // Convierte la posicion del dedo a coordenadas internas del lienzo
    function punto(e) {
      const r = lienzo.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (lienzo.width  / r.width),
        y: (e.clientY - r.top)  * (lienzo.height / r.height)
      };
    }

    lienzo.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dibujando = true; vacia = false;
      lienzo.setPointerCapture(e.pointerId);
      const p = punto(e);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    });

    lienzo.addEventListener('pointermove', function (e) {
      if (!dibujando) return;
      e.preventDefault();
      const p = punto(e);
      ctx.lineTo(p.x, p.y); ctx.stroke();
    });

    function terminar() {
      if (!dibujando) return;
      dibujando = false;
      alCambiar(campo.id, vacia ? '' : lienzo.toDataURL('image/png'));
    }
    lienzo.addEventListener('pointerup', terminar);
    lienzo.addEventListener('pointercancel', terminar);
    lienzo.addEventListener('pointerleave', terminar);

    const borrar = el('button', 'boton secundario chico', 'Borrar firma');
    borrar.type = 'button';
    borrar.addEventListener('click', function () {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      vacia = true;
      alCambiar(campo.id, '');
    });

    caja.appendChild(lienzo);
    caja.appendChild(borrar);
    return caja;
  }

  /* ---------- Compresion de fotos ----------
     Una foto de tablet pesa 3-5 MB. Sin comprimir, 200 encuestas
     llenarian el almacenamiento. Se reduce a 1200 px y calidad 70%,
     lo que deja cada foto en unos 150 KB.                              */

  function comprimirImagen(archivo) {
    return new Promise(function (ok, err) {
      const lector = new FileReader();
      lector.onerror = function () { err(new Error('lectura')); };
      lector.onload = function () {
        const img = new Image();
        img.onerror = function () { err(new Error('imagen')); };
        img.onload = function () {
          const MAX = 1200;
          let { width: w, height: h } = img;
          if (w > MAX || h > MAX) {
            const f = Math.min(MAX / w, MAX / h);
            w = Math.round(w * f); h = Math.round(h * f);
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const cx = c.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
          cx.drawImage(img, 0, 0, w, h);
          ok(c.toDataURL('image/jpeg', 0.7));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }

  /* ================= Validacion ================= */

  function validarCampo(campo) {
    const v = estado.valores[campo.id];
    const vacio = v === undefined || v === null || v === '' ||
                  (Array.isArray(v) && v.length === 0);

    if (vacio) return campo.requerido ? 'Este dato es obligatorio.' : '';

    const s = String(v).trim();

    if (campo.tipo === 'telefono') {
      if (!/^9\d{8}$/.test(s)) return 'El celular debe tener 9 digitos y empezar con 9.';
    }

    if (campo.tipo === 'correo') {
      if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(s)) return 'El correo no parece valido.';
    }

    if (campo.tipo === 'documento') {
      const tipo = estado.valores[campo.dependeDe || 'tipo_documento'];
      if (tipo === 'DNI') {
        if (!/^\d{8}$/.test(s)) return 'El DNI debe tener exactamente 8 digitos.';
      } else if (tipo === 'Carne de extranjeria') {
        if (!/^\d{9,12}$/.test(s)) return 'El carne de extranjeria debe tener de 9 a 12 digitos.';
      } else if (tipo === 'Pasaporte') {
        if (!/^[A-Za-z0-9]{6,12}$/.test(s)) return 'El pasaporte debe tener de 6 a 12 caracteres.';
      } else {
        if (!/^[A-Za-z0-9]{6,12}$/.test(s)) return 'El documento debe tener de 6 a 12 caracteres.';
      }
    }

    if (campo.tipo === 'numero') {
      const n = Number(s);
      if (!isFinite(n)) return 'Debe ser un numero.';
      if (campo.min !== undefined && n < campo.min) return 'El minimo es ' + campo.min + '.';
      if (campo.max !== undefined && n > campo.max) return 'El maximo es ' + campo.max + '.';
    }

    if (campo.tipo === 'fecha') {
      const d = new Date(s);
      if (isNaN(d)) return 'Fecha no valida.';
      if (d > new Date()) return 'La fecha no puede ser futura.';
    }

    return '';
  }

  function validarTodo() {
    let primerError = null;
    camposReales().forEach(function (campo) {
      const fila = document.getElementById('fila-' + campo.id);
      if (!fila) return;
      const caja = fila.querySelector('.error');
      if (!visible(campo)) { caja.textContent = ''; fila.classList.remove('con-error'); return; }

      const msg = validarCampo(campo);
      caja.textContent = msg;
      fila.classList.toggle('con-error', !!msg);
      if (msg && !primerError) primerError = fila;
    });

    if (primerError) primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !primerError;
  }

  /* ================= Vista: formulario ================= */

  function renderFormulario() {
    const cont = $('#formulario');
    cont.innerHTML = '';

    const a = ajustes();
    if (!a.encuestador || !a.punto) {
      const av = el('div', 'panel-aviso');
      av.appendChild(el('strong', null, 'Falta configurar la tablet'));
      av.appendChild(el('p', null,
        'Antes de empezar, ingresa el nombre del encuestador y el punto de trabajo en Ajustes.'));
      const b = el('button', 'boton', 'Ir a Ajustes');
      b.type = 'button';
      b.addEventListener('click', function () { irA('ajustes'); });
      av.appendChild(b);
      cont.appendChild(av);
      $('#barra-guardar').hidden = true;
      return;
    }
    $('#barra-guardar').hidden = false;

    CONFIG.campos.forEach(function (campo) {
      if (campo.tipo === 'titulo') {
        cont.appendChild(el('h2', 'seccion', campo.etiqueta));
      } else if (campo.id) {
        cont.appendChild(construirCampo(campo));
      }
    });

    refrescarCondicionales();

    $('#txt-guardar').textContent = estado.editandoId ? 'Guardar cambios' : 'Guardar encuesta';
    $('#btn-cancelar-edicion').hidden = !estado.editandoId;
  }

  function valoresPorDefecto() {
    const v = {};
    CONFIG.campos.forEach(function (c) {
      if (c.id && c.valor !== undefined) v[c.id] = c.valor;
    });
    return v;
  }

  function nuevoFormulario(conservarBorrador) {
    estado.editandoId = null;
    estado.valores = valoresPorDefecto();
    if (conservarBorrador) {
      const b = leerBorrador();
      if (b) Object.assign(estado.valores, b);
    } else {
      limpiarBorrador();
    }
    renderFormulario();
    window.scrollTo({ top: 0 });
  }

  /* ---------- Guardar ---------- */

  function ubicacion() {
    if (!CONFIG.pedirGPS || !navigator.geolocation) return Promise.resolve(null);
    return new Promise(function (ok) {
      const corte = setTimeout(function () { ok(null); }, 6000);
      navigator.geolocation.getCurrentPosition(
        function (p) {
          clearTimeout(corte);
          ok({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) });
        },
        function () { clearTimeout(corte); ok(null); },
        { enableHighAccuracy: false, timeout: 5500, maximumAge: 120000 }
      );
    });
  }

  // Avisa si ese documento ya fue registrado antes (posible duplicado)
  function revisarDuplicado() {
    const campoDoc = camposReales().filter(function (c) { return c.tipo === 'documento'; })[0];
    if (!campoDoc) return Promise.resolve(true);
    const doc = estado.valores[campoDoc.id];
    if (!doc) return Promise.resolve(true);

    return DB.todos().then(function (todos) {
      const repetido = todos.filter(function (r) {
        return r.id !== estado.editandoId &&
               String((r.datos || {})[campoDoc.id] || '') === String(doc);
      })[0];
      if (!repetido) return true;
      return confirm('El documento ' + doc + ' ya fue registrado el ' +
        new Date(repetido.creado).toLocaleString('es-PE') +
        '.\n\nQuieres guardarlo de todas formas?');
    });
  }

  function guardar() {
    if (!validarTodo()) { avisar('Revisa los campos marcados en rojo.', 'error'); return; }

    const btn = $('#btn-guardar');
    btn.disabled = true;
    $('#txt-guardar').textContent = 'Guardando...';

    revisarDuplicado().then(function (seguir) {
      if (!seguir) throw { cancelado: true };
      return ubicacion();
    }).then(function (gps) {
      const a = ajustes();
      const base = {
        encuestador: a.encuestador,
        punto: a.punto,
        gps: gps,
        datos: JSON.parse(JSON.stringify(estado.valores))
      };

      if (estado.editandoId) {
        return DB.obtener(estado.editandoId).then(function (original) {
          return DB.actualizar(Object.assign({}, original, base));
        }).then(function () { return 'editado'; });
      }
      return DB.crear(base).then(function () { return 'creado'; });

    }).then(function (accion) {
      limpiarBorrador();
      avisar(accion === 'editado' ? 'Cambios guardados.' : 'Encuesta guardada correctamente.', 'ok');
      if (navigator.vibrate) navigator.vibrate(60);
      nuevoFormulario(false);
      actualizarContador();

    }).catch(function (e) {
      if (!e || !e.cancelado) {
        console.error(e);
        avisar('No se pudo guardar: ' + (e && e.message ? e.message : 'error desconocido'), 'error');
      }
    }).then(function () {
      btn.disabled = false;
      $('#txt-guardar').textContent = estado.editandoId ? 'Guardar cambios' : 'Guardar encuesta';
    });
  }

  /* ================= Vista: lista de registros ================= */

  function resumen(reg) {
    // Muestra los dos primeros campos de texto como titulo de la tarjeta
    const textos = camposReales().filter(function (c) {
      return ['texto', 'documento', 'telefono', 'correo'].indexOf(c.tipo) >= 0;
    }).slice(0, 2);
    const partes = textos.map(function (c) { return (reg.datos || {})[c.id]; })
                         .filter(Boolean);
    return partes.length ? partes.join(' ') : 'Registro ' + reg.id;
  }

  function renderLista() {
    const cont = $('#lista');
    cont.innerHTML = '';

    const q = estado.filtro.toLowerCase().trim();
    const lista = !q ? estado.registros : estado.registros.filter(function (r) {
      return JSON.stringify(r.datos || {}).toLowerCase().indexOf(q) >= 0 ||
             String(r.encuestador || '').toLowerCase().indexOf(q) >= 0;
    });

    $('#resumen-lista').textContent = estado.registros.length === 0
      ? 'Todavia no hay encuestas guardadas.'
      : (q ? lista.length + ' de ' + estado.registros.length + ' encuestas'
           : estado.registros.length + ' encuesta' + (estado.registros.length === 1 ? '' : 's') + ' guardadas');

    if (!lista.length) {
      cont.appendChild(el('p', 'vacio', q ? 'Ningun registro coincide con la busqueda.'
                                          : 'Las encuestas que guardes apareceran aqui.'));
      return;
    }

    lista.forEach(function (reg) {
      const t = el('div', 'tarjeta');

      const cab = el('div', 'tarjeta-cab');
      cab.appendChild(el('span', 'tarjeta-num', '#' + reg.id));
      cab.appendChild(el('span', 'tarjeta-titulo', resumen(reg)));
      t.appendChild(cab);

      t.appendChild(el('div', 'tarjeta-meta',
        new Date(reg.creado).toLocaleString('es-PE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }) + '  ·  ' + (reg.punto || '') + '  ·  ' + (reg.encuestador || '')));

      const acc = el('div', 'tarjeta-acciones');

      const bVer = el('button', 'boton secundario chico', 'Ver');
      bVer.addEventListener('click', function () { verDetalle(reg); });

      const bEd = el('button', 'boton secundario chico', 'Editar');
      bEd.addEventListener('click', function () { editar(reg); });

      const bDel = el('button', 'boton peligro chico', 'Eliminar');
      bDel.addEventListener('click', function () { eliminar(reg); });

      acc.appendChild(bVer); acc.appendChild(bEd); acc.appendChild(bDel);
      t.appendChild(acc);
      cont.appendChild(t);
    });
  }

  function verDetalle(reg) {
    const cuerpo = $('#detalle-cuerpo');
    cuerpo.innerHTML = '';

    const meta = el('div', 'detalle-meta');
    meta.appendChild(el('div', null, 'Registro #' + reg.id));
    meta.appendChild(el('div', null, new Date(reg.creado).toLocaleString('es-PE')));
    meta.appendChild(el('div', null, (reg.punto || '') + ' · ' + (reg.encuestador || '')));
    if (reg.gps) meta.appendChild(el('div', null, 'GPS: ' + reg.gps.lat + ', ' + reg.gps.lng));
    cuerpo.appendChild(meta);

    camposReales().forEach(function (c) {
      const v = (reg.datos || {})[c.id];
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

  function editar(reg) {
    estado.editandoId = reg.id;
    estado.valores = JSON.parse(JSON.stringify(reg.datos || {}));
    irA('formulario');
    renderFormulario();
    avisar('Editando el registro #' + reg.id, 'info');
  }

  function eliminar(reg) {
    if (!confirm('Eliminar el registro #' + reg.id + '?\n\nEsta accion no se puede deshacer.')) return;
    DB.eliminar(reg.id).then(function () {
      avisar('Registro eliminado.', 'ok');
      cargarLista();
      actualizarContador();
    }).catch(function (e) {
      avisar('No se pudo eliminar: ' + e.message, 'error');
    });
  }

  function cargarLista() {
    return DB.todos().then(function (rs) {
      estado.registros = rs;
      renderLista();
    });
  }

  /* ================= Vista: ajustes ================= */

  function renderAjustes() {
    const a = ajustes();
    $('#in-encuestador').value = a.encuestador || '';

    const sel = $('#in-punto');
    sel.innerHTML = '';
    sel.appendChild(new Option('-- Seleccione --', ''));
    CONFIG.puntos.forEach(function (p) { sel.appendChild(new Option(p, p)); });
    sel.value = a.punto || '';

    DB.espacio().then(function (e) {
      if (!e || !e.quota) { $('#espacio').textContent = ''; return; }
      const usado = (e.usage / 1048576).toFixed(1);
      const total = (e.quota / 1048576).toFixed(0);
      $('#espacio').textContent = 'Almacenamiento usado: ' + usado + ' MB de ' + total + ' MB disponibles.';
    });
  }

  /* ================= Exportacion ================= */

  function exportar(tipo) {
    DB.todos().then(function (rs) {
      let n;
      if (tipo === 'excel')          n = EXPORTAR.excel(rs);
      else if (tipo === 'csv')       n = EXPORTAR.csv(rs);
      else if (tipo === 'respaldo')  n = EXPORTAR.respaldo(rs);
      else                           n = EXPORTAR.imagenes(rs);

      avisar('Archivo generado con ' + n + (tipo === 'imagenes' ? ' imagenes.' : ' registros.') +
             ' Busca en Descargas.', 'ok');
    }).catch(function (e) {
      avisar(e.message || 'No se pudo exportar.', 'error');
    });
  }

  function importarRespaldo(archivo) {
    const lector = new FileReader();
    lector.onload = function () {
      let paquete;
      try { paquete = JSON.parse(lector.result); }
      catch (e) { avisar('El archivo no es un respaldo valido.', 'error'); return; }

      const lista = Array.isArray(paquete) ? paquete : paquete.registros;
      if (!Array.isArray(lista)) { avisar('El archivo no contiene registros.', 'error'); return; }

      DB.importar(lista).then(function (r) {
        avisar('Importados ' + r.insertados + ' registros. ' +
               (r.omitidos ? r.omitidos + ' ya existian y se omitieron.' : ''), 'ok');
        cargarLista();
        actualizarContador();
      }).catch(function (e) {
        avisar('Error al importar: ' + e.message, 'error');
      });
    };
    lector.readAsText(archivo);
  }

  function borrarTodo() {
    DB.contar().then(function (n) {
      if (!n) { avisar('No hay nada que borrar.', 'info'); return; }
      if (!confirm('Vas a borrar las ' + n + ' encuestas guardadas en esta tablet.\n\n' +
                   'Exportaste el Excel y el respaldo antes?')) return;
      const texto = prompt('Para confirmar, escribe:  BORRAR');
      if (texto !== 'BORRAR') { avisar('Cancelado. No se borro nada.', 'info'); return; }

      DB.vaciar().then(function () {
        avisar('Se borraron todos los registros.', 'ok');
        cargarLista();
        actualizarContador();
      });
    });
  }

  /* ================= Navegacion ================= */

  function irA(vista) {
    estado.vista = vista;
    ['formulario', 'lista', 'ajustes'].forEach(function (v) {
      $('#vista-' + v).hidden = (v !== vista);
      $('#tab-' + v).classList.toggle('activa', v === vista);
    });
    // Se vuelve a dibujar para reflejar cambios hechos en Ajustes
    // (ej: recien se cargo el encuestador y ya se puede encuestar)
    if (vista === 'formulario') renderFormulario();
    if (vista === 'lista')   cargarLista();
    if (vista === 'ajustes') renderAjustes();
    window.scrollTo({ top: 0 });
  }

  function actualizarContador() {
    DB.contar().then(function (n) {
      $('#contador').textContent = n;
      $('#contador').hidden = !n;
    });
  }

  /* ================= Arranque ================= */

  function iniciar() {
    document.title = CONFIG.nombreApp;
    $('#titulo-app').textContent = CONFIG.nombreApp;
    $('#version').textContent = 'v' + CONFIG.version;

    // Pide al navegador que no borre los datos si falta espacio
    DB.protegerDatos();

    $('#tab-formulario').addEventListener('click', function () { irA('formulario'); });
    $('#tab-lista').addEventListener('click',      function () { irA('lista'); });
    $('#tab-ajustes').addEventListener('click',    function () { irA('ajustes'); });

    $('#btn-guardar').addEventListener('click', guardar);

    $('#btn-cancelar-edicion').addEventListener('click', function () {
      nuevoFormulario(false);
      avisar('Edicion cancelada.', 'info');
    });

    $('#btn-limpiar').addEventListener('click', function () {
      if (!Object.keys(estado.valores).length) return;
      if (!confirm('Borrar lo escrito en este formulario?')) return;
      nuevoFormulario(false);
    });

    $('#buscar').addEventListener('input', function (e) {
      estado.filtro = e.target.value;
      renderLista();
    });

    $('#in-encuestador').addEventListener('input', function (e) {
      const a = ajustes(); a.encuestador = e.target.value.trim(); guardarAjustes(a);
    });
    $('#in-punto').addEventListener('change', function (e) {
      const a = ajustes(); a.punto = e.target.value; guardarAjustes(a);
    });

    $('#btn-excel').addEventListener('click',    function () { exportar('excel'); });
    $('#btn-csv').addEventListener('click',      function () { exportar('csv'); });
    $('#btn-respaldo').addEventListener('click', function () { exportar('respaldo'); });
    $('#btn-imagenes').addEventListener('click', function () { exportar('imagenes'); });
    $('#btn-borrar-todo').addEventListener('click', borrarTodo);

    $('#in-importar').addEventListener('change', function (e) {
      const f = e.target.files && e.target.files[0];
      if (f) importarRespaldo(f);
      e.target.value = '';
    });

    $('#cerrar-detalle').addEventListener('click', function () { $('#detalle').close(); });

    // Aviso al salir con datos a medio llenar
    window.addEventListener('beforeunload', function (e) {
      if (estado.vista === 'formulario' && Object.keys(estado.valores).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    nuevoFormulario(true);
    if (leerBorrador()) avisar('Se recupero un formulario a medio llenar.', 'info');

    actualizarContador();
    irA('formulario');
  }

  return { iniciar: iniciar, irA: irA };
})();

document.addEventListener('DOMContentLoaded', APP.iniciar);
