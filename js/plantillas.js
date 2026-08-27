/* =====================================================================
   PLANTILLAS
   ---------------------------------------------------------------------
   Una plantilla dice QUE preguntas aparecen, en que orden, agrupadas en
   secciones, y cuales son obligatorias.

   NO define preguntas: las referencia por su id del banco (banco-preguntas.js).

   Formato de cada pregunta dentro de una seccion:

       { id: 'correo', requerido: true }

   Opcionalmente se puede ajustar algo puntual solo para esa plantilla,
   sin tocar el banco:

       { id: 'categorias', requerido: false,
         opciones: ['Botas', 'Cascos'],          // reemplaza las del banco
         etiqueta: 'Que linea le interesa?' }    // reemplaza el texto

   COMO AGREGAR UNA PLANTILLA NUEVA: copia un bloque completo, cambiale
   el id y las preguntas. Despues habilitala en la marca que la use
   (marcas.js) o dejala disponible para todas.
   ===================================================================== */

const PLANTILLAS = [

  /* ------------------------------------------------------------------ */
  {
    id: 'captacion',
    nombre: 'General / Captacion de clientes',
    descripcion: 'Registro completo de datos del cliente. Es la plantilla base para construir la base de datos comercial.',
    icono: '👤',
    secciones: [
      {
        titulo: 'Datos personales',
        preguntas: [
          { id: 'nombres',          requerido: true  },
          { id: 'apellidos',        requerido: true  },
          { id: 'tipo_documento',   requerido: true  },
          { id: 'numero_documento', requerido: true  },
          { id: 'razon_social',     requerido: true  },   // solo aparece si eligio RUC
          { id: 'correo',           requerido: true  },
          { id: 'celular',          requerido: false },
          { id: 'fecha_nacimiento', requerido: false },
          { id: 'sexo',             requerido: false },
          { id: 'distrito',         requerido: false }
        ]
      },
      {
        titulo: 'Sobre su visita',
        preguntas: [
          { id: 'como_nos_conocio', requerido: false },
          { id: 'compro_hoy',       requerido: false },
          { id: 'monto_compra',     requerido: false },
          { id: 'categorias',       requerido: false },
          { id: 'satisfaccion',     requerido: true  },
          { id: 'comentario',       requerido: false }
        ]
      },
      {
        titulo: 'Autorizacion',
        preguntas: [
          { id: 'acepta_datos', requerido: true  },
          { id: 'firma',        requerido: false }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'gustos',
    nombre: 'Gustos e intereses',
    descripcion: 'Perfil de preferencias del cliente: actividades, tallas, marcas que usa y como quiere que lo contacten.',
    icono: '🎯',
    secciones: [
      {
        titulo: 'Identificacion',
        preguntas: [
          { id: 'nombres',          requerido: true  },
          { id: 'apellidos',        requerido: true  },
          { id: 'tipo_documento',   requerido: true  },
          { id: 'numero_documento', requerido: true  },
          { id: 'razon_social',     requerido: true  },
          { id: 'correo',           requerido: true  },
          { id: 'celular',          requerido: false }
        ]
      },
      {
        titulo: 'Intereses',
        preguntas: [
          { id: 'intereses',   requerido: false },
          { id: 'categorias',  requerido: false },
          { id: 'marcas_usa',  requerido: false },
          { id: 'talla_calzado', requerido: false },
          { id: 'talla_ropa',    requerido: false },
          { id: 'motivo_compra', requerido: false }
        ]
      },
      {
        titulo: 'Contacto',
        preguntas: [
          { id: 'recibir_novedades', requerido: false },
          { id: 'canal_contacto',    requerido: false },
          { id: 'acepta_datos',      requerido: true  }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'frecuencia',
    nombre: 'Frecuencia de compra',
    descripcion: 'Mide cada cuanto compra el cliente, cuanto gasta y por que canal. Util para segmentar la base.',
    icono: '📊',
    secciones: [
      {
        titulo: 'Identificacion',
        preguntas: [
          { id: 'nombres',          requerido: true  },
          { id: 'apellidos',        requerido: true  },
          { id: 'tipo_documento',   requerido: true  },
          { id: 'numero_documento', requerido: true  },
          { id: 'razon_social',     requerido: true  },
          { id: 'correo',           requerido: true  }
        ]
      },
      {
        titulo: 'Habitos de compra',
        preguntas: [
          { id: 'frecuencia_compra', requerido: true  },
          { id: 'ultima_compra',     requerido: false },
          { id: 'ticket_promedio',   requerido: false },
          { id: 'canal_preferido',   requerido: false },
          { id: 'motivo_compra',     requerido: false },
          { id: 'comentario',        requerido: false }
        ]
      },
      {
        titulo: 'Autorizacion',
        preguntas: [
          { id: 'acepta_datos', requerido: true }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'experiencia',
    nombre: 'Experiencia / Atencion',
    descripcion: 'Evalua la atencion recibida en tienda. Incluye satisfaccion y recomendacion (NPS).',
    icono: '⭐',
    secciones: [
      {
        titulo: 'Identificacion',
        preguntas: [
          { id: 'nombres',          requerido: true  },
          { id: 'apellidos',        requerido: false },
          { id: 'tipo_documento',   requerido: false },
          { id: 'numero_documento', requerido: false },
          { id: 'razon_social',     requerido: false },
          { id: 'correo',           requerido: true  },
          { id: 'celular',          requerido: false }
        ]
      },
      {
        titulo: 'Su experiencia',
        preguntas: [
          { id: 'satisfaccion',      requerido: true  },
          { id: 'atencion_vendedor', requerido: false },
          { id: 'recomendaria',      requerido: true  },
          { id: 'encontro_producto', requerido: false },
          { id: 'que_buscaba',       requerido: false },
          { id: 'comentario',        requerido: false }
        ]
      },
      {
        titulo: 'Autorizacion',
        preguntas: [
          { id: 'acepta_datos', requerido: true }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'activacion_marca',
    nombre: 'Activacion de marca',
    descripcion: 'Para ferias, eventos y activaciones en punto de venta. Registro rapido con foto de evidencia.',
    icono: '🎪',
    secciones: [
      {
        titulo: 'Identificacion',
        preguntas: [
          { id: 'nombres',          requerido: true  },
          { id: 'apellidos',        requerido: true  },
          { id: 'tipo_documento',   requerido: true  },
          { id: 'numero_documento', requerido: true  },
          { id: 'razon_social',     requerido: true  },
          { id: 'correo',           requerido: true  },
          { id: 'celular',          requerido: false }
        ]
      },
      {
        titulo: 'Sobre la activacion',
        preguntas: [
          { id: 'conoce_marca',      requerido: false },
          { id: 'producto_interes',  requerido: false },
          { id: 'participo_dinamica', requerido: false },
          { id: 'recibio_muestra',   requerido: false },
          { id: 'foto_evidencia',    requerido: false },
          { id: 'comentario',        requerido: false }
        ]
      },
      {
        titulo: 'Autorizacion',
        preguntas: [
          { id: 'acepta_datos', requerido: true  },
          { id: 'firma',        requerido: false }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'personalizada',
    nombre: 'Encuesta personalizada',
    descripcion: 'Empieza con lo minimo indispensable y tu agregas las preguntas que necesites al configurar la activacion.',
    icono: '🛠️',
    secciones: [
      {
        titulo: 'Identificacion',
        preguntas: [
          { id: 'nombres',          requerido: true  },
          { id: 'apellidos',        requerido: true  },
          { id: 'tipo_documento',   requerido: true  },
          { id: 'numero_documento', requerido: true  },
          { id: 'razon_social',     requerido: true  },
          { id: 'correo',           requerido: true  }
        ]
      },
      {
        titulo: 'Autorizacion',
        preguntas: [
          { id: 'acepta_datos', requerido: true }
        ]
      }
    ]
  }
];

/* =====================================================================
   RESOLUCION DE PREGUNTAS
   Junta banco + plantilla + marca en una lista plana lista para dibujar.
   Este es el unico lugar donde se combinan las tres fuentes.
   ===================================================================== */

const PLANTILLA = {

  porId: function (id) {
    return PLANTILLAS.filter(function (p) { return p.id === id; })[0] || null;
  },

  /* Devuelve [{ id, etiqueta, tipo, requerido, seccion, ... }] */
  resolver: function (plantillaId, marca) {
    const plantilla = this.porId(plantillaId);
    if (!plantilla) return [];

    const ajustesMarca = (marca && marca.ajustesPreguntas) || {};
    const salida = [];

    plantilla.secciones.forEach(function (seccion) {
      seccion.preguntas.forEach(function (ref) {
        const base = BANCO_PREGUNTAS[ref.id];
        if (!base) {
          console.warn('Pregunta no encontrada en el banco:', ref.id);
          return;
        }
        // banco -> plantilla -> marca
        const campo = Object.assign({}, base, ref, ajustesMarca[ref.id] || {});
        campo.id = ref.id;
        campo.seccion = seccion.titulo;
        campo.requerido = !!campo.requerido;
        salida.push(campo);
      });
    });

    return salida;
  },

  /* Preguntas del banco que la plantilla NO usa todavia, para poder
     agregarlas al configurar una activacion. */
  disponibles: function (camposActuales) {
    const usados = {};
    camposActuales.forEach(function (c) { usados[c.id] = true; });

    return Object.keys(BANCO_PREGUNTAS)
      .filter(function (id) { return !usados[id]; })
      .map(function (id) {
        return Object.assign({ id: id }, BANCO_PREGUNTAS[id]);
      });
  }
};
