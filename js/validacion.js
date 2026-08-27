/* =====================================================================
   VALIDACION
   ---------------------------------------------------------------------
   Todas las reglas viven aqui. Ni el formulario ni las plantillas tienen
   logica de validacion adentro.

   Criterio de uso (definido para molestar lo menos posible):
     - Mientras el usuario escribe por primera vez: NO se valida.
     - Al salir del campo (blur): se valida y se muestra el error debajo.
     - Una vez que un campo mostro error, se revalida en cada tecla para
       que el mensaje desaparezca apenas se corrige.
     - Al guardar: se valida todo y se salta al primer campo con error.
   Nunca se usan alertas emergentes para errores de formulario.
   ===================================================================== */

const VALIDACION = {

  /* Reglas por tipo de documento. Agregar un tipo nuevo es agregar una
     entrada aqui y una opcion en la pregunta tipo_documento del banco. */
  DOCUMENTOS: {
    'DNI': {
      patron: /^\d{8}$/,
      soloDigitos: true,
      largo: 8,
      error: 'El DNI debe tener exactamente 8 digitos.'
    },
    'RUC': {
      patron: /^\d{11}$/,
      soloDigitos: true,
      largo: 11,
      error: 'El RUC debe tener exactamente 11 digitos.'
    },
    'Carne de extranjeria': {
      patron: /^\d{9,12}$/,
      soloDigitos: true,
      largo: 12,
      error: 'El carne de extranjeria debe tener de 9 a 12 digitos.'
    },
    'Pasaporte': {
      patron: /^[A-Za-z0-9]{6,12}$/,
      soloDigitos: false,
      largo: 12,
      error: 'El pasaporte debe tener de 6 a 12 letras o numeros.'
    }
  },

  reglaDocumento: function (tipo) {
    return this.DOCUMENTOS[tipo] || this.DOCUMENTOS['DNI'];
  },

  /* Limpia lo que el usuario escribe segun el tipo de campo.
     Evita el 90% de los errores antes de que ocurran: si el campo solo
     admite digitos, sencillamente no deja escribir letras. */
  normalizar: function (campo, texto, valores) {
    let t = String(texto);

    if (campo.tipo === 'documento') {
      const regla = this.reglaDocumento((valores || {})[campo.dependeDe || 'tipo_documento']);
      t = regla.soloDigitos ? t.replace(/\D/g, '') : t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return t.slice(0, regla.largo);
    }

    if (campo.tipo === 'telefono') {
      return t.replace(/\D/g, '').slice(0, 9);
    }

    if (campo.tipo === 'correo') {
      return t.replace(/\s/g, '').toLowerCase();
    }

    return t;
  },

  /* Devuelve '' si esta bien, o el mensaje de error. */
  revisar: function (campo, valor, valores) {
    const vacio = valor === undefined || valor === null || valor === '' ||
                  (Array.isArray(valor) && valor.length === 0);

    if (vacio) {
      return campo.requerido ? 'Este dato es obligatorio.' : '';
    }

    const s = String(valor).trim();

    switch (campo.tipo) {

      case 'documento': {
        const tipo = (valores || {})[campo.dependeDe || 'tipo_documento'] || 'DNI';
        const regla = this.reglaDocumento(tipo);
        if (!regla.patron.test(s)) return regla.error;
        return '';
      }

      case 'telefono':
        return /^9\d{8}$/.test(s) ? '' : 'El celular debe tener 9 digitos y empezar con 9.';

      case 'correo':
        return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(s) ? '' : 'Escribe un correo valido, por ejemplo nombre@correo.com';

      case 'numero': {
        const n = Number(s);
        if (!isFinite(n)) return 'Debe ser un numero.';
        if (campo.min !== undefined && n < campo.min) return 'El minimo es ' + campo.min + '.';
        if (campo.max !== undefined && n > campo.max) return 'El maximo es ' + campo.max + '.';
        return '';
      }

      case 'fecha': {
        const d = new Date(s);
        if (isNaN(d)) return 'Fecha no valida.';
        if (d > new Date()) return 'La fecha no puede ser futura.';
        return '';
      }

      case 'nps': {
        const n = Number(s);
        return (isFinite(n) && n >= 0 && n <= 10) ? '' : 'Elige un valor del 0 al 10.';
      }

      case 'escala': {
        const n = Number(s);
        const min = campo.min || 1, max = campo.max || 5;
        return (isFinite(n) && n >= min && n <= max) ? '' : 'Elige un valor entre ' + min + ' y ' + max + '.';
      }

      default:
        return '';
    }
  },

  /* Una pregunta condicionada solo cuenta si su condicion se cumple. */
  visible: function (campo, valores) {
    if (!campo.condicion) return true;
    const v = (valores || {})[campo.condicion.campo];
    if (Array.isArray(v)) return v.indexOf(campo.condicion.igual) >= 0;
    return v === campo.condicion.igual;
  },

  /* Revisa el formulario completo.
     Devuelve { ok, errores: {idCampo: mensaje}, primero: idCampo } */
  revisarTodo: function (campos, valores) {
    const errores = {};
    let primero = null;

    campos.forEach(function (campo) {
      if (!VALIDACION.visible(campo, valores)) return;
      const msg = VALIDACION.revisar(campo, valores[campo.id], valores);
      if (msg) {
        errores[campo.id] = msg;
        if (!primero) primero = campo.id;
      }
    });

    return { ok: !primero, errores: errores, primero: primero };
  }
};
