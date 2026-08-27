/* =====================================================================
   MARCAS
   ---------------------------------------------------------------------
   Cada marca tiene su identidad visual, su logo, que plantillas puede
   usar y su propia base de clientes (la separacion de datos la hace la
   base por marcaId, no hace falta configurar nada aqui).

   Los logos y los nombres salen del repositorio Catalogo Control Center
   (assets/brands). Los colores se extrajeron del propio logo de cada
   marca, no son inventados.

   COMO AGREGAR UNA MARCA NUEVA:
     1. Copia el archivo del logo a  icons/marcas/<id>.png
        (fondo transparente, alto 120 px aprox.)
     2. Agrega el archivo a la lista ARCHIVOS de sw.js
     3. Copia un bloque de aqui abajo, cambia id, nombre, colores y logo
     4. Sube el numero de version en config.js
   Si el archivo del logo no existe, la app muestra sola el nombre de la
   marca en su color corporativo. No se rompe nada.
   ---------------------------------------------------------------------
   COLORES:
     primario  color principal de la marca (cabecera, botones)
     oscuro    version oscura, para texto sobre fondo claro
     suave     fondo muy claro de la misma familia (tarjetas, avisos)
     sobre     color del texto que va ENCIMA del primario
   ===================================================================== */

const MARCAS = [

  {
    id: 'norseg',
    nombre: 'Norseg',
    descripcion: 'Seguridad industrial y equipos de proteccion personal',
    logo: 'icons/marcas/norseg.png',
    colores: {
      primario: '#E8620C',
      oscuro:   '#A34309',
      suave:    '#FEF2E9',
      sobre:    '#FFFFFF'
    },
    plantillas: ['captacion', 'activacion_marca', 'frecuencia', 'experiencia', 'personalizada'],

    // Norseg vende EPP a empresas: sus categorias y su contexto son distintos
    ajustesPreguntas: {
      categorias: {
        etiqueta: 'Que lineas de producto le interesan?',
        opciones: ['Calzado de seguridad', 'Cascos', 'Guantes', 'Proteccion visual',
                   'Proteccion auditiva', 'Proteccion respiratoria', 'Ropa de trabajo',
                   'Arnes y altura', 'Senalizacion']
      },
      intereses: {
        etiqueta: 'En que tipo de trabajo usa los equipos?',
        opciones: ['Construccion', 'Mineria', 'Industria', 'Energia',
                   'Trabajo en altura', 'Soldadura', 'Almacen / Logistica']
      }
    }
  },

  {
    id: 'columbia',
    nombre: 'Columbia',
    descripcion: 'Outdoor y montana',
    logo: 'icons/marcas/columbia.png',
    colores: { primario: '#1884C0', oscuro: '#0D496A', suave: '#EBF6FC', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  },

  {
    id: 'vans',
    nombre: 'Vans',
    descripcion: 'Lifestyle y skate',
    logo: 'icons/marcas/vans.png',
    colores: { primario: '#E10600', oscuro: '#8A0400', suave: '#FDEDEC', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  },

  {
    id: 'hushpuppies',
    nombre: 'Hush Puppies',
    descripcion: 'Calzado casual y confort',
    logo: 'icons/marcas/hushpuppies.png',
    colores: { primario: '#6B4F2A', oscuro: '#3E2E18', suave: '#F7F2EA', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  },

  {
    id: 'rockford',
    nombre: 'Rockford',
    descripcion: 'Outdoor y uso diario',
    logo: 'icons/marcas/rockford.png',
    colores: { primario: '#00602F', oscuro: '#00381B', suave: '#EAF7F0', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  },

  {
    id: 'patagonia',
    nombre: 'Patagonia',
    descripcion: 'Outdoor tecnico y sostenibilidad',
    logo: 'icons/marcas/patagonia.png',
    colores: { primario: '#1F2937', oscuro: '#0F172A', suave: '#F1F3F6', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  },

  {
    id: 'mhw',
    nombre: 'Mountain Hardwear',
    descripcion: 'Montana y alto rendimiento',
    logo: 'icons/marcas/mhw.png',
    colores: { primario: '#222222', oscuro: '#0D0D0D', suave: '#F4F4F4', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  },

  {
    id: 'sorel',
    nombre: 'Sorel',
    descripcion: 'Botas y clima frio',
    logo: 'icons/marcas/sorel.png',
    colores: { primario: '#2B2B2B', oscuro: '#121212', suave: '#F4F4F4', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  },

  {
    id: 'keds',
    nombre: 'Keds',
    descripcion: 'Zapatillas femeninas y casual',
    logo: 'icons/marcas/keds.png',
    colores: { primario: '#00549C', oscuro: '#002E56', suave: '#EAF4FD', sobre: '#FFFFFF' },
    plantillas: ['captacion', 'gustos', 'frecuencia', 'experiencia', 'activacion_marca', 'personalizada']
  }
];

/* ===================================================================== */

const MARCA = {

  porId: function (id) {
    return MARCAS.filter(function (m) { return m.id === id; })[0] || null;
  },

  /* Plantillas habilitadas para una marca, ya resueltas a objetos */
  plantillasDe: function (marcaId) {
    const marca = this.porId(marcaId);
    if (!marca) return [];
    return (marca.plantillas || []).map(function (pid) {
      return PLANTILLA.porId(pid);
    }).filter(Boolean);
  },

  /* Marcas que tienen habilitada una plantilla */
  conPlantilla: function (plantillaId) {
    return MARCAS.filter(function (m) {
      return (m.plantillas || []).indexOf(plantillaId) >= 0;
    });
  },

  /* Pinta la app con los colores de la marca.
     Todo el CSS lee estas variables, asi que con esto cambia la interfaz
     completa sin tocar ninguna regla de estilo. */
  aplicarIdentidad: function (marcaId) {
    const raiz = document.documentElement;
    const marca = this.porId(marcaId);

    if (!marca) {
      ['primario', 'oscuro', 'suave', 'sobre'].forEach(function (k) {
        raiz.style.removeProperty('--marca-' + k);
      });
      raiz.removeAttribute('data-marca');
      return;
    }

    Object.keys(marca.colores).forEach(function (k) {
      raiz.style.setProperty('--marca-' + k, marca.colores[k]);
    });
    raiz.setAttribute('data-marca', marca.id);
  },

  /* <img> del logo con respaldo automatico: si el archivo no existe,
     se reemplaza por el nombre de la marca en su color corporativo.
     Es el mismo criterio que usa el Catalogo Control Center. */
  nodoLogo: function (marca, clase) {
    const cont = document.createElement('span');
    cont.className = clase || 'marca-logo';

    const img = document.createElement('img');
    img.alt = marca.nombre;

    // El listener va ANTES de asignar src: si el archivo no existe, el
    // error puede dispararse de inmediato y quedariamos sin respaldo.
    // Tampoco se usa loading="lazy": retrasaria la carga y con ella el
    // error, dejando un icono de imagen rota a la vista.
    img.addEventListener('error', function () {
      const texto = document.createElement('span');
      texto.className = 'marca-logo-texto';
      texto.textContent = marca.nombre.toUpperCase();
      texto.style.color = marca.colores.primario;
      cont.replaceChildren(texto);
    });

    img.src = marca.logo;
    cont.appendChild(img);
    return cont;
  }
};
