/* =====================================================================
   BANCO DE PREGUNTAS
   ---------------------------------------------------------------------
   Definicion CANONICA de cada pregunta: como se llama, de que tipo es y
   que opciones tiene. Una pregunta se define UNA sola vez aqui y luego
   se reutiliza en cualquier plantilla.

   Las plantillas NO redefinen preguntas: solo las referencian por su id
   y deciden si son obligatorias u opcionales. Una marca puede ajustar
   las opciones de una pregunta sin tocar nada de esto.

   Orden de resolucion (gana el ultimo):
       banco de preguntas  ->  plantilla  ->  marca

   COMO AGREGAR UNA PREGUNTA NUEVA: agrega una entrada aqui y referenciala
   desde la plantilla que la necesite. Nada mas.
   ---------------------------------------------------------------------
   TIPOS: texto, parrafo, numero, telefono, correo, documento, fecha,
          lista, radio, multiple, escala, nps, sino, foto, firma
   ===================================================================== */

const BANCO_PREGUNTAS = {

  /* ---------------- Identificacion del cliente ---------------- */

  nombres: {
    etiqueta: 'Nombres',
    tipo: 'texto',
    autocapitalizar: 'words'
  },

  apellidos: {
    etiqueta: 'Apellidos',
    tipo: 'texto',
    autocapitalizar: 'words'
  },

  tipo_documento: {
    etiqueta: 'Tipo de documento',
    tipo: 'radio',
    opciones: ['DNI', 'RUC', 'Carne de extranjeria', 'Pasaporte'],
    valor: 'DNI'
  },

  numero_documento: {
    etiqueta: 'Numero de documento',
    tipo: 'documento',
    // La ayuda cambia sola segun el tipo de documento elegido
    ayudaPorValor: {
      campo: 'tipo_documento',
      textos: {
        'DNI': 'Exactamente 8 digitos, solo numeros.',
        'RUC': 'Exactamente 11 digitos, solo numeros.',
        'Carne de extranjeria': 'De 9 a 12 digitos.',
        'Pasaporte': 'De 6 a 12 letras o numeros.'
      }
    }
  },

  razon_social: {
    etiqueta: 'Nombre / Razon Social de la empresa',
    tipo: 'texto',
    autocapitalizar: 'characters',
    condicion: { campo: 'tipo_documento', igual: 'RUC' }
  },

  correo: {
    etiqueta: 'Correo electronico',
    tipo: 'correo',
    marcador: 'nombre@correo.com'
  },

  celular: {
    etiqueta: 'Celular',
    tipo: 'telefono',
    marcador: '9########',
    ayuda: '9 digitos, empezando en 9.'
  },

  fecha_nacimiento: {
    etiqueta: 'Fecha de nacimiento',
    tipo: 'fecha'
  },

  sexo: {
    etiqueta: 'Sexo',
    tipo: 'radio',
    opciones: ['Femenino', 'Masculino', 'Prefiere no decir']
  },

  distrito: {
    etiqueta: 'Distrito donde vive',
    tipo: 'texto',
    autocapitalizar: 'words'
  },

  empresa: {
    etiqueta: 'Empresa donde trabaja',
    tipo: 'texto',
    autocapitalizar: 'words'
  },

  cargo: {
    etiqueta: 'Cargo',
    tipo: 'texto',
    autocapitalizar: 'words'
  },

  rubro: {
    etiqueta: 'Rubro de la empresa',
    tipo: 'lista',
    opciones: ['Construccion', 'Mineria', 'Industria / Manufactura', 'Energia',
               'Pesca', 'Agroindustria', 'Transporte / Logistica', 'Salud',
               'Retail / Comercio', 'Otro']
  },

  /* ---------------- Origen y comportamiento comercial ---------------- */

  como_nos_conocio: {
    etiqueta: 'Como nos conocio?',
    tipo: 'lista',
    opciones: ['Redes sociales', 'Recomendacion de un amigo', 'Paso por la tienda',
               'Publicidad', 'Feria o evento', 'Ya era cliente', 'Otro']
  },

  compro_hoy: {
    etiqueta: 'Compro algo el dia de hoy?',
    tipo: 'sino'
  },

  monto_compra: {
    etiqueta: 'Monto aproximado de la compra (S/)',
    tipo: 'numero',
    min: 0,
    condicion: { campo: 'compro_hoy', igual: 'Si' }
  },

  categorias: {
    etiqueta: 'Que categorias le interesan?',
    tipo: 'multiple',
    opciones: ['Calzado', 'Ropa deportiva', 'Ropa casual', 'Accesorios', 'Outdoor']
  },

  frecuencia_compra: {
    etiqueta: 'Cada cuanto suele comprar en esta categoria?',
    tipo: 'radio',
    opciones: ['Semanal', 'Mensual', 'Cada 3 meses', 'Cada 6 meses', 'Una vez al ano', 'Es la primera vez']
  },

  ultima_compra: {
    etiqueta: 'Cuando fue su ultima compra con nosotros?',
    tipo: 'lista',
    opciones: ['Este mes', 'Hace 2 a 3 meses', 'Hace 4 a 6 meses',
               'Hace mas de 6 meses', 'Nunca he comprado']
  },

  ticket_promedio: {
    etiqueta: 'Cuanto suele gastar por compra?',
    tipo: 'lista',
    opciones: ['Menos de S/ 100', 'S/ 100 a S/ 300', 'S/ 300 a S/ 600',
               'S/ 600 a S/ 1000', 'Mas de S/ 1000']
  },

  canal_preferido: {
    etiqueta: 'Donde prefiere comprar?',
    tipo: 'radio',
    opciones: ['Tienda fisica', 'Pagina web', 'WhatsApp', 'Marketplace', 'Le da igual']
  },

  motivo_compra: {
    etiqueta: 'Que es lo mas importante al decidir su compra?',
    tipo: 'multiple',
    opciones: ['Precio', 'Calidad', 'Marca', 'Durabilidad', 'Diseno',
               'Comodidad', 'Certificacion / Seguridad', 'Disponibilidad']
  },

  /* ---------------- Gustos e intereses ---------------- */

  intereses: {
    etiqueta: 'Que actividades practica o le interesan?',
    tipo: 'multiple',
    opciones: ['Trekking / Montana', 'Running', 'Gimnasio', 'Ciclismo', 'Viajes',
               'Playa / Surf', 'Trabajo de campo', 'Uso diario urbano']
  },

  marcas_usa: {
    etiqueta: 'Que otras marcas suele usar?',
    tipo: 'texto'
  },

  talla_calzado: {
    etiqueta: 'Talla de calzado',
    tipo: 'numero',
    min: 30,
    max: 50
  },

  talla_ropa: {
    etiqueta: 'Talla de ropa',
    tipo: 'radio',
    opciones: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  },

  recibir_novedades: {
    etiqueta: 'Desea recibir novedades y promociones?',
    tipo: 'sino'
  },

  canal_contacto: {
    etiqueta: 'Por donde prefiere que lo contactemos?',
    tipo: 'radio',
    opciones: ['WhatsApp', 'Correo', 'Llamada', 'No desea contacto'],
    condicion: { campo: 'recibir_novedades', igual: 'Si' }
  },

  /* ---------------- Experiencia y atencion ---------------- */

  satisfaccion: {
    etiqueta: 'Que tan satisfecho quedo con la atencion?',
    tipo: 'escala',
    min: 1,
    max: 5,
    ayuda: '1 = Muy insatisfecho, 5 = Muy satisfecho.'
  },

  recomendaria: {
    etiqueta: 'Del 0 al 10, que tan probable es que nos recomiende?',
    tipo: 'nps',
    ayuda: '0 = Nada probable, 10 = Muy probable.'
  },

  atencion_vendedor: {
    etiqueta: 'Como califica la atencion del vendedor?',
    tipo: 'escala',
    min: 1,
    max: 5
  },

  encontro_producto: {
    etiqueta: 'Encontro lo que buscaba?',
    tipo: 'sino'
  },

  que_buscaba: {
    etiqueta: 'Que producto buscaba?',
    tipo: 'texto',
    condicion: { campo: 'encontro_producto', igual: 'No' }
  },

  comentario: {
    etiqueta: 'Algun comentario o sugerencia?',
    tipo: 'parrafo'
  },

  /* ---------------- Activacion de marca ---------------- */

  conoce_marca: {
    etiqueta: 'Conocia la marca antes de hoy?',
    tipo: 'sino'
  },

  producto_interes: {
    etiqueta: 'Que producto le intereso mas?',
    tipo: 'texto'
  },

  participo_dinamica: {
    etiqueta: 'Participo en la dinamica de la activacion?',
    tipo: 'sino'
  },

  recibio_muestra: {
    etiqueta: 'Recibio muestra o material promocional?',
    tipo: 'sino'
  },

  foto_evidencia: {
    etiqueta: 'Foto de evidencia',
    tipo: 'foto'
  },

  /* ---------------- Legal ---------------- */

  acepta_datos: {
    etiqueta: 'Autoriza el tratamiento de sus datos personales para fines comerciales, conforme a la Ley 29733 de Proteccion de Datos Personales?',
    tipo: 'sino'
  },

  firma: {
    etiqueta: 'Firma del cliente',
    tipo: 'firma',
    condicion: { campo: 'acepta_datos', igual: 'Si' }
  }
};
