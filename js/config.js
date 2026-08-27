/* =====================================================================
   CONFIGURACION GLOBAL
   ---------------------------------------------------------------------
   Aqui ya NO estan las preguntas. Se repartieron en tres archivos, cada
   uno con una sola responsabilidad:

     js/banco-preguntas.js   Como es cada pregunta (tipo, opciones)
     js/plantillas.js        Que preguntas usa cada plantilla
     js/marcas.js            Marcas, identidad visual y sus plantillas

   IMPORTANTE: cada vez que edites cualquiera de esos archivos, sube el
   numero de "version" de aqui abajo. Es lo que hace que las tablets
   detecten el cambio y se actualicen solas la proxima vez que abran
   la app con wifi.
   ===================================================================== */

const CONFIG = {

  nombreApp: 'Encuestas Forus',

  // Subir en cada cambio de preguntas, plantillas o marcas
  version: '2.0.0',

  // Pedir ubicacion GPS al guardar cada encuesta.
  // Se deja en false: en tiendas cerradas casi nunca hay senal GPS y
  // solo agrega un permiso mas que el encuestador tiene que aceptar.
  pedirGPS: false
};
