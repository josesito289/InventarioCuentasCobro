/* app.js — Lógica principal de la interfaz. */

(() => {
  'use strict';

  // ---------- Utilidades ----------
  function toast(msg, ms = 2600) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._h);
    toast._h = setTimeout(() => t.classList.remove('show'), ms);
  }

  function hoyISO() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function fmtMoney(n) { return NumToWords.formatoMoneda(n); }

  function fechaCorta(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  // ---------- Navegación de pestañas ----------
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activarTab(btn.dataset.tab));
  });

  function activarTab(id) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === id));
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  // ---------- Modal genérico ----------
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.remove('show');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
  });

  // ---------- Configuración ----------
  const btnSettings = document.getElementById('btnSettings');
  btnSettings.addEventListener('click', abrirSettings);

  function abrirSettings() {
    const s = DB.getSettings();
    document.getElementById('cfg_companiaNombre').value = s.companiaNombre || '';
    document.getElementById('cfg_companiaNit').value = s.companiaNit || '';
    document.getElementById('cfg_ciudad').value = s.ciudad || '';
    document.getElementById('cfg_debeA').value = s.debeA || '';
    document.getElementById('cfg_debeACc').value = s.debeACc || '';
    document.getElementById('cfg_debeATel').value = s.debeATel || '';
    document.getElementById('cfg_debeADireccion').value = s.debeADireccion || '';
    document.getElementById('modalSettings').classList.add('show');
  }

  document.getElementById('cfg_btnGuardar').addEventListener('click', () => {
    const s = {
      companiaNombre: document.getElementById('cfg_companiaNombre').value.trim(),
      companiaNit: document.getElementById('cfg_companiaNit').value.trim(),
      ciudad: document.getElementById('cfg_ciudad').value.trim(),
      debeA: document.getElementById('cfg_debeA').value.trim(),
      debeACc: document.getElementById('cfg_debeACc').value.trim(),
      debeATel: document.getElementById('cfg_debeATel').value.trim(),
      debeADireccion: document.getElementById('cfg_debeADireccion').value.trim()
    };
    DB.saveSettings(s);
    document.getElementById('modalSettings').classList.remove('show');
    toast('Configuración guardada.');
  });

  // ---------- Autocompletado genérico ----------
  function conectarAutocomplete(inputEl, listEl, onSelect) {
    inputEl.addEventListener('input', () => {
      const term = inputEl.value;
      const results = DB.searchProducts(term);
      renderAcList(listEl, results, onSelect, term);
    });
    inputEl.addEventListener('focus', () => {
      const results = DB.searchProducts(inputEl.value);
      renderAcList(listEl, results, onSelect, inputEl.value);
    });
    document.addEventListener('click', e => {
      if (!listEl.contains(e.target) && e.target !== inputEl) listEl.classList.remove('show');
    });
  }

  function renderAcList(listEl, results, onSelect, term) {
    listEl.innerHTML = '';
    if (results.length === 0) {
      listEl.innerHTML = `<div class="ac-empty">${term ? 'Sin coincidencias — se creará como nuevo' : 'Escribe para buscar...'}</div>`;
    } else {
      results.forEach(p => {
        const div = document.createElement('div');
        div.textContent = `${p.nombre} — ${fmtMoney(p.costoUnitario)}`;
        div.addEventListener('mousedown', ev => {
          ev.preventDefault();
          onSelect(p);
          listEl.classList.remove('show');
        });
        listEl.appendChild(div);
      });
    }
    listEl.classList.add('show');
  }

  // =======================================================================
  // PESTAÑA 1 — Registro de entradas / cuentas de cobro
  // =======================================================================
  const f1 = {
    fecha: document.getElementById('f1_fecha'),
    tipoEntrada: document.getElementById('f1_tipoEntrada'),
    tipoCuenta: document.getElementById('f1_tipoCuenta'),
    buscarProd: document.getElementById('f1_buscarProd'),
    acList: document.getElementById('f1_acList'),
    cantidad: document.getElementById('f1_cantidad'),
    costoUnit: document.getElementById('f1_costoUnit'),
    costoTotalItem: document.getElementById('f1_costoTotalItem'),
    btnAgregarItem: document.getElementById('f1_btnAgregarItem'),
    itemsList: document.getElementById('f1_itemsList'),
    llaveId: document.getElementById('f1_llaveId'),
    totalReg: document.getElementById('f1_totalReg'),
    btnGuardar: document.getElementById('f1_btnGuardar'),
    btnGenerarCuenta: document.getElementById('f1_btnGenerarCuenta'),
    btnRespaldoJson: document.getElementById('f1_btnRespaldoJson'),
    btnCargarJson: document.getElementById('f1_btnCargarJson'),
    inputJson: document.getElementById('f1_inputJson')
  };

  let f1State = { tipo: 'entrada', items: [], productoSel: null, lastSavedRecord: null };

  f1.fecha.value = hoyISO();

  function f1ActualizarLlavePreview() {
    f1.llaveId.textContent = DB.nextLlaveId(f1.fecha.value || hoyISO(), f1State.tipo);
  }

  f1.fecha.addEventListener('change', f1ActualizarLlavePreview);

  function f1SetTipo(tipo) {
    f1State.tipo = tipo;
    f1.tipoEntrada.classList.toggle('sel', tipo === 'entrada');
    f1.tipoCuenta.classList.toggle('sel', tipo === 'cuenta');
    f1ActualizarLlavePreview();
  }
  f1.tipoEntrada.addEventListener('click', () => f1SetTipo('entrada'));
  f1.tipoCuenta.addEventListener('click', () => f1SetTipo('cuenta'));

  conectarAutocomplete(f1.buscarProd, f1.acList, p => {
    f1State.productoSel = p;
    f1.buscarProd.value = p.nombre;
    f1.costoUnit.value = p.costoUnitario;
    f1RecalcularItemTotal();
  });

  function f1RecalcularItemTotal() {
    const c = parseFloat(f1.cantidad.value) || 0;
    const cu = parseFloat(f1.costoUnit.value) || 0;
    f1.costoTotalItem.value = fmtMoney(c * cu);
  }
  f1.cantidad.addEventListener('input', f1RecalcularItemTotal);
  f1.costoUnit.addEventListener('input', f1RecalcularItemTotal);

  f1.btnAgregarItem.addEventListener('click', () => {
    const nombre = f1.buscarProd.value.trim();
    const cantidad = parseFloat(f1.cantidad.value);
    const costoUnitario = parseFloat(f1.costoUnit.value);
    if (!nombre) { toast('Escribe o selecciona un producto.'); return; }
    if (!cantidad || cantidad <= 0) { toast('Indica una cantidad válida.'); return; }
    if (isNaN(costoUnitario) || costoUnitario < 0) { toast('Indica un costo unitario válido.'); return; }

    // Si el producto no existe aún en el catálogo, lo crea.
    if (!DB.findProduct(nombre)) {
      DB.upsertProduct({ nombre, costoUnitario });
    }

    f1State.items.push({
      producto: nombre,
      cantidad,
      costoUnitario,
      costoTotal: cantidad * costoUnitario
    });

    f1.buscarProd.value = '';
    f1.cantidad.value = '';
    f1.costoUnit.value = '';
    f1.costoTotalItem.value = fmtMoney(0);
    f1State.productoSel = null;
    f1RenderItems();
  });

  function f1RenderItems() {
    f1.itemsList.innerHTML = '';
    let total = 0;
    f1State.items.forEach((it, idx) => {
      total += it.costoTotal;
      const div = document.createElement('div');
      div.className = 'item-row';
      div.innerHTML = `
        <span class="nombre">${_esc(it.producto)}</span>
        <span>x${it.cantidad}</span>
        <span>${fmtMoney(it.costoTotal)}</span>
        <button class="del-btn" data-idx="${idx}">✕</button>`;
      div.querySelector('.del-btn').addEventListener('click', () => {
        f1State.items.splice(idx, 1);
        f1RenderItems();
      });
      f1.itemsList.appendChild(div);
    });
    f1.totalReg.textContent = fmtMoney(total);
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  f1.btnGuardar.addEventListener('click', () => {
    if (f1State.items.length === 0) { toast('Agrega al menos un producto al registro.'); return; }
    const fecha = f1.fecha.value || hoyISO();
    const llaveId = DB.nextLlaveId(fecha, f1State.tipo);
    const total = f1State.items.reduce((s, it) => s + it.costoTotal, 0);
    const record = {
      id: llaveId,
      fecha,
      tipo: f1State.tipo,
      items: f1State.items.map(it => ({ ...it })),
      total,
      anulado: false
    };
    DB.upsertRecord(record);
    f1State.lastSavedRecord = record;
    toast(`Registro guardado: ${llaveId}`);

    f1.btnGenerarCuenta.style.display = f1State.tipo === 'cuenta' ? 'flex' : 'none';

    f1State.items = [];
    f1RenderItems();
    f1ActualizarLlavePreview();
    refrescarListasGlobales();
  });

  f1.btnGenerarCuenta.addEventListener('click', () => {
    if (!f1State.lastSavedRecord) { toast('Primero guarda el registro.'); return; }
    const s = DB.getSettings();
    if (!s.debeA) { toast('Completa la configuración (⚙️) antes de generar la cuenta de cobro.'); abrirSettings(); return; }
    DocGen.descargarCuentaDeCobro(f1State.lastSavedRecord, s);
  });

  f1.btnRespaldoJson.addEventListener('click', () => {
    ImportExport.downloadBackupJson();
    toast('Respaldo JSON descargado.');
  });

  f1.btnCargarJson.addEventListener('click', () => f1.inputJson.click());
  f1.inputJson.addEventListener('change', async () => {
    const file = f1.inputJson.files[0];
    if (!file) return;
    if (!confirm('Esto reemplazará los productos y registros actuales con los del respaldo. ¿Continuar?')) {
      f1.inputJson.value = '';
      return;
    }
    try {
      await ImportExport.loadBackupFromFile(file);
      toast('Respaldo cargado correctamente.');
      refrescarListasGlobales();
      f1ActualizarLlavePreview();
    } catch (e) {
      console.error(e);
      toast('No se pudo leer el archivo de respaldo.');
    }
    f1.inputJson.value = '';
  });

  f1ActualizarLlavePreview();

  // =======================================================================
  // PESTAÑA 1 — Sección 2: Productos
  // =======================================================================
  const f2 = {
    btnCargarCsv: document.getElementById('f2_btnCargarCsv'),
    inputCsv: document.getElementById('f2_inputCsv'),
    btnPlantilla: document.getElementById('f2_btnPlantilla'),
    nombreProd: document.getElementById('f2_nombreProd'),
    acList: document.getElementById('f2_acList'),
    costoProd: document.getElementById('f2_costoProd'),
    subNombre: document.getElementById('f2_subNombre'),
    subCant: document.getElementById('f2_subCant'),
    subCosto: document.getElementById('f2_subCosto'),
    btnGuardarProd: document.getElementById('f2_btnGuardarProd')
  };

  f2.btnCargarCsv.addEventListener('click', () => f2.inputCsv.click());
  f2.inputCsv.addEventListener('change', async () => {
    const file = f2.inputCsv.files[0];
    if (!file) return;
    try {
      const count = await ImportExport.importProductsFromFile(file);
      toast(`${count} producto(s) importado(s)/actualizado(s).`);
      refrescarListasGlobales();
    } catch (e) {
      console.error(e);
      toast('Error al importar: ' + e.message);
    }
    f2.inputCsv.value = '';
  });

  f2.btnPlantilla.addEventListener('click', () => ImportExport.downloadTemplateCsv());

  let f2ProductoExistente = null;
  conectarAutocomplete(f2.nombreProd, f2.acList, p => {
    f2ProductoExistente = p;
    f2.nombreProd.value = p.nombre;
    f2.costoProd.value = p.costoUnitario;
    f2.subNombre.value = p.subproducto || '';
    f2.subCant.value = p.cantidadSubproducto ?? '';
    f2.subCosto.value = p.costoUnitarioSubproducto ?? '';
  });
  f2.nombreProd.addEventListener('input', () => { f2ProductoExistente = null; });

  f2.btnGuardarProd.addEventListener('click', () => {
    const nombre = f2.nombreProd.value.trim();
    const costo = parseFloat(f2.costoProd.value);
    if (!nombre) { toast('Escribe el nombre del producto.'); return; }
    if (isNaN(costo) || costo < 0) { toast('Indica un costo unitario válido.'); return; }
    DB.upsertProduct({
      nombre,
      costoUnitario: costo,
      subproducto: f2.subNombre.value.trim(),
      cantidadSubproducto: f2.subCant.value !== '' ? parseFloat(f2.subCant.value) : null,
      costoUnitarioSubproducto: f2.subCosto.value !== '' ? parseFloat(f2.subCosto.value) : null
    });
    toast('Producto guardado.');
    f2.nombreProd.value = ''; f2.costoProd.value = '';
    f2.subNombre.value = ''; f2.subCant.value = ''; f2.subCosto.value = '';
    f2ProductoExistente = null;
    refrescarListasGlobales();
  });

  // =======================================================================
  // PESTAÑA 2 — Consultar / Modificar / Histórico
  // =======================================================================
  const f3 = {
    buscarLlave: document.getElementById('f3_buscarLlave'),
    listaLlaves: document.getElementById('f3_listaLlaves'),
    formEdicion: document.getElementById('f3_formEdicion'),
    vacio: document.getElementById('f3_vacio'),
    fecha: document.getElementById('f3_fecha'),
    tipo: document.getElementById('f3_tipo'),
    itemsList: document.getElementById('f3_itemsList'),
    buscarProd: document.getElementById('f3_buscarProd'),
    acList: document.getElementById('f3_acList'),
    cantidadNueva: document.getElementById('f3_cantidadNueva'),
    btnAgregarItem: document.getElementById('f3_btnAgregarItem'),
    totalReg: document.getElementById('f3_totalReg'),
    btnGuardarMod: document.getElementById('f3_btnGuardarMod'),
    btnAnular: document.getElementById('f3_btnAnular'),
    tablaHistorico: document.getElementById('f3_tablaHistorico'),
    histVacio: document.getElementById('f3_histVacio')
  };

  let f3State = { record: null, items: [], productoSel: null };

  function f3ActualizarListaLlaves() {
    const records = DB.getRecords().slice().sort((a, b) => (b.id > a.id ? 1 : -1));
    f3.listaLlaves.innerHTML = records.map(r => `<option value="${_esc(r.id)}">`).join('');
  }

  f3.buscarLlave.addEventListener('change', () => f3CargarRegistro(f3.buscarLlave.value.trim()));
  f3.buscarLlave.addEventListener('keydown', e => {
    if (e.key === 'Enter') f3CargarRegistro(f3.buscarLlave.value.trim());
  });

  function f3CargarRegistro(llaveId) {
    const rec = DB.getRecordById(llaveId);
    if (!rec) { toast('No se encontró ese registro.'); return; }
    f3State.record = rec;
    f3State.items = rec.items.map(it => ({ ...it }));
    f3.fecha.value = rec.fecha;
    f3.tipo.value = rec.tipo === 'entrada' ? 'Entrada' : 'Cuenta de cobro (Salida)' + (rec.anulado ? ' — ANULADO' : '');
    f3.formEdicion.style.display = 'block';
    f3.vacio.style.display = 'none';
    f3RenderItems();
    activarTab('tab2');
  }

  conectarAutocomplete(f3.buscarProd, f3.acList, p => {
    f3State.productoSel = p;
    f3.buscarProd.value = p.nombre;
  });

  f3.btnAgregarItem.addEventListener('click', () => {
    const nombre = f3.buscarProd.value.trim();
    const cantidad = parseFloat(f3.cantidadNueva.value);
    if (!nombre) { toast('Escribe o selecciona un producto.'); return; }
    if (!cantidad || cantidad <= 0) { toast('Indica una cantidad válida.'); return; }
    const prod = DB.findProduct(nombre);
    const costoUnitario = prod ? prod.costoUnitario : 0;
    f3State.items.push({ producto: nombre, cantidad, costoUnitario, costoTotal: cantidad * costoUnitario });
    f3.buscarProd.value = '';
    f3.cantidadNueva.value = '';
    f3RenderItems();
  });

  function f3RenderItems() {
    f3.itemsList.innerHTML = '';
    let total = 0;
    f3State.items.forEach((it, idx) => {
      total += it.costoTotal;
      const div = document.createElement('div');
      div.className = 'item-row';
      div.style.gridTemplateColumns = '1.4fr 0.6fr 0.8fr 0.8fr auto';
      div.innerHTML = `
        <input type="text" value="${_escAttr(it.producto)}" data-f="producto" data-idx="${idx}" style="width:100%;border:1px solid var(--gray-200);border-radius:6px;padding:4px 6px;">
        <input type="number" value="${it.cantidad}" min="0" step="any" data-f="cantidad" data-idx="${idx}" style="width:100%;border:1px solid var(--gray-200);border-radius:6px;padding:4px 6px;">
        <input type="number" value="${it.costoUnitario}" min="0" step="any" data-f="costoUnitario" data-idx="${idx}" style="width:100%;border:1px solid var(--gray-200);border-radius:6px;padding:4px 6px;">
        <span>${fmtMoney(it.costoTotal)}</span>
        <button class="del-btn" data-idx="${idx}">✕</button>`;
      f3.itemsList.appendChild(div);
    });
    f3.totalReg.textContent = fmtMoney(total);

    f3.itemsList.querySelectorAll('input[data-f]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.idx, 10);
        const campo = inp.dataset.f;
        const item = f3State.items[idx];
        if (campo === 'cantidad' || campo === 'costoUnitario') {
          item[campo] = parseFloat(inp.value) || 0;
          item.costoTotal = item.cantidad * item.costoUnitario;
        } else {
          item[campo] = inp.value;
        }
        f3RenderItems();
      });
    });
    f3.itemsList.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        f3State.items.splice(parseInt(btn.dataset.idx, 10), 1);
        f3RenderItems();
      });
    });
  }

  function _escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

  f3.btnGuardarMod.addEventListener('click', () => {
    if (!f3State.record) return;
    if (f3State.items.length === 0) { toast('El registro debe tener al menos un producto.'); return; }
    const total = f3State.items.reduce((s, it) => s + it.costoTotal, 0);
    const updated = {
      ...f3State.record,
      fecha: f3.fecha.value || f3State.record.fecha,
      items: f3State.items,
      total
    };
    DB.upsertRecord(updated);
    f3State.record = updated;
    toast('Modificación guardada.');
    refrescarListasGlobales();
  });

  f3.btnAnular.addEventListener('click', () => {
    if (!f3State.record) return;
    if (!confirm(`¿Anular el registro ${f3State.record.id}? Esta acción se puede revertir luego manualmente desde el histórico.`)) return;
    DB.anularRecord(f3State.record.id);
    toast('Registro anulado.');
    f3.formEdicion.style.display = 'none';
    f3.vacio.style.display = 'block';
    f3State.record = null;
    refrescarListasGlobales();
  });

  function f3RenderHistorico() {
    const records = DB.getRecords().slice().sort((a, b) => (b.id > a.id ? 1 : a.id > b.id ? -1 : 0));
    f3.tablaHistorico.innerHTML = '';
    let filas = 0;
    records.forEach(rec => {
      rec.items.forEach(it => {
        filas++;
        const tr = document.createElement('tr');
        tr.className = (rec.tipo === 'entrada' ? 'entrada' : 'cuenta') + (rec.anulado ? ' anulado' : '');
        tr.innerHTML = `
          <td>${_esc(rec.id)}</td>
          <td>${fechaCorta(rec.fecha)}</td>
          <td class="tipo"><span class="chip ${rec.tipo}">${rec.tipo === 'entrada' ? 'Entrada' : 'Cuenta'}</span></td>
          <td>${_esc(it.producto)}</td>
          <td>${it.cantidad}</td>
          <td>${fmtMoney(it.costoUnitario)}</td>
          <td>${fmtMoney(it.costoTotal)}</td>
          <td><button class="btn btn-sm btn-ghost mod-btn" data-id="${_escAttr(rec.id)}">ModificarReg</button></td>`;
        f3.tablaHistorico.appendChild(tr);
      });
    });
    f3.histVacio.style.display = filas === 0 ? 'block' : 'none';
    f3.tablaHistorico.querySelectorAll('.mod-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        f3.buscarLlave.value = btn.dataset.id;
        f3CargarRegistro(btn.dataset.id);
      });
    });
  }

  // =======================================================================
  // PESTAÑA 3 — Historial de productos
  // =======================================================================
  const f4 = {
    btnFiltrar: document.getElementById('f4_btnFiltrar'),
    chips: document.getElementById('f4_chips'),
    tabla: document.getElementById('f4_tabla'),
    vacio: document.getElementById('f4_vacio')
  };

  let f4Seleccion = new Set();
  let f4ChipsVisibles = false;

  f4.btnFiltrar.addEventListener('click', () => {
    f4ChipsVisibles = !f4ChipsVisibles;
    f4.chips.style.display = f4ChipsVisibles ? 'flex' : 'none';
    if (f4ChipsVisibles) f4RenderChips();
  });

  function f4RenderChips() {
    const productos = DB.getProducts().map(p => p.nombre).sort((a, b) => a.localeCompare(b));
    f4.chips.innerHTML = '';
    productos.forEach(nombre => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip' + (f4Seleccion.has(nombre) ? ' sel' : '');
      chip.textContent = nombre;
      chip.addEventListener('click', () => {
        if (f4Seleccion.has(nombre)) f4Seleccion.delete(nombre);
        else f4Seleccion.add(nombre);
        f4RenderChips();
        f4RenderTabla();
      });
      f4.chips.appendChild(chip);
    });
  }

  function f4RenderTabla() {
    const records = DB.getRecords().slice().sort((a, b) => (b.id > a.id ? 1 : a.id > b.id ? -1 : 0));
    f4.tabla.innerHTML = '';
    let filas = 0;
    records.forEach(rec => {
      rec.items.forEach(it => {
        if (f4Seleccion.size > 0 && !f4Seleccion.has(it.producto)) return;
        filas++;
        const tr = document.createElement('tr');
        tr.className = (rec.tipo === 'entrada' ? 'entrada' : 'cuenta') + (rec.anulado ? ' anulado' : '');
        tr.innerHTML = `
          <td>${_esc(it.producto)}</td>
          <td>${it.cantidad}</td>
          <td>${fmtMoney(it.costoUnitario)}</td>
          <td>${fmtMoney(it.costoTotal)}</td>
          <td>${fechaCorta(rec.fecha)}</td>
          <td class="tipo"><span class="chip ${rec.tipo}">${rec.tipo === 'entrada' ? 'Entrada' : 'Cuenta'}</span></td>
          <td>${_esc(rec.id)}</td>`;
        f4.tabla.appendChild(tr);
      });
    });
    f4.vacio.style.display = filas === 0 ? 'block' : 'none';
  }

  // ---------- Refrescos globales ----------
  function refrescarListasGlobales() {
    f3ActualizarListaLlaves();
    f3RenderHistorico();
    f4RenderTabla();
    if (f4ChipsVisibles) f4RenderChips();
  }

  refrescarListasGlobales();

  // ---------- Registro del Service Worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.error('SW error:', err));
    });
  }
})();
