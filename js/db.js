/* db.js — capa de almacenamiento local (localStorage) para InventarioCuentasCobro
   Todo funciona 100% offline. No depende de red ni de ningún backend. */

const DB = (() => {
  const KEYS = {
    PRODUCTS: 'icc_products_v1',
    RECORDS: 'icc_records_v1',
    SETTINGS: 'icc_settings_v1',
    SEQ: 'icc_seq_v1' // contador de secuencias por fecha+tipo
  };

  function _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error leyendo', key, e);
      return fallback;
    }
  }

  function _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error guardando', key, e);
      if (e && e.name === 'QuotaExceededError') {
        alert('No hay espacio suficiente para guardar. Genera un respaldo y limpia registros antiguos si es necesario.');
      }
      return false;
    }
  }

  // ---------- Productos ----------
  function getProducts() {
    return _read(KEYS.PRODUCTS, []);
  }

  function saveProducts(products) {
    return _write(KEYS.PRODUCTS, products);
  }

  function upsertProduct(product) {
    const products = getProducts();
    const idx = products.findIndex(p => p.nombre.trim().toLowerCase() === product.nombre.trim().toLowerCase());
    if (idx >= 0) {
      products[idx] = { ...products[idx], ...product, id: products[idx].id };
    } else {
      product.id = product.id || _uuid();
      products.push(product);
    }
    saveProducts(products);
    return product;
  }

  function findProduct(nombre) {
    const products = getProducts();
    return products.find(p => p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
  }

  function searchProducts(term) {
    const products = getProducts();
    if (!term) return products.slice(0, 50);
    const t = term.trim().toLowerCase();
    return products
      .filter(p => p.nombre.toLowerCase().includes(t))
      .sort((a, b) => a.nombre.toLowerCase().indexOf(t) - b.nombre.toLowerCase().indexOf(t))
      .slice(0, 50);
  }

  function deleteProduct(id) {
    const products = getProducts().filter(p => p.id !== id);
    saveProducts(products);
  }

  // ---------- Registros (entradas / cuentas de cobro) ----------
  function getRecords() {
    return _read(KEYS.RECORDS, []);
  }

  function saveRecords(records) {
    return _write(KEYS.RECORDS, records);
  }

  function getRecordById(llaveId) {
    return getRecords().find(r => r.id === llaveId);
  }

  function upsertRecord(record) {
    const records = getRecords();
    const idx = records.findIndex(r => r.id === record.id);
    record.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      records[idx] = record;
    } else {
      record.createdAt = record.createdAt || record.updatedAt;
      records.push(record);
    }
    saveRecords(records);
    return record;
  }

  function deleteRecord(llaveId) {
    const records = getRecords().filter(r => r.id !== llaveId);
    saveRecords(records);
  }

  function anularRecord(llaveId) {
    const records = getRecords();
    const rec = records.find(r => r.id === llaveId);
    if (rec) {
      rec.anulado = true;
      rec.updatedAt = new Date().toISOString();
      saveRecords(records);
    }
    return rec;
  }

  // ---------- Llave ID ----------
  // Formato: DD-MM-AA-Tipo-Secuencia  (ej: 07-11-26-Entrada-1)
  function nextLlaveId(fechaISO, tipo) {
    const d = new Date(fechaISO + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const aa = String(d.getFullYear()).slice(-2);
    const tipoLabel = tipo === 'entrada' ? 'Entrada' : 'Cuenta';
    const prefix = `${dd}-${mm}-${aa}-${tipoLabel}-`;
    const records = getRecords();
    let max = 0;
    records.forEach(r => {
      if (r.id && r.id.startsWith(prefix)) {
        const n = parseInt(r.id.substring(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return `${prefix}${max + 1}`;
  }

  // ---------- Configuración (datos encabezado cuenta de cobro) ----------
  function getSettings() {
    return _read(KEYS.SETTINGS, {
      companiaNombre: '',
      companiaNit: '',
      ciudad: '',
      debeA: '',
      debeACc: '',
      debeATel: '',
      debeADireccion: '',
      tema: 'rosa'
    });
  }

  function saveSettings(settings) {
    return _write(KEYS.SETTINGS, settings);
  }

  // ---------- Respaldo completo ----------
  function exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      products: getProducts(),
      records: getRecords(),
      settings: getSettings()
    };
  }

  function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('Archivo de respaldo inválido');
    if (Array.isArray(data.products)) saveProducts(data.products);
    if (Array.isArray(data.records)) saveRecords(data.records);
    if (data.settings) saveSettings(data.settings);
    return true;
  }

  function _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  return {
    getProducts, saveProducts, upsertProduct, findProduct, searchProducts, deleteProduct,
    getRecords, saveRecords, getRecordById, upsertRecord, deleteRecord, anularRecord,
    nextLlaveId, getSettings, saveSettings, exportAll, importAll, uuid: _uuid
  };
})();
