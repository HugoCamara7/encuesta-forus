/* =====================================================================
   FORMULARIO
   ---------------------------------------------------------------------
   Dibuja una lista de campos ya resueltos y devuelve un objeto para
   manejarlo. Lo usan tanto la encuesta real como la vista previa.

       const form = FORMULARIO.crear(contenedor, campos, valores);
       form.validar();        // true / false, marca los errores
       form.valores;          // respuestas actuales

   No sabe nada de marcas, plantillas ni base de datos.
   ===================================================================== */

const FORMULARIO = (function () {

  function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  /* ---------- Compresion de fotos ----------
     Una foto de tablet pesa 3-5 MB. Se reduce a 1200 px y calidad 70%,
     dejando cada foto en unos 150 KB. */
  function comprimirImagen(archivo) {
    return new Promise(function (ok, err) {
      const lector = new FileReader();
      lector.onerror = function () { err(new Error('lectura')); };
      lector.onload = function () {
        const img = new Image();
        img.onerror = function () { err(new Error('imagen')); };
        img.onload = function () {
          const MAX = 1200;
          let w = img.width, h = img.height;
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

  /* ===================================================================
     API principal
     =================================================================== */
  function crear(contenedor, campos, valoresIniciales) {

    const valores = Object.assign({}, valoresIniciales || {});
    const filas = {};        // id -> elemento .campo
    const conError = {};     // id -> true cuando ya mostro un error

    /* ---------- Errores ---------- */

    function pintarError(id, mensaje) {
      const fila = filas[id];
      if (!fila) return;
      const caja = fila.querySelector('.error');
      caja.textContent = mensaje || '';
      fila.classList.toggle('con-error', !!mensaje);
      if (mensaje) conError[id] = true;
    }

    function validarCampo(campo, forzar) {
      // No molestar en el primer tipeo: solo si ya fallo antes, o si se fuerza
      if (!forzar && !conError[campo.id]) return;
      if (!VALIDACION.visible(campo, valores)) { pintarError(campo.id, ''); return; }
      pintarError(campo.id, VALIDACION.revisar(campo, valores[campo.id], valores));
    }

    /* ---------- Condicionales y ayudas dinamicas ---------- */

    function refrescar() {
      campos.forEach(function (campo) {
        const fila = filas[campo.id];
        if (!fila) return;

        if (campo.condicion) {
          const mostrar = VALIDACION.visible(campo, valores);
          fila.hidden = !mostrar;
          if (!mostrar && valores[campo.id] !== undefined) {
            delete valores[campo.id];
            limpiarControles(fila);
            pintarError(campo.id, '');
          }
        }

        // Ayuda que cambia segun otra respuesta (ej: DNI vs RUC)
        if (campo.ayudaPorValor) {
          const caja = fila.querySelector('.ayuda');
          if (caja) {
            const v = valores[campo.ayudaPorValor.campo];
            caja.textContent = campo.ayudaPorValor.textos[v] || '';
          }
        }
      });

      // Las secciones que quedaron sin ningun campo visible se ocultan
      contenedor.querySelectorAll('.bloque-seccion').forEach(function (bloque) {
        const visibles = Array.prototype.filter.call(
          bloque.querySelectorAll('.campo'), function (c) { return !c.hidden; });
        bloque.hidden = visibles.length === 0;
      });
    }

    function limpiarControles(fila) {
      fila.querySelectorAll('input, textarea, select').forEach(function (i) {
        if (i.type === 'checkbox' || i.type === 'radio') i.checked = false;
        else if (i.type !== 'file') i.value = '';
      });
      fila.querySelectorAll('.opcion.activa').forEach(function (b) {
        b.classList.remove('activa');
      });
    }

    function cambiar(campo, valor) {
      if (valor === '' || valor === null || valor === undefined ||
          (Array.isArray(valor) && !valor.length)) {
        delete valores[campo.id];
      } else {
        valores[campo.id] = valor;
      }
      refrescar();
      validarCampo(campo, false);

      // Cambiar el tipo de documento revalida el numero ya escrito
      if (campo.id === 'tipo_documento') {
        const doc = campos.filter(function (c) { return c.tipo === 'documento'; })[0];
        if (doc && valores[doc.id]) {
          valores[doc.id] = VALIDACION.normalizar(doc, valores[doc.id], valores);
          const input = filas[doc.id] && filas[doc.id].querySelector('input');
          if (input) input.value = valores[doc.id];
          validarCampo(doc, !!conError[doc.id]);
        }
      }

      if (contenedor.__alCambiar) contenedor.__alCambiar(valores);
    }

    /* ---------- Construccion de un campo ---------- */

    function construir(campo) {
      const fila = el('div', 'campo');
      fila.id = 'fila-' + campo.id;
      filas[campo.id] = fila;

      const etq = el('label', 'etiqueta');
      etq.textContent = campo.etiqueta;
      etq.setAttribute('for', 'c-' + campo.id);
      if (campo.requerido) etq.appendChild(el('span', 'req', ' *'));
      else etq.appendChild(el('span', 'opcional', ' (opcional)'));
      fila.appendChild(etq);

      const valor = valores[campo.id];

      switch (campo.tipo) {

        case 'parrafo': {
          const t = el('textarea', 'entrada');
          t.id = 'c-' + campo.id;
          t.rows = 3;
          t.value = valor || '';
          t.addEventListener('input', function () { cambiar(campo, t.value); });
          t.addEventListener('blur',  function () {
            valores[campo.id] = t.value.trim();
            validarCampo(campo, true);
          });
          fila.appendChild(t);
          break;
        }

        case 'lista': {
          const s = el('select', 'entrada');
          s.id = 'c-' + campo.id;
          s.appendChild(new Option('-- Seleccione --', ''));
          (campo.opciones || []).forEach(function (o) { s.appendChild(new Option(o, o)); });
          s.value = valor || '';
          s.addEventListener('change', function () { cambiar(campo, s.value); validarCampo(campo, true); });
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
                cambiar(campo, '');
              } else {
                b.classList.add('activa');
                cambiar(campo, o);
              }
              validarCampo(campo, true);
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
              cambiar(campo, sel.slice());
              validarCampo(campo, true);
            });
            caja.appendChild(b);
          });
          fila.appendChild(caja);
          break;
        }

        case 'escala':
        case 'nps': {
          const esNps = campo.tipo === 'nps';
          const min = esNps ? 0  : (campo.min || 1);
          const max = esNps ? 10 : (campo.max || 5);
          const caja = el('div', 'opciones ' + (esNps ? 'nps' : 'escala'));
          for (let n = min; n <= max; n++) {
            const b = el('button', 'opcion', String(n));
            b.type = 'button';
            if (String(valor) === String(n)) b.classList.add('activa');
            (function (num) {
              b.addEventListener('click', function () {
                caja.querySelectorAll('.opcion').forEach(function (x) { x.classList.remove('activa'); });
                b.classList.add('activa');
                cambiar(campo, num);
                validarCampo(campo, true);
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
            cambiar(campo, '');
          });

          input.addEventListener('change', function () {
            const f = input.files && input.files[0];
            if (!f) return;
            btn.disabled = true; btn.textContent = 'Procesando...';
            comprimirImagen(f).then(function (dataUrl) {
              vista.src = dataUrl; vista.hidden = false;
              quitar.hidden = false;
              btn.disabled = false; btn.textContent = 'Cambiar foto';
              cambiar(campo, dataUrl);
            }).catch(function () {
              btn.disabled = false; btn.textContent = 'Tomar foto';
              pintarError(campo.id, 'No se pudo procesar la foto. Intenta de nuevo.');
            });
          });

          const acciones = el('div', 'fila-botones');
          acciones.appendChild(btn);
          acciones.appendChild(quitar);
          caja.appendChild(vista);
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
            i.type = 'tel'; i.inputMode = 'numeric';
          } else if (campo.tipo === 'correo') {
            i.type = 'email'; i.inputMode = 'email';
            i.autocapitalize = 'off'; i.spellcheck = false;
          } else if (campo.tipo === 'documento') {
            i.type = 'text'; i.inputMode = 'numeric';
          } else if (campo.tipo === 'fecha') {
            i.type = 'date';
            i.max = new Date().toISOString().slice(0, 10);
          } else {
            i.type = 'text';
            i.autocapitalize = campo.autocapitalizar || 'sentences';
          }

          if (campo.marcador) i.placeholder = campo.marcador;

          i.addEventListener('input', function () {
            const limpio = VALIDACION.normalizar(campo, i.value, valores);
            if (limpio !== i.value) {
              const pos = i.selectionStart - (i.value.length - limpio.length);
              i.value = limpio;
              if (i.type === 'text' || i.type === 'tel') {
                try { i.setSelectionRange(pos, pos); } catch (e) {}
              }
            }
            cambiar(campo, limpio);
          });

          i.addEventListener('blur', function () {
            const limpio = VALIDACION.normalizar(campo, i.value.trim(), valores);
            i.value = limpio;
            cambiar(campo, limpio);
            validarCampo(campo, true);
          });

          fila.appendChild(i);
          break;
        }
      }

      if (campo.ayuda || campo.ayudaPorValor) {
        const ayuda = el('div', 'ayuda', campo.ayuda || '');
        fila.appendChild(ayuda);
      }
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
        cambiar(campo, vacia ? '' : lienzo.toDataURL('image/png'));
      }
      lienzo.addEventListener('pointerup', terminar);
      lienzo.addEventListener('pointercancel', terminar);
      lienzo.addEventListener('pointerleave', terminar);

      const borrar = el('button', 'boton secundario chico', 'Borrar firma');
      borrar.type = 'button';
      borrar.addEventListener('click', function () {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
        vacia = true;
        cambiar(campo, '');
      });

      caja.appendChild(lienzo);
      caja.appendChild(borrar);
      return caja;
    }

    /* ---------- Dibujado inicial, agrupado por seccion ---------- */

    contenedor.innerHTML = '';
    let seccionActual = null;
    let bloque = null;

    campos.forEach(function (campo) {
      if (campo.seccion !== seccionActual) {
        seccionActual = campo.seccion;
        bloque = el('div', 'bloque-seccion');
        if (seccionActual) bloque.appendChild(el('h2', 'seccion', seccionActual));
        contenedor.appendChild(bloque);
      }
      bloque.appendChild(construir(campo));
    });

    refrescar();

    /* ---------- API devuelta ---------- */

    return {
      valores: valores,

      validar: function () {
        const r = VALIDACION.revisarTodo(campos, valores);
        campos.forEach(function (c) { pintarError(c.id, r.errores[c.id] || ''); });
        if (r.primero && filas[r.primero]) {
          filas[r.primero].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return r.ok;
      },

      refrescar: refrescar,

      alCambiar: function (fn) { contenedor.__alCambiar = fn; }
    };
  }

  return { crear: crear };
})();
