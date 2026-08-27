/* =====================================================================
   CONFIGURACION DE LA ENCUESTA
   ---------------------------------------------------------------------
   ESTE ES EL UNICO ARCHIVO QUE NECESITAS EDITAR para cambiar las
   preguntas. No toques los demas archivos .js
   ---------------------------------------------------------------------
   IMPORTANTE: cada vez que edites este archivo, sube el numero de
   "version" (ej: de '1.0.0' a '1.0.1'). Asi las tablets detectan el
   cambio y se actualizan solas la proxima vez que tengan wifi.
   ===================================================================== */

const CONFIG = {

  // Nombre que se ve arriba en la app y en el icono
  nombreApp: 'Encuesta de Clientes',

  // Sube este numero cada vez que cambies las preguntas
  version: '1.1.0',

  // Lugares donde se toma la encuesta. Se elige una sola vez por tablet,
  // en la pantalla de Ajustes. Agrega o quita los que necesites.
  puntos: [
    'Tienda Jockey Plaza',
    'Tienda Plaza Norte',
    'Tienda Mall del Sur',
    'Tienda Real Plaza Salaverry',
    'Activacion / Evento',
    'Otro'
  ],

  // Pedir ubicacion GPS al guardar cada encuesta.
  // Ponlo en false si no lo necesitas (evita el permiso de ubicacion).
  pedirGPS: false,

  /* -------------------------------------------------------------------
     PREGUNTAS
     -------------------------------------------------------------------
     Cada pregunta es un objeto { }. Propiedades disponibles:

       id        Nombre interno. SIN espacios ni tildes. Es el titulo de
                 la columna en el Excel. NO lo cambies despues de haber
                 recogido datos, o perderas la relacion con lo guardado.
       etiqueta  El texto que ve el encuestador.
       tipo      Ver la lista de tipos mas abajo.
       requerido true = no deja guardar si esta vacio.
       ayuda     Texto gris pequeno debajo del campo (opcional).
       opciones  Lista de alternativas. Solo para lista/radio/multiple.
       valor     Valor que aparece marcado por defecto (opcional).
       min, max  Limites. Solo para numero y escala.
       condicion Muestra la pregunta solo si otra tiene cierto valor.
                 Ej: condicion: { campo: 'compro', igual: 'Si' }

     TIPOS DISPONIBLES:
       'texto'      Una linea de texto
       'parrafo'    Texto largo, varias lineas
       'numero'     Solo numeros
       'telefono'   Celular peruano (9 digitos, empieza en 9)
       'correo'     Valida que sea un correo bien escrito
       'documento'  DNI (8 digitos) / CE / Pasaporte
       'fecha'      Selector de fecha
       'lista'      Menu desplegable (para muchas opciones)
       'radio'      Botones grandes, una sola respuesta
       'multiple'   Casillas, varias respuestas a la vez
       'escala'     Botones del 1 al 5 (satisfaccion)
       'sino'       Dos botones grandes: Si / No
       'foto'       Toma foto con la camara de la tablet
       'firma'      Firma con el dedo en la pantalla
       'titulo'     No es pregunta: separa secciones del formulario
     ------------------------------------------------------------------- */

  campos: [

    { tipo: 'titulo', etiqueta: 'Datos personales' },

    { id: 'nombres',
      etiqueta: 'Nombres',
      tipo: 'texto',
      requerido: true },

    { id: 'apellidos',
      etiqueta: 'Apellidos',
      tipo: 'texto',
      requerido: true },

    { id: 'tipo_documento',
      etiqueta: 'Tipo de documento',
      tipo: 'radio',
      opciones: ['DNI', 'Carne de extranjeria', 'Pasaporte'],
      valor: 'DNI',
      requerido: true },

    { id: 'numero_documento',
      etiqueta: 'Numero de documento',
      tipo: 'documento',
      requerido: true,
      ayuda: 'DNI: 8 digitos. Carne de extranjeria: 9 a 12 digitos.' },

    { id: 'celular',
      etiqueta: 'Celular',
      tipo: 'telefono',
      requerido: true,
      ayuda: '9 digitos, empezando en 9' },

    { id: 'correo',
      etiqueta: 'Correo electronico',
      tipo: 'correo',
      requerido: false },

    { id: 'fecha_nacimiento',
      etiqueta: 'Fecha de nacimiento',
      tipo: 'fecha',
      requerido: false },

    { id: 'sexo',
      etiqueta: 'Sexo',
      tipo: 'radio',
      opciones: ['Femenino', 'Masculino', 'Prefiere no decir'],
      requerido: false },

    { id: 'distrito',
      etiqueta: 'Distrito donde vive',
      tipo: 'texto',
      requerido: false },

    { tipo: 'titulo', etiqueta: 'Sobre su visita' },

    { id: 'como_nos_conocio',
      etiqueta: 'Como nos conocio?',
      tipo: 'lista',
      opciones: ['Redes sociales', 'Recomendacion de un amigo', 'Paso por la tienda',
                 'Publicidad', 'Ya era cliente', 'Otro'],
      requerido: true },

    { id: 'compro_hoy',
      etiqueta: 'Compro algo el dia de hoy?',
      tipo: 'sino',
      requerido: true },

    { id: 'monto_compra',
      etiqueta: 'Monto aproximado de la compra (S/)',
      tipo: 'numero',
      min: 0,
      requerido: false,
      condicion: { campo: 'compro_hoy', igual: 'Si' } },

    { id: 'categorias',
      etiqueta: 'Que categorias le interesan?',
      tipo: 'multiple',
      opciones: ['Calzado', 'Ropa deportiva', 'Ropa casual', 'Accesorios', 'Outdoor'],
      requerido: false },

    { id: 'satisfaccion',
      etiqueta: 'Que tan satisfecho quedo con la atencion?',
      tipo: 'escala',
      min: 1,
      max: 5,
      requerido: true,
      ayuda: '1 = Muy insatisfecho, 5 = Muy satisfecho' },

    { id: 'comentario',
      etiqueta: 'Algun comentario o sugerencia?',
      tipo: 'parrafo',
      requerido: false },

    { tipo: 'titulo', etiqueta: 'Autorizacion' },

    { id: 'acepta_datos',
      etiqueta: 'Autoriza el tratamiento de sus datos personales para fines comerciales, conforme a la Ley 29733 de Proteccion de Datos Personales?',
      tipo: 'sino',
      requerido: true },

    { id: 'firma',
      etiqueta: 'Firma del cliente',
      tipo: 'firma',
      requerido: false,
      condicion: { campo: 'acepta_datos', igual: 'Si' } }

    /* Ejemplo de campo con foto (quitar los slash para activarlo):

    { id: 'foto_boleta',
      etiqueta: 'Foto de la boleta',
      tipo: 'foto',
      requerido: false },
    */
  ]
};
