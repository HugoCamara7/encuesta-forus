# Encuestas Forus

Aplicación para tablet y celular que registra encuestas **sin conexión a internet**,
separadas por marca, y las exporta a Excel.

- **Costo: S/ 0.** Sin licencias, sin servidor, sin tienda de aplicaciones, sin plan de datos.
- Sin dependencias externas: no hay librerías que actualizar ni que puedan dejar de funcionar.
- Marcas, logos y paleta reutilizados del **Catálogo Control Center**.

**Flujo:** Nueva activación → Elegir plantilla → Elegir marca → Configurar preguntas → Vista previa → Publicar → Encuestar

---

## 1. Conceptos

| Concepto | Qué es |
|---|---|
| **Pregunta** | Una pregunta definida una sola vez, reutilizable en cualquier plantilla |
| **Plantilla** | Qué preguntas se hacen y cuáles son obligatorias |
| **Marca** | Identidad visual, logo, plantillas habilitadas y **base de clientes propia** |
| **Activación** | Una campaña concreta: una feria, un evento, un periodo en tienda |
| **Respuesta** | Una encuesta llenada, siempre ligada a marca + activación + plantilla |

Una activación guarda una **copia congelada** de sus preguntas. Si mañana cambias
una plantilla, las activaciones ya publicadas siguen exportando con las preguntas
que realmente se usaron: los datos históricos no se deforman.

---

## 2. Estructura de archivos

```
index.html                Estructura de la aplicación
sw.js                     Lo que permite abrirla sin internet
manifest.webmanifest      Nombre e ícono al instalarla
servidor.py               Solo para probar en la PC

css/styles.css            Diseño. La identidad de marca son variables CSS

js/config.js              👈 VERSIÓN de la app (súbela en cada cambio)
js/banco-preguntas.js     👈 Cómo es cada pregunta
js/plantillas.js          👈 Qué preguntas usa cada plantilla
js/marcas.js              👈 Marcas, colores, logos, plantillas habilitadas

js/validacion.js          Reglas (DNI, RUC, correo, celular)
js/campos.js              Dibuja los formularios
js/db.js                  Base de datos dentro del dispositivo
js/zip.js                 Generador de Excel y ZIP, escrito sin librerías
js/export.js              Exportación con filtros
js/app.js                 Pantallas y navegación

icons/marcas/             Logos de cada marca
```

Los cuatro archivos marcados con 👈 son los únicos que necesitas editar.
Los demás son el motor.

---

## 3. Agregar una marca nueva

1. Copia el logo a `icons/marcas/<id>.png`
   (fondo transparente, alto ~120 px)
2. Agrega esa ruta a la lista `OPCIONALES` de `sw.js`
3. En `js/marcas.js`, copia un bloque y ajústalo:

```js
{
  id: 'miMarca',                      // sin espacios ni tildes
  nombre: 'Mi Marca',
  descripcion: 'Categoría o rubro',
  logo: 'icons/marcas/miMarca.png',
  colores: {
    primario: '#RRGGBB',              // color del logo
    oscuro:   '#RRGGBB',              // versión oscura, para texto
    suave:    '#RRGGBB',              // fondo muy claro de la misma familia
    sobre:    '#FFFFFF'               // texto encima del primario
  },
  plantillas: ['captacion', 'experiencia'],   // cuáles puede usar
}
```

4. Sube el número de `version` en `js/config.js`

**Si el archivo del logo no existe**, la app muestra sola el nombre de la marca
en su color corporativo. No se rompe nada — así está funcionando Norseg ahora mismo.

### Ajustar preguntas solo para esa marca

Sin tocar el banco ni las plantillas, agrega dentro del bloque de la marca:

```js
ajustesPreguntas: {
  categorias: {
    etiqueta: 'Qué líneas le interesan?',
    opciones: ['Botas', 'Cascos', 'Guantes']
  }
}
```

Orden de resolución: **banco → plantilla → marca** (gana la marca).

---

## 4. Agregar una plantilla nueva

En `js/plantillas.js`, copia un bloque completo:

```js
{
  id: 'mi_plantilla',
  nombre: 'Mi plantilla',
  descripcion: 'Se muestra en la tarjeta de selección.',
  icono: '📋',
  secciones: [
    {
      titulo: 'Datos personales',
      preguntas: [
        { id: 'nombres', requerido: true  },
        { id: 'correo',  requerido: true  },
        { id: 'celular', requerido: false }
      ]
    }
  ]
}
```

Luego habilítala en las marcas que la usen (`plantillas: [...]` en `js/marcas.js`)
y sube la `version`.

**Las plantillas no definen preguntas**: solo las referencian por su `id`.

### Agregar una pregunta nueva al banco

