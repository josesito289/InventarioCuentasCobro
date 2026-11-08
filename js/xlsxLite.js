/* xlsxLite.js — Lector mínimo de archivos .xlsx, sin dependencias externas.
   Usa DecompressionStream (nativo en Chrome/Android) para descomprimir el ZIP
   y DOMParser para leer el XML. Soporta la hoja 1 del libro: suficiente para
   plantillas simples de productos. Si el navegador no soporta DecompressionStream,
   lanza un error claro para que el usuario use CSV en su lugar. */

const XlsxLite = (() => {

  function _u16(dv, o) { return dv.getUint16(o, true); }
  function _u32(dv, o) { return dv.getUint32(o, true); }

  function _findEOCD(bytes) {
    const max = Math.min(bytes.length, 65557);
    for (let i = bytes.length - 22; i >= bytes.length - max && i >= 0; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        return i;
      }
    }
    return -1;
  }

  function _readCentralDirectory(buf) {
    const bytes = new Uint8Array(buf);
    const eocdOffset = _findEOCD(bytes);
    if (eocdOffset < 0) throw new Error('Archivo .xlsx no válido (no se encontró el final del ZIP).');
    const dv = new DataView(buf);
    const totalEntries = _u16(dv, eocdOffset + 10);
    const cdOffset = _u32(dv, eocdOffset + 16);

    const entries = {};
    let offset = cdOffset;
    for (let i = 0; i < totalEntries; i++) {
      const sig = _u32(dv, offset);
      if (sig !== 0x02014b50) break;
      const compressionMethod = _u16(dv, offset + 10);
      const compressedSize = _u32(dv, offset + 20);
      const fileNameLen = _u16(dv, offset + 28);
      const extraLen = _u16(dv, offset + 30);
      const commentLen = _u16(dv, offset + 32);
      const localHeaderOffset = _u32(dv, offset + 42);
      const nameBytes = bytes.slice(offset + 46, offset + 46 + fileNameLen);
      const name = new TextDecoder('utf-8').decode(nameBytes);
      entries[name] = { compressionMethod, compressedSize, localHeaderOffset };
      offset += 46 + fileNameLen + extraLen + commentLen;
    }
    return entries;
  }

  async function _inflate(bytes, method) {
    if (method === 0) return bytes; // sin comprimir
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Este navegador no soporta la lectura de archivos .xlsx. Usa un archivo CSV en su lugar.');
    }
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }

  async function _getEntry(buf, entries, name) {
    const info = entries[name];
    if (!info) return null;
    const dv = new DataView(buf);
    const bytes = new Uint8Array(buf);
    const lo = info.localHeaderOffset;
    const sig = _u32(dv, lo);
    if (sig !== 0x04034b50) throw new Error('Cabecera local de ZIP inválida.');
    const fileNameLen = _u16(dv, lo + 26);
    const extraLen = _u16(dv, lo + 28);
    const dataStart = lo + 30 + fileNameLen + extraLen;
    const compressed = bytes.slice(dataStart, dataStart + info.compressedSize);
    const raw = await _inflate(compressed, info.compressionMethod);
    return new TextDecoder('utf-8').decode(raw);
  }

  function _parseSharedStrings(xmlText) {
    if (!xmlText) return [];
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const siNodes = Array.from(doc.getElementsByTagName('si'));
    return siNodes.map(si => {
      const tNodes = Array.from(si.getElementsByTagName('t'));
      return tNodes.map(t => t.textContent).join('');
    });
  }

  function _colToIndex(colLetters) {
    let idx = 0;
    for (let i = 0; i < colLetters.length; i++) {
      idx = idx * 26 + (colLetters.charCodeAt(i) - 64);
    }
    return idx - 1;
  }

  function _parseSheet(xmlText, sharedStrings) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const rows = Array.from(doc.getElementsByTagName('row'));
    const result = [];
    rows.forEach(rowNode => {
      const cells = Array.from(rowNode.getElementsByTagName('c'));
      const rowArr = [];
      cells.forEach(c => {
        const ref = c.getAttribute('r') || '';
        const colLetters = (ref.match(/^[A-Z]+/) || ['A'])[0];
        const colIdx = _colToIndex(colLetters);
        const type = c.getAttribute('t');
        let value = '';
        if (type === 'inlineStr') {
          const isNode = c.getElementsByTagName('is')[0];
          value = isNode ? Array.from(isNode.getElementsByTagName('t')).map(t => t.textContent).join('') : '';
        } else {
          const vNode = c.getElementsByTagName('v')[0];
          const raw = vNode ? vNode.textContent : '';
          if (type === 's') {
            const idx = parseInt(raw, 10);
            value = sharedStrings[idx] !== undefined ? sharedStrings[idx] : '';
          } else if (type === 'str' || type === 'b') {
            value = raw;
          } else {
            value = raw; // número
          }
        }
        rowArr[colIdx] = value;
      });
      // Rellenar huecos con cadena vacía
      for (let i = 0; i < rowArr.length; i++) {
        if (rowArr[i] === undefined) rowArr[i] = '';
      }
      result.push(rowArr);
    });
    return result;
  }

  async function readFirstSheet(file) {
    const buf = await file.arrayBuffer();
    const entries = _readCentralDirectory(buf);

    let sheetName = 'xl/worksheets/sheet1.xml';
    if (!entries[sheetName]) {
      const candidates = Object.keys(entries)
        .filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
        .sort();
      if (candidates.length === 0) throw new Error('No se encontró ninguna hoja dentro del archivo .xlsx.');
      sheetName = candidates[0];
    }

    const sharedStringsXml = await _getEntry(buf, entries, 'xl/sharedStrings.xml');
    const sharedStrings = _parseSharedStrings(sharedStringsXml);
    const sheetXml = await _getEntry(buf, entries, sheetName);
    if (!sheetXml) throw new Error('No se pudo leer el contenido de la hoja.');
    return _parseSheet(sheetXml, sharedStrings);
  }

  return { readFirstSheet };
})();
