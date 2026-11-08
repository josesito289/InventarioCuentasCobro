/* importExport.js — Importar productos desde CSV/CSV UTF-8/TXT/XLSX,
   generar plantilla de importación, y exportar/importar respaldo JSON completo. */

const ImportExport = (() => {

  const HEADERS = ['NombreProducto', 'CostoUnitario', 'Subproducto', 'CantidadSubproducto', 'CostoUnitarioSubproducto'];

  function _detectDelimiter(sampleLine) {
    const commas = (sampleLine.match(/,/g) || []).length;
    const semis = (sampleLine.match(/;/g) || []).length;
    const tabs = (sampleLine.match(/\t/g) || []).length;
    if (tabs > commas && tabs > semis) return '\t';
    if (semis > commas) return ';';
    return ',';
  }

  function _parseCsvText(text) {
    // Quita BOM si existe
    text = text.replace(/^﻿/, '');
    const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const delim = _detectDelimiter(lines[0]);
    return lines.map(line => _parseCsvLine(line, delim));
  }

  function _parseCsvLine(line, delim) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === delim) { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map(c => c.trim());
  }

  function _rowsToObjects(rows) {
    if (rows.length === 0) return [];
    const header = rows[0].map(h => String(h).trim());
    const idx = {};
    HEADERS.forEach(h => {
      idx[h] = header.findIndex(x => x.toLowerCase() === h.toLowerCase());
    });
    if (idx['NombreProducto'] < 0 || idx['CostoUnitario'] < 0) {
      throw new Error('El archivo debe tener al menos las columnas "NombreProducto" y "CostoUnitario".');
    }
    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => String(c).trim() === '')) continue;
      const nombre = String(row[idx['NombreProducto']] ?? '').trim();
      const costoRaw = row[idx['CostoUnitario']];
      if (!nombre) continue;
      const costoUnitario = _parseNumero(costoRaw);
      const item = { nombre, costoUnitario };
      if (idx['Subproducto'] >= 0) {
        const sub = String(row[idx['Subproducto']] ?? '').trim();
        if (sub) {
          item.subproducto = sub;
          item.cantidadSubproducto = idx['CantidadSubproducto'] >= 0 ? _parseNumero(row[idx['CantidadSubproducto']]) : null;
          item.costoUnitarioSubproducto = idx['CostoUnitarioSubproducto'] >= 0 ? _parseNumero(row[idx['CostoUnitarioSubproducto']]) : null;
        }
      }
      items.push(item);
    }
    return items;
  }

  function _parseNumero(v) {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  async function importProductsFromFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let rows;
    if (ext === 'xlsx') {
      rows = await XlsxLite.readFirstSheet(file);
    } else {
      const text = await file.text();
      rows = _parseCsvText(text);
    }
    const items = _rowsToObjects(rows);
    let count = 0;
    items.forEach(item => {
      DB.upsertProduct({
        nombre: item.nombre,
        costoUnitario: item.costoUnitario,
        subproducto: item.subproducto || '',
        cantidadSubproducto: item.cantidadSubproducto ?? null,
        costoUnitarioSubproducto: item.costoUnitarioSubproducto ?? null
      });
      count++;
    });
    return count;
  }

  function downloadTemplateCsv() {
    const header = HEADERS.join(',');
    const ejemplo = 'ANCHETA PEQUEÑA VERDE ROJA,21630,,,';
    const ejemplo2 = 'CANASTA NAVIDEÑA GRANDE,45000,Galleta surtida,2,3500';
    const content = '﻿' + [header, ejemplo, ejemplo2].join('\r\n');
    _downloadText(content, 'plantilla_productos.csv', 'text/csv;charset=utf-8');
  }

  function _downloadText(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadBackupJson() {
    const data = DB.exportAll();
    const name = `respaldo_InventarioCuentasCobro_${_fechaArchivo()}.json`;
    _downloadText(JSON.stringify(data, null, 2), name, 'application/json;charset=utf-8');
  }

  function _fechaArchivo() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  async function loadBackupFromFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    DB.importAll(data);
    return true;
  }

  return { importProductsFromFile, downloadTemplateCsv, downloadBackupJson, loadBackupFromFile, HEADERS };
})();