En `js/banco-preguntas.js`:

```js
mi_pregunta: {
  etiqueta: 'Texto que ve el encuestador',
  tipo: 'radio',
  opciones: ['Una', 'Otra'],
  condicion: { campo: 'otra_pregunta', igual: 'Sí' }   // opcional
}
```

Tipos disponibles: `texto`, `parrafo`, `numero`, `telefono`, `correo`,
`documento`, `fecha`, `lista`, `radio`, `multiple`, `escala` (1-5),
`nps` (0-10), `sino`, `foto`, `firma`.

⚠️ **No cambies el `id` de una pregunta que ya tiene datos recogidos.** El `id` es
el nombre de la columna en el Excel. El texto de `etiqueta` sí lo puedes cambiar
cuando quieras.

---

## 5. Validaciones

| Campo | Regla |
|---|---|
| **DNI** | Exactamente 8 dígitos. Solo números |
| **RUC** | Exactamente 11 dígitos. Solo números. Habilita *Nombre / Razón Social* como obligatorio |
| **Carné de extranjería** | De 9 a 12 dígitos |
| **Pasaporte** | De 6 a 12 letras o números |
| **Celular** | 9 dígitos empezando en 9 |
| **Correo** | Formato válido. Se limpia y pasa a minúsculas solo |
| **Fecha** | No admite fechas futuras |

Los campos que solo admiten números **no dejan escribir letras**, y recortan lo que
sobra. Escribir `20-512.345.678` en un RUC deja `20512345678` automáticamente.

**Cuándo se valida:** no mientras se escribe por primera vez; sí al salir del campo,
y luego en cada tecla hasta que se corrige. Los errores salen debajo del campo,
en rojo. **Nunca se usan ventanas emergentes para errores de formulario.**

---

## 6. Separación por marca

Es una sola base de datos, pero **nada se mezcla**:

- Cada respuesta guarda `marcaId`, `activacionId` y `plantillaId`
- Toda consulta y toda exportación pasa por el mismo filtro
- El inicio agrupa las activaciones por marca
- En *Ajustes* puedes borrar las respuestas de una marca sin tocar las demás
- El nombre del archivo exportado lleva la marca y la activación

---

## 7. Sacar los datos

En **Resultados**, filtra por **Marca · Activación · Plantilla · Fecha** y descarga:

| Botón | Qué genera |
|---|---|
| **Excel** | Una fila por respuesta, con encabezado fijo y filtros activados |
| **CSV** | Lo mismo en texto plano, por si Excel falla |
| **Imágenes** | Fotos y firmas en un `.zip`, nombradas por número de registro |

Lo que se descarga es **exactamente lo que ves filtrado**.

Los DNI, RUC y celulares salen **como texto**, para que no se pierdan los ceros
de la izquierda ni se conviertan en notación científica.

En **Ajustes → Crear respaldo** obtienes un `.json` con TODO (activaciones,
respuestas y fotos de todas las marcas). Se puede reimportar en otra tablet sin
duplicar nada. **Hazlo al final de cada jornada.**

---

## 8. Publicar y actualizar

Ya está publicado en:
`https://hugocamara7.github.io/encuesta-forus/`

Para actualizar: reemplaza los archivos cambiados en GitHub y **sube la `version`
en `js/config.js`**. Las tablets se actualizan solas la próxima vez que abran la
app con wifi.

Para probar en tu PC antes de subir:

```bash
python servidor.py
```

---

## 9. Cuidados importantes

Los datos viven **solo dentro del dispositivo**. Se pierden si se desinstala la
aplicación, se usa *Borrar datos de navegación*, o se restablece de fábrica.
Instruye a los encuestadores de no hacer ninguna de esas tres cosas.

- **Duplicados:** si se repite un documento **dentro de la misma activación**, la app
  avisa y pregunta antes de guardar. No lo bloquea. Entre activaciones distintas no avisa.
- **Formulario a medio llenar:** se recupera solo si se cierra la app por accidente.
- **Datos personales:** todas las plantillas incluyen la autorización de la Ley 29733.
- **Fotos:** se comprimen a ~150 KB cada una. Revisa el espacio usado en *Ajustes*.

---

## 10. Pendiente

**El logo de Norseg no está en el repositorio.** La marca ya funciona con su
identidad naranja (`#E8620C`), mostrando el nombre en texto mientras tanto.

Para completarla: guarda el PNG con fondo transparente como
`icons/marcas/norseg.png` (alto ~120 px) y súbelo. No hay que tocar código —
la app lo detecta sola. El color naranja se tomó del logo que enviaste; si tienes
el valor exacto de su manual de marca, cámbialo en `js/marcas.js`.
