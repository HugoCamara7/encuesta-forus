# Encuesta de Clientes — Forus

Aplicación para tablet que registra encuestas **sin conexión a internet** y las
exporta a Excel. Los datos se guardan dentro de la tablet hasta que los descargas.

- **Costo: S/ 0.** Sin licencias, sin servidor, sin tienda de aplicaciones, sin plan de datos.
- Funciona en Android, y también en iPad y Windows.
- Diseñada con la paleta corporativa Forus del Catálogo Control Center.

---

## 1. Probarla en tu PC (2 minutos)

Doble clic en `servidor.py`. Se abre solo el navegador.

Si no abre, en una terminal dentro de esta carpeta:

```bash
python servidor.py
```

Para cerrarlo: `Ctrl + C`.

> Esto es **solo para probar**. Para usarla en las tablets hay que publicarla una vez (paso 2).

---

## 2. Publicarla gratis en GitHub Pages (una sola vez)

Las tablets necesitan una dirección `https://` para poder instalar la app. GitHub Pages
la da gratis y para siempre. Solo se hace **una vez**.

1. Crea una cuenta gratuita en <https://github.com> (si no tienes).
2. Clic en **New repository**.
   - Nombre: `encuesta-forus`
   - Marca **Public**
   - Clic en **Create repository**
3. En el repositorio nuevo, clic en **uploading an existing file**.
4. Arrastra **todo el contenido de esta carpeta**: `index.html`, `sw.js`,
   `manifest.webmanifest`, y las carpetas `js`, `css`, `icons`.
   No hace falta subir `servidor.py` ni este `LEEME.md`.
5. Clic en **Commit changes**.
6. Ve a **Settings → Pages**.
   - En *Source* elige **Deploy from a branch**
   - Branch: **main**, carpeta: **/ (root)** → **Save**
7. Espera 1 o 2 minutos. Arriba aparece la dirección, algo como:

   `https://TU-USUARIO.github.io/encuesta-forus/`

Esa es la dirección que abrirás en las tablets. **Anótala.**

> ¿El repositorio tiene que ser público? Sí, para que GitHub Pages sea gratis.
> Ten en cuenta que se publica **la aplicación**, nunca los datos: las respuestas
> de los clientes jamás salen de la tablet.

---

## 3. Instalar en cada tablet

Con wifi, **una sola vez por tablet**:

1. Abre **Chrome** y entra a la dirección del paso 2.
2. Menú de los tres puntos → **Instalar aplicación** (o *Agregar a pantalla de inicio*).
   - También aparece un botón **Instalar la aplicación** dentro de *Ajustes*.
3. Queda el ícono azul de Forus en la pantalla de inicio.
4. Abre la app desde ese ícono, entra a **Ajustes** y completa:
   - **Nombre del encuestador**
   - **Punto de trabajo**

Listo. **Desde ahí ya funciona sin internet**, incluso en modo avión.

> Antes de salir a campo, haz una encuesta de prueba con el wifi apagado y bórrala.
> Así confirmas que quedó bien instalada.

---

## 4. Cambiar las preguntas

Edita **únicamente** el archivo `js/config.js`. Está comentado en español y explica
cada tipo de pregunta disponible.

Después de editar:

1. **Sube el número de `version`** dentro de ese mismo archivo
   (ej: de `'1.1.0'` a `'1.1.1'`). Esto es lo que avisa a las tablets que hay cambios.
2. Sube el archivo corregido a GitHub (arrastrarlo de nuevo lo reemplaza).
3. Las tablets se actualizan solas la próxima vez que se abran **con wifi**.

⚠️ **No cambies el `id` de una pregunta que ya tiene datos recogidos.** El `id` es el
nombre de la columna en el Excel; si lo cambias, pierdes la relación con lo ya guardado.
El texto de `etiqueta` sí lo puedes cambiar cuando quieras.

---

## 5. Sacar los datos

Todo está en **Ajustes**, y funciona **sin internet**. Los archivos van a la carpeta
**Descargas** de la tablet; de ahí los pasas por cable USB, correo o OneDrive.

