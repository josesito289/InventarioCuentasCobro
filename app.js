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

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function _escAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }

  function numVal(el) {
    return parseFloat(String(el.value).replace(',', '.')) || 0;
  }

  // ---------- Corrección del bug de "cero extra" en Android (Moto G24) ----------
  // Los <input type="number"> en Chrome/Android (y en especial en algunos
  // teclados de Motorola) tienen un bug conocido donde se duplica una tecla
  // al escribir, agregando dígitos de más (ej. 15000 -> 150000). La solución
  // recomendada es usar <input type="text" inputmode="decimal"> en vez del
  // input numérico nativo, y filtrar en JS cualquier carácter no numérico.
  function attachNumericGuard(el) {
    if (!el || el._numGuardAttached) return;
    el._numGuardAttached = true;
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('spellcheck', 'false');
    el.addEventListener('input', () => {
      const original = el.value;
      let v = original.replace(/,/g, '.');
      v = v.replace(/[^0-9.]/g, '');
      const firstDot = v.indexOf('.');
      if (firstDot >= 0) {
        v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
      }
      if (v !== original) {
        const pos = el.selectionStart;
        el.value = v;
        try { el.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
      }
    });
  }

  function initNumericGuards(root = document) {
    root.querySelectorAll('.num-input').forEach(attachNumericGuard);
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

  // =======================================================================
  // CONFIGURACIÓN (⚙️) — Compañías + datos de quien cobra
  // =======================================================================
  const btnSettings = document.getElementById('btnSettings');
  btnSettings.addEventListener('click', abrirSettings);

  let cfgCompaniaEditandoId = null;

  function abrirSettings() {
    const s = DB.getSettings();
    document.getElementById('cfg_ciudad').value = s.ciudad || '';
    document.getElementById('cfg_debeA').value = s.debeA || '';
    document.getElementById('cfg_debeACc').value = s.debeACc || '';
    document.getElementById('cfg_debeATel').value = s.debeATel || '';
    document.getElementById('cfg_debeADireccion').value = s.debeADireccion || '';
    cfgCompaniaEditandoId = null;
    document.getElementById('cfg_nuevaCompaniaNombre').value = '';
    document.getElementById('cfg_nuevaCompaniaNit').value = '';
    cfgRenderCompanias();
    document.getElementById('modalSettings').classList.add('show');
  }

  function cfgRenderCompanias() {
    const cont = document.getElementById('cfg_listaCompanias');
    const companies = DB.getCompanies();
    cont.innerHTML = '';
    if (companies.length === 0) {
      cont.innerHTML = '<div class="empty-state" style="padding:10px;">Aún no has registrado compañías.</div>';
      return;
    }
    companies.forEach(c => {
      const row = document.createElement('div');
      row.className = 'company-row';
      row.innerHTML = `
        <div>
          <div class="nombre">${_esc(c.nombre)}</div>
          <div class="nit">NIT ${_esc(c.nit || '—')}</div>
        </div>
        <div class="acciones">
          <button title="Editar" data-edit="${_escAttr(c.id)}">✏️</button>
          <button title="Eliminar" data-del="${_escAttr(c.id)}">🗑️</button>
        </div>`;
      cont.appendChild(row);
    });
    cont.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = DB.findCompanyById(btn.dataset.edit);
        if (!c) return;
        cfgCompaniaEditandoId = c.id;
        document.getElementById('cfg_nuevaCompaniaNombre').value = c.nombre;
        document.getElementById('cfg_nuevaCompaniaNit').value = c.nit || '';
      });
    });
    cont.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('¿Eliminar esta compañía? Los registros ya guardados conservan el nombre histórico.')) return;
        DB.deleteCompany(btn.dataset.del);
        cfgRenderCompanias();
        refrescarCompanias();
      });
    });
  }

  document.getElementById('cfg_btnAgregarCompania').addEventListener('click', () => {
    const nombre = document.getElementById('cfg_nuevaCompaniaNombre').value.trim();
    const nit = document.getElementById('cfg_nuevaCompaniaNit').value.trim();
    if (!nombre) { toast('Escribe el nombre de la compañía.'); return; }
    DB.upsertCompany({ id: cfgCompaniaEditandoId || undefined, nombre, nit });
    cfgCompaniaEditandoId = null;
    document.getElementById('cfg_nuevaCompaniaNombre').value = '';
    document.getElementById('cfg_nuevaCompaniaNit').value = '';
    cfgRenderCompanias();
    refrescarCompanias();
    toast('Compañía guardada.');
  });

  document.getElementById('cfg_btnGuardar').addEventListener('click', () => {
    const s = {
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

  // ---------- Autocompletado genérico (productos) ----------
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
  // PESTAÑA 1 — Sección 0: Saldos por tercero
  // =======================================================================
  const f0 = {
    tercero: document.getElementById('f0_tercero'),
    totalPendiente: document.getElementById('f0_totalPendiente'),
    totalCompras: document.getElementById('f0_totalCompras')
  };

  function f0PoblarTerceros() {
    const companies = DB.getCompanies();
    const current = f0.tercero.value;
    f0.tercero.innerHTML = '<option value="">— Selecciona un tercero —</option>' +
      companies.map(c => `<option value="${_escAttr(c.id)}">${_esc(c.nombre)}</option>`).join('');
    if (companies.some(c => c.id === current)) f0.tercero.value = current;
    f0Actualizar();
  }

  function f0Actualizar() {
    const id = f0.tercero.value;
    if (!id) {
      f0.totalPendiente.value = fmtMoney(0);
      f0.totalCompras.value = fmtMoney(0);
      return;
    }
    const { totalPendiente, totalCompras } = DB.saldosPorTercero(id);
    f0.totalPendiente.value = fmtMoney(totalPendiente);
    f0.totalCompras.value = fmtMoney(totalCompras);
  }

  f0.tercero.addEventListener('change', f0Actualizar);

  // ---------- Refresco compartido de listas de compañías ----------
  function refrescarCompanias() {
    f1PoblarCompanias();
    f0PoblarTerceros();
    if (typeof f3State !== 'undefined' && f3State.record && f3State.record.tipo === 'cuenta') {
      f3PoblarTerceroCompania(f3.terceroCompania.value || f3State.record.companiaId);
    }
  }

  // =======================================================================
  // PESTAÑA 1 — Sección 1: Registro de entradas / cuentas de cobro
  // =======================================================================
  const f1 = {
    fecha: document.getElementById('f1_fecha'),
    tipoEntrada: document.getElementById('f1_tipoEntrada'),
    tipoCuenta: document.getElementById('f1_tipoCuenta'),
    companiaWrap: document.getElementById('f1_companiaWrap'),
    compania: document.getElementById('f1_compania'),
    companiaNuevaWrap: document.getElementById('f1_companiaNuevaWrap'),
    companiaNuevaNombre: document.getElementById('f1_companiaNuevaNombre'),
    companiaNuevaNit: document.getElementById('f1_companiaNuevaNit'),
    btnGuardarCompaniaNueva: document.getElementById('f1_btnGuardarCompaniaNueva'),
    estadoWrap: document.getElementById('f1_estadoWrap'),
    estado: document.getElementById('f1_estado'),
    abonoWrap: document.getElementById('f1_abonoWrap'),
    abono: document.getElementById('f1_abono'),
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

  function f1PoblarCompanias() {
    const companies = DB.getCompanies();
    const current = f1.compania.value;
    f1.compania.innerHTML = '<option value="">— Selecciona una compañía —</option>' +
      companies.map(c => `<option value="${_escAttr(c.id)}">${_esc(c.nombre)}</option>`).join('') +
      '<option value="__nueva__">➕ Nueva compañía...</option>';
    if (companies.some(c => c.id === current)) f1.compania.value = current;
  }

  function f1ActualizarAbonoVisibilidad() {
    f1.abonoWrap.style.display = f1.estado.value === 'pago_parcial' ? 'block' : 'none';
  }

  function f1ActualizarVisibilidadCuenta() {
    const esCuenta = f1State.tipo === 'cuenta';
    f1.companiaWrap.style.display = esCuenta ? 'block' : 'none';
    f1.estadoWrap.style.display = esCuenta ? 'block' : 'none';
    if (!esCuenta) {
      f1.abonoWrap.style.display = 'none';
      f1.companiaNuevaWrap.style.display = 'none';
      f1.btnGuardarCompaniaNueva.style.display = 'none';
    } else {
      f1ActualizarAbonoVisibilidad();
    }
  }

  f1.estado.addEventListener('change', f1ActualizarAbonoVisibilidad);

  f1.compania.addEventListener('change', () => {
    const esNueva = f1.compania.value === '__nueva__';
    f1.companiaNuevaWrap.style.display = esNueva ? 'grid' : 'none';
    f1.btnGuardarCompaniaNueva.style.display = esNueva ? 'flex' : 'none';
  });

  f1.btnGuardarCompaniaNueva.addEventListener('click', () => {
    const nombre = f1.companiaNuevaNombre.value.trim();
    const nit = f1.companiaNuevaNit.value.trim();
    if (!nombre) { toast('Escribe el nombre de la compañía.'); return; }
    const c = DB.upsertCompany({ nombre, nit });
    refrescarCompanias();
    f1.compania.value = c.id;
    f1.companiaNuevaWrap.style.display = 'none';
    f1.btnGuardarCompaniaNueva.style.display = 'none';
    f1.companiaNuevaNombre.value = '';
    f1.companiaNuevaNit.value = '';
    toast('Compañía guardada.');
  });

  function f1SetTipo(tipo) {
    f1State.tipo = tipo;
    f1.tipoEntrada.classList.toggle('sel', tipo === 'entrada');
    f1.tipoCuenta.classList.toggle('sel', tipo === 'cuenta');
    f1ActualizarVisibilidadCuenta();
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
    const c = numVal(f1.cantidad);
    const cu = numVal(f1.costoUnit);
    f1.costoTotalItem.value = fmtMoney(c * cu);
  }
  f1.cantidad.addEventListener('input', f1RecalcularItemTotal);
  f1.costoUnit.addEventListener('input', f1RecalcularItemTotal);

  f1.btnAgregarItem.addEventListener('click', () => {
    const nombre = f1.buscarProd.value.trim();
    const cantidad = numVal(f1.cantidad);
    const costoUnitario = numVal(f1.costoUnit);
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

  f1.btnGuardar.addEventListener('click', () => {
    if (f1State.items.length === 0) { toast('Agrega al menos un producto al registro.'); return; }
    const settings = DB.getSettings();
    const fecha = f1.fecha.value || hoyISO();
    const total = f1State.items.reduce((s, it) => s + it.costoTotal, 0);

    let companiaId = null;
    let tercero = '';

    if (f1State.tipo === 'cuenta') {
      companiaId = f1.compania.value;
      if (!companiaId || companiaId === '__nueva__') {
        toast('Selecciona (o crea) la compañía a la que va dirigida la cuenta de cobro.');
        return;
      }
      const comp = DB.findCompanyById(companiaId);
      tercero = comp ? comp.nombre : '';
    } else {
      tercero = settings.debeA || '';
    }

    const llaveId = DB.nextLlaveId(fecha, f1State.tipo);
    const record = {
      id: llaveId,
      fecha,
      tipo: f1State.tipo,
      items: f1State.items.map(it => ({ ...it })),
      total,
      anulado: false,
      tercero
    };

    if (f1State.tipo === 'cuenta') {
      record.companiaId = companiaId;
      const estado = f1.estado.value;
      const abono = numVal(f1.abono);
      Object.assign(record, DB.calcularEstadoRegistro({ estado, total, abono, fechaPagoAnterior: null, estadoAnterior: null }));
    }

    DB.upsertRecord(record);
    f1State.lastSavedRecord = record;
    toast(`Registro guardado: ${llaveId}`);

    f1.btnGenerarCuenta.style.display = f1State.tipo === 'cuenta' ? 'flex' : 'none';

    f1State.items = [];
    f1RenderItems();
    f1.estado.value = 'pendiente';
    f1.abono.value = '';
    f1.compania.value = '';
    f1.companiaNuevaWrap.style.display = 'none';
    f1.btnGuardarCompaniaNueva.style.display = 'none';
    f1ActualizarAbonoVisibilidad();
    f1ActualizarLlavePreview();
    refrescarListasGlobales();
  });

  f1.btnGenerarCuenta.addEventListener('click', () => {
    if (!f1State.lastSavedRecord) { toast('Primero guarda el registro.'); return; }
    const s = DB.getSettings();
    if (!s.debeA) { toast('Completa la configuración (⚙️) antes de generar la cuenta de cobro.'); abrirSettings(); return; }
    const comp = DB.findCompanyById(f1State.lastSavedRecord.companiaId);
    DocGen.descargarCuentaDeCobro(f1State.lastSavedRecord, comp, s);
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

  f1ActualizarVisibilidadCuenta();
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
    const costo = numVal(f2.costoProd);
    if (!nombre) { toast('Escribe el nombre del producto.'); return; }
    if (isNaN(costo) || costo < 0) { toast('Indica un costo unitario válido.'); return; }
    DB.upsertProduct({
      nombre,
      costoUnitario: costo,
      subproducto: f2.subNombre.value.trim(),
      cantidadSubproducto: f2.subCant.value !== '' ? numVal(f2.subCant) : null,
      costoUnitarioSubproducto: f2.subCosto.value !== '' ? numVal(f2.subCosto) : null
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
    terceroCompania: document.getElementById('f3_terceroCompania'),
    terceroTexto: document.getElementById('f3_terceroTexto'),
    itemsList: document.getElementById('f3_itemsList'),
    buscarProd: document.getElementById('f3_buscarProd'),
    acList: document.getElementById('f3_acList'),
    cantidadNueva: document.getElementById('f3_cantidadNueva'),
    btnAgregarItem: document.getElementById('f3_btnAgregarItem'),
    totalReg: document.getElementById('f3_totalReg'),
    estadoWrap: document.getElementById('f3_estadoWrap'),
    estado: document.getElementById('f3_estado'),
    abonoWrap: document.getElementById('f3_abonoWrap'),
    abono: document.getElementById('f3_abono'),
    saldoWrap: document.getElementById('f3_saldoWrap'),
    saldo: document.getElementById('f3_saldo'),
    fechaPago: document.getElementById('f3_fechaPago'),
    btnDescargar: document.getElementById('f3_btnDescargar'),
    btnGuardarMod: document.getElementById('f3_btnGuardarMod'),
    btnAnular: document.getElementById('f3_btnAnular'),
    tablaHistorico: document.getElementById('f3_tablaHistorico'),
    histVacio: document.getElementById('f3_histVacio')
  };

  let f3State = { record: null, items: [], productoSel: null };

  function f3ActualizarListaLlaves() {
    const records = DB.getRecords().slice().sort((a, b) => (b.id > a.id ? 1 : -1));
    f3.listaLlaves.innerHTML = records.map(r => `<option value="${_escAttr(r.id)}">`).join('');
  }

  f3.buscarLlave.addEventListener('change', () => f3CargarRegistro(f3.buscarLlave.value.trim()));
  f3.buscarLlave.addEventListener('keydown', e => {
    if (e.key === 'Enter') f3CargarRegistro(f3.buscarLlave.value.trim());
  });

  function f3ActualizarSaldoPreview() {
    if (!f3State.record || f3State.record.tipo !== 'cuenta') return;
    const total = f3State.items.reduce((s, it) => s + it.costoTotal, 0);
    const estado = f3.estado.value;
    const abono = numVal(f3.abono);
    const calc = DB.calcularEstadoRegistro({
      estado, total, abono,
      fechaPagoAnterior: f3State.record.fechaPago,
      estadoAnterior: f3State.record.estado
    });
    f3.saldo.value = fmtMoney(calc.saldo);
    f3.fechaPago.value = calc.fechaPago ? fechaCorta(calc.fechaPago) : '—';
  }

  f3.estado.addEventListener('change', () => {
    f3.abonoWrap.style.display = f3.estado.value === 'pago_parcial' ? 'block' : 'none';
    f3ActualizarSaldoPreview();
  });
  f3.abono.addEventListener('input', f3ActualizarSaldoPreview);

  function f3PoblarTerceroCompania(companiaIdActual) {
    const companies = DB.getCompanies();
    f3.terceroCompania.innerHTML = '<option value="">— Selecciona una compañía —</option>' +
      companies.map(c => `<option value="${_escAttr(c.id)}">${_esc(c.nombre)}</option>`).join('');
    if (companiaIdActual && companies.some(c => c.id === companiaIdActual)) {
      f3.terceroCompania.value = companiaIdActual;
    }
  }

  function f3CargarRegistro(llaveId) {
    const rec = DB.getRecordById(llaveId);
    if (!rec) { toast('No se encontró ese registro.'); return; }
    f3State.record = rec;
    f3State.items = rec.items.map(it => ({ ...it }));
    f3.fecha.value = rec.fecha;
    f3.tipo.value = (rec.tipo === 'entrada' ? 'Entrada' : 'Cuenta de cobro (Salida)') + (rec.anulado ? ' — ANULADO' : '');

    const esCuenta = rec.tipo === 'cuenta';
    f3.terceroCompania.style.display = esCuenta ? 'block' : 'none';
    f3.terceroTexto.style.display = esCuenta ? 'none' : 'block';
    if (esCuenta) {
      f3PoblarTerceroCompania(rec.companiaId);
    } else {
      f3.terceroTexto.value = rec.tercero || DB.getSettings().debeA || '';
    }
    f3.estadoWrap.style.display = esCuenta ? 'block' : 'none';
    f3.saldoWrap.style.display = esCuenta ? 'flex' : 'none';
    f3.btnDescargar.style.display = esCuenta ? 'flex' : 'none';

    if (esCuenta) {
      const estado = rec.estado || 'pendiente';
      f3.estado.value = estado;
      f3.abono.value = rec.abono || '';
      f3.abonoWrap.style.display = estado === 'pago_parcial' ? 'block' : 'none';
      f3.saldo.value = fmtMoney(rec.saldo != null ? rec.saldo : rec.total);
      f3.fechaPago.value = rec.fechaPago ? fechaCorta(rec.fechaPago) : '—';
    } else {
      f3.abonoWrap.style.display = 'none';
    }

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
    const cantidad = numVal(f3.cantidadNueva);
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
        <input type="text" class="num-input" value="${it.cantidad}" data-f="cantidad" data-idx="${idx}" style="width:100%;border:1px solid var(--gray-200);border-radius:6px;padding:4px 6px;">
        <input type="text" class="num-input" value="${it.costoUnitario}" data-f="costoUnitario" data-idx="${idx}" style="width:100%;border:1px solid var(--gray-200);border-radius:6px;padding:4px 6px;">
        <span>${fmtMoney(it.costoTotal)}</span>
        <button class="del-btn" data-idx="${idx}">✕</button>`;
      f3.itemsList.appendChild(div);
    });
    f3.totalReg.textContent = fmtMoney(total);

    f3.itemsList.querySelectorAll('input.num-input').forEach(attachNumericGuard);

    f3.itemsList.querySelectorAll('input[data-f]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.idx, 10);
        const campo = inp.dataset.f;
        const item = f3State.items[idx];
        if (campo === 'cantidad' || campo === 'costoUnitario') {
          item[campo] = numVal(inp);
          item.costoTotal = item.cantidad * item.costoUnitario;
          f3.totalReg.textContent = fmtMoney(f3State.items.reduce((s, it) => s + it.costoTotal, 0));
          f3ActualizarSaldoPreview();
        } else {
          item[campo] = inp.value;
        }
      });
    });
    f3.itemsList.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        f3State.items.splice(parseInt(btn.dataset.idx, 10), 1);
        f3RenderItems();
        f3ActualizarSaldoPreview();
      });
    });
  }

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
    if (updated.tipo === 'cuenta') {
      const companiaId = f3.terceroCompania.value;
      if (!companiaId) { toast('Selecciona la compañía (tercero) de esta cuenta de cobro.'); return; }
      const comp = DB.findCompanyById(companiaId);
      updated.companiaId = companiaId;
      updated.tercero = comp ? comp.nombre : updated.tercero;

      const estado = f3.estado.value;
      const abono = numVal(f3.abono);
      Object.assign(updated, DB.calcularEstadoRegistro({
        estado, total, abono,
        fechaPagoAnterior: f3State.record.fechaPago,
        estadoAnterior: f3State.record.estado
      }));
    } else {
      updated.tercero = f3.terceroTexto.value.trim();
    }
    DB.upsertRecord(updated);
    f3State.record = updated;
    if (updated.tipo === 'cuenta') {
      f3.saldo.value = fmtMoney(updated.saldo);
      f3.fechaPago.value = updated.fechaPago ? fechaCorta(updated.fechaPago) : '—';
    }
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

  f3.btnDescargar.addEventListener('click', () => {
    if (!f3State.record || f3State.record.tipo !== 'cuenta') return;
    const settings = DB.getSettings();
    if (!settings.debeA) { toast('Completa la configuración (⚙️) antes de descargar la cuenta de cobro.'); abrirSettings(); return; }
    const comp = DB.findCompanyById(f3State.record.companiaId);
    DocGen.descargarCuentaDeCobro(f3State.record, comp, settings);
  });

  // ---------- Filtro por tercero (histórico) ----------
  let f3TerceroSeleccion = new Set();
  let f3ChipsTerceroVisibles = false;
  const f3BtnFiltrarTercero = document.getElementById('f3_btnFiltrarTercero');
  const f3ChipsTercero = document.getElementById('f3_chipsTercero');

  f3BtnFiltrarTercero.addEventListener('click', () => {
    f3ChipsTerceroVisibles = !f3ChipsTerceroVisibles;
    f3ChipsTercero.style.display = f3ChipsTerceroVisibles ? 'flex' : 'none';
    if (f3ChipsTerceroVisibles) f3RenderChipsTercero();
  });

  function f3RenderChipsTercero() {
    const terceros = Array.from(new Set(DB.getRecords().map(r => r.tercero).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    f3ChipsTercero.innerHTML = '';
    terceros.forEach(t => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip' + (f3TerceroSeleccion.has(t) ? ' sel' : '');
      chip.textContent = t;
      chip.addEventListener('click', () => {
        if (f3TerceroSeleccion.has(t)) f3TerceroSeleccion.delete(t);
        else f3TerceroSeleccion.add(t);
        f3RenderChipsTercero();
        f3RenderHistorico();
      });
      f3ChipsTercero.appendChild(chip);
    });
  }

  function f3RenderHistorico() {
    const records = DB.getRecords().slice().sort((a, b) => (b.id > a.id ? 1 : a.id > b.id ? -1 : 0));
    f3.tablaHistorico.innerHTML = '';
    let filas = 0;
    records.forEach(rec => {
      if (f3TerceroSeleccion.size > 0 && !f3TerceroSeleccion.has(rec.tercero)) return;
      const esCuenta = rec.tipo === 'cuenta';
      const estadoVal = rec.estado || 'pendiente';
      const estadoLabel = DB.ESTADO_LABELS[estadoVal] || estadoVal;
      const saldoTxt = esCuenta ? fmtMoney(rec.saldo != null ? rec.saldo : rec.total) : '—';
      rec.items.forEach(it => {
        filas++;
        const tr = document.createElement('tr');
        tr.className = (rec.tipo === 'entrada' ? 'entrada' : 'cuenta') + (rec.anulado ? ' anulado' : '');
        tr.innerHTML = `
          <td>${_esc(rec.id)}</td>
          <td>${fechaCorta(rec.fecha)}</td>
          <td class="tipo"><span class="chip ${rec.tipo}">${rec.tipo === 'entrada' ? 'Entrada' : 'Cuenta'}</span></td>
          <td>${_esc(rec.tercero || '—')}</td>
          <td>${_esc(it.producto)}</td>
          <td>${it.cantidad}</td>
          <td>${fmtMoney(it.costoUnitario)}</td>
          <td>${fmtMoney(it.costoTotal)}</td>
          <td>${esCuenta ? `<span class="chip ${estadoVal}">${estadoLabel}</span>` : '—'}</td>
          <td>${saldoTxt}</td>
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
    const existencias = DB.existenciasPorProducto();
    f4.tabla.innerHTML = '';
    let filas = 0;
    records.forEach(rec => {
      rec.items.forEach(it => {
        if (f4Seleccion.size > 0 && !f4Seleccion.has(it.producto)) return;
        filas++;
        const tr = document.createElement('tr');
        tr.className = (rec.tipo === 'entrada' ? 'entrada' : 'cuenta') + (rec.anulado ? ' anulado' : '');
        const exist = existencias[it.producto] !== undefined ? existencias[it.producto] : 0;
        tr.innerHTML = `
          <td>${_esc(it.producto)}</td>
          <td>${it.cantidad}</td>
          <td>${fmtMoney(it.costoUnitario)}</td>
          <td>${fmtMoney(it.costoTotal)}</td>
          <td>${fechaCorta(rec.fecha)}</td>
          <td class="tipo"><span class="chip ${rec.tipo}">${rec.tipo === 'entrada' ? 'Entrada' : 'Cuenta'}</span></td>
          <td>${_esc(rec.id)}</td>
          <td>${exist}</td>`;
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
    if (f3ChipsTerceroVisibles) f3RenderChipsTercero();
    refrescarCompanias();
  }

  initNumericGuards();
  refrescarListasGlobales();

  // ---------- Registro del Service Worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.error('SW error:', err));
    });
  }
})();
