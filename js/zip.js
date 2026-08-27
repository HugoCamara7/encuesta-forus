/* =====================================================================
   GENERADOR DE ZIP Y DE EXCEL (.xlsx)
   Escrito desde cero para no depender de ninguna libreria externa.
   Un archivo .xlsx es en realidad un .zip con XML adentro, asi que el
   mismo motor sirve para las dos cosas.
   No editar.
   ===================================================================== */

const ZIP = (function () {

  /* ---------- CRC32 (lo exige el formato ZIP) ---------- */
  const TABLA = (function () {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TABLA[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const utf8 = new TextEncoder();

  /* ---------- Fecha/hora en formato DOS ---------- */
  function fechaDOS(d) {
    const anio = Math.max(1980, d.getFullYear());
    return {
      hora:  ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF,
      fecha: (((anio - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF
    };
  }

  /* ---------------------------------------------------------------
     crearZip(archivos) -> Blob
     archivos = [ { nombre: 'carpeta/a.txt', datos: Uint8Array|string } ]
     Usa metodo "almacenado" (sin comprimir): es valido, mas rapido, y
     el contenido (JPEG, XML pequeno) casi no se beneficia de comprimir.
     --------------------------------------------------------------- */
  function crearZip(archivos) {
    const ahora = fechaDOS(new Date());
    const partes = [];       // trozos del cuerpo del zip
    const central = [];      // entradas del directorio central
    let offset = 0;

    archivos.forEach(function (f) {
      const nombre = utf8.encode(f.nombre);
      const datos  = (typeof f.datos === 'string') ? utf8.encode(f.datos) : f.datos;
      const crc    = crc32(datos);

      // --- Cabecera local ---
      const local = new Uint8Array(30 + nombre.length);
      const vL = new DataView(local.buffer);
      vL.setUint32(0,  0x04034B50, true);   // firma PK 3 4
      vL.setUint16(4,  20, true);           // version necesaria
      vL.setUint16(6,  0x0800, true);       // bandera: nombres en UTF-8
      vL.setUint16(8,  0, true);            // metodo 0 = almacenado
      vL.setUint16(10, ahora.hora, true);
      vL.setUint16(12, ahora.fecha, true);
      vL.setUint32(14, crc, true);
      vL.setUint32(18, datos.length, true); // tamano comprimido
      vL.setUint32(22, datos.length, true); // tamano original
      vL.setUint16(26, nombre.length, true);
      vL.setUint16(28, 0, true);            // sin campo extra
      local.set(nombre, 30);

      partes.push(local, datos);

      // --- Entrada del directorio central ---
      const cen = new Uint8Array(46 + nombre.length);
      const vC = new DataView(cen.buffer);
      vC.setUint32(0,  0x02014B50, true);   // firma PK 1 2
      vC.setUint16(4,  20, true);           // version que lo creo
      vC.setUint16(6,  20, true);           // version necesaria
      vC.setUint16(8,  0x0800, true);
      vC.setUint16(10, 0, true);
      vC.setUint16(12, ahora.hora, true);
      vC.setUint16(14, ahora.fecha, true);
      vC.setUint32(16, crc, true);
      vC.setUint32(20, datos.length, true);
      vC.setUint32(24, datos.length, true);
      vC.setUint16(28, nombre.length, true);
      vC.setUint16(30, 0, true);            // extra
      vC.setUint16(32, 0, true);            // comentario
      vC.setUint16(34, 0, true);            // disco
      vC.setUint16(36, 0, true);            // atributos internos
      vC.setUint32(38, 0, true);            // atributos externos
      vC.setUint32(42, offset, true);       // donde empieza la cabecera local
      cen.set(nombre, 46);
      central.push(cen);

      offset += local.length + datos.length;
    });

    const tamCentral = central.reduce(function (s, c) { return s + c.length; }, 0);

    // --- Fin del directorio central ---
    const fin = new Uint8Array(22);
    const vF = new DataView(fin.buffer);
    vF.setUint32(0,  0x06054B50, true);     // firma PK 5 6
    vF.setUint16(4,  0, true);
    vF.setUint16(6,  0, true);
    vF.setUint16(8,  archivos.length, true);
    vF.setUint16(10, archivos.length, true);
    vF.setUint32(12, tamCentral, true);
    vF.setUint32(16, offset, true);
    vF.setUint16(20, 0, true);

    return new Blob(partes.concat(central, [fin]), { type: 'application/zip' });
  }

  /* ---------- Utilidades XML ---------- */

  // Excel rechaza los caracteres de control: se filtran uno por uno.
  // Se conservan tabulacion (9), salto de linea (10) y retorno (13).
  function esc(txt) {
    const t = String(txt);
    let s = '';
    for (let i = 0; i < t.length; i++) {
      const c = t.charCodeAt(i);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) continue;
      const ch = t.charAt(i);
      if      (ch === '&') s += '&amp;';
      else if (ch === '<') s += '&lt;';
      else if (ch === '>') s += '&gt;';
      else if (ch === '"') s += '&quot;';
      else s += ch;
    }
    return s;
  }

  // 1 -> A, 26 -> Z, 27 -> AA
  function columna(n) {
    let s = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  /* ---------------------------------------------------------------
     crearExcel(filas, opciones) -> Blob (.xlsx real, abre en Excel)

     filas = [ ['Encabezado 1','Encabezado 2'], ['dato','dato'], ... ]
             La primera fila se toma como encabezado (negrita, fijada).

     Todo se escribe como TEXTO salvo lo que venga como numero de
     JavaScript. Eso es intencional: los DNI y celulares deben conservar
     los ceros a la izquierda y no convertirse en notacion cientifica.
     --------------------------------------------------------------- */
  function crearExcel(filas, opciones) {
    opciones = opciones || {};
    const hoja = esc(opciones.nombreHoja || 'Datos').slice(0, 31);
    const nCols = filas.reduce(function (m, f) { return Math.max(m, f.length); }, 1);

    // Ancho de columna calculado segun el contenido mas largo
    let cols = '<cols>';
    for (let c = 0; c < nCols; c++) {
      let ancho = 10;
      for (let f = 0; f < filas.length; f++) {
        const v = filas[f][c];
        if (v != null) ancho = Math.max(ancho, Math.min(50, String(v).length + 3));
      }
      cols += '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + ancho + '" customWidth="1"/>';
    }
    cols += '</cols>';

    let sd = '';
    filas.forEach(function (fila, i) {
      const r = i + 1;
      let celdas = '';
      for (let c = 0; c < nCols; c++) {
        const v = fila[c];
        if (v === null || v === undefined || v === '') continue;
        const ref = columna(c + 1) + r;
        const estilo = (i === 0) ? ' s="1"' : '';
        if (typeof v === 'number' && isFinite(v)) {
          celdas += '<c r="' + ref + '"' + estilo + '><v>' + v + '</v></c>';
        } else {
          celdas += '<c r="' + ref + '"' + estilo + ' t="inlineStr"><is><t xml:space="preserve">'
                  + esc(v) + '</t></is></c>';
        }
      }
      sd += '<row r="' + r + '"' + (i === 0 ? ' ht="28" customHeight="1"' : '') + '>' + celdas + '</row>';
    });

    const rango = 'A1:' + columna(nCols) + Math.max(1, filas.length);

    const sheet =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView tabSelected="1" workbookViewId="0">' +
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      cols +
      '<sheetData>' + sd + '</sheetData>' +
      '<autoFilter ref="' + rango + '"/>' +
      '</worksheet>';

    const styles =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2">' +
        '<font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
      '</fonts>' +
      '<fills count="3">' +
        '<fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/><bgColor indexed="64"/></patternFill></fill>' +
      '</fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">' +
          '<alignment vertical="center" wrapText="1"/></xf>' +
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';

    const blob = crearZip([
      { nombre: '[Content_Types].xml', datos:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>' },

      { nombre: '_rels/.rels', datos:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>' },

      { nombre: 'xl/workbook.xml', datos:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="' + hoja + '" sheetId="1" r:id="rId1"/></sheets>' +
        '</workbook>' },

      { nombre: 'xl/_rels/workbook.xml.rels', datos:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>' },

      { nombre: 'xl/styles.xml',            datos: styles },
      { nombre: 'xl/worksheets/sheet1.xml', datos: sheet  }
    ]);

    return blob.slice(0, blob.size,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  // Convierte "data:image/jpeg;base64,XXXX" a bytes, para meterlo al zip
  function dataUrlABytes(dataUrl) {
    const base64 = String(dataUrl).split(',')[1] || '';
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  return { crearZip: crearZip, crearExcel: crearExcel, dataUrlABytes: dataUrlABytes, crc32: crc32 };
})();