| Botón | Qué genera | Cuándo usarlo |
|---|---|---|
| **Descargar Excel (.xlsx)** | Una fila por encuesta, listo para analizar | Es el principal |
| **Descargar CSV** | Lo mismo en texto plano | Solo si el Excel falla |
| **Descargar fotos y firmas (.zip)** | Las imágenes, nombradas por número de registro | Si usas fotos o firma |
| **Crear respaldo (.json)** | Copia exacta de todo, fotos incluidas | **Todos los días** |

El Excel ya viene con la fila de encabezados fija y los filtros activados. Los
números de documento y celulares salen **como texto**, para que no se pierdan los
ceros de la izquierda.

### Restaurar en otra tablet

*Ajustes → Restaurar desde un respaldo* y elige el archivo `.json`. Se puede
importar el mismo archivo varias veces sin duplicar nada: la app reconoce los
registros que ya tiene.

---

## 6. Rutina diaria recomendada

**Al terminar cada jornada, en cada tablet:**

1. Descargar Excel
2. Crear respaldo `.json`
3. Copiar ambos archivos a OneDrive o a la PC
4. Recién ahí, si hace falta, usar *Borrar todas las encuestas*

Es la única protección real contra perder o malograr una tablet.

---

## 7. Cuidados importantes

Los datos viven **solo dentro de la tablet**. Se pierden si:

- Se desinstala la aplicación
- Se usa *Borrar datos de navegación* en Chrome
- Se restablece la tablet de fábrica

**Instruye a los encuestadores de no hacer ninguna de esas tres cosas.** La app le
pide a Android que proteja su almacenamiento, pero eso no la salva de un borrado manual.

Otros puntos:

- **Cuántas encuestas aguanta:** miles, si son solo texto. Con fotos, la app las
  comprime a unos 150 KB cada una. Revisa el espacio usado en *Ajustes*.
- **Duplicados:** si repites un número de documento, la app avisa y pregunta antes
  de guardar. No lo bloquea.
- **Formulario a medio llenar:** si se apaga la tablet, al volver a abrir se recupera
  lo que se había escrito.
- **Datos personales:** el formulario incluye la autorización de la Ley 29733. Si
  el cliente responde *No*, quedará registrado así en el Excel.
- **iPad:** funciona, pero Safari puede borrar el almacenamiento si la app pasa
  semanas sin abrirse. En iPad, exporta con más frecuencia.

---

## 8. Si algo falla

| Problema | Solución |
|---|---|
| No aparece *Instalar aplicación* | Tiene que ser **Chrome** y la dirección debe empezar en `https://` |
| No abre sin internet | Ábrela con wifi una vez más; la copia local se guarda al abrirla |
| Cambié las preguntas y no se ven | ¿Subiste el número de `version` en `js/config.js`? Abre la app con wifi |
| El Excel no descarga | Prueba el botón CSV. Revisa que Chrome tenga permiso de almacenamiento |
| Aparece "Falta configurar la tablet" | Ve a *Ajustes* y completa encuestador y punto de trabajo |
| Se perdieron datos | Restaura el último `.json` desde *Ajustes → Restaurar desde un respaldo* |

---

## 9. Qué hay en cada archivo

```
index.html               Pantallas de la aplicación
sw.js                    Lo que permite abrirla sin internet
manifest.webmanifest     Nombre e ícono al instalarla
servidor.py              Solo para probar en la PC
css/styles.css           Diseño, con la paleta corporativa Forus
js/config.js             👈 LAS PREGUNTAS. Es el único que editas
js/db.js                 Base de datos dentro de la tablet
js/zip.js                Generador de Excel y ZIP (escrito sin librerías)
js/export.js             Arma el Excel, el CSV y los respaldos
js/app.js                Lógica: formularios, validación, listado
icons/                   Ícono de la app y logotipos Forus
```

Recursos de marca tomados del **Catálogo Control Center**:
azul Forus `#14259B`, cyan Forus `#009FE3`, navy de cabeceras `#0B1B46`.

La aplicación **no usa ninguna librería externa**. No hay dependencias que
actualizar, ni licencias, ni nada que pueda dejar de funcionar con el tiempo.
