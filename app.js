/* Conteo Verde · Merma de bebidas · Web estática para GitHub Pages.
   Los insumos y cifras se leen exclusivamente del JSON generado desde el PDF. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 6 });
  const SIZE_WORDS = ['Corto','Alto','Grande','Venti','Trenta','Mini','Gde','Vti','Gran'];
  const SIZE_ORDER = { 'Corto': 0, 'Alto': 1, 'Grande': 2, 'Venti': 3, 'Trenta': 4, 'Gran': 5, 'Gde': 6, 'Vti': 7, 'Mini': 8, 'Único': 9 };
  const STORAGE_CART = 'cv_mermas_v1';
  const STORAGE_SAP = 'cv_sap_v1';
  const STORAGE_META = 'cv_meta_v1';
  const state = {
    recipes: [], byId: new Map(), byName: new Map(), groups: [], visible: [],
    activeGroup: null, activeRecipe: null, quantity: 1,
    expand: true, showZeros: false, showInternal: false,
    cart: safeRead(STORAGE_CART, []), sap: safeRead(STORAGE_SAP, {}), totals: [],
    source: null, toastTimer: null
  };

  function safeRead(key, backup) { try { return JSON.parse(localStorage.getItem(key)) ?? backup; } catch { return backup; } }
  function persist(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { notify('No se pudo guardar este cambio en el navegador.'); } }
  function norm(s) { return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-MX').replace(/\s+/g,' ').trim(); }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function num(v) { return fmt.format(Number(v) || 0); }
  function cleanNumber(n) { return Math.round((n + Number.EPSILON) * 1e9) / 1e9; }
  function isSupport(name) { return /^(?:pqt\s*[-_]|sr\s*[-_]|pr\s*[-_]|prep\s|jarabe\s|leche\s|tapa\s|vaso\s|bolsa\s|etiqueta\s|popote\s|salsa\s|topping\s|base\s|\d+\s+leche\s)/i.test(name); }
  function readableUnit(unit) { return String(unit).trim(); }
  function unitCode(unit) { return (String(unit).split(':')[0] || '').trim().toUpperCase(); }
  function keyOfItem(name, unit) { return `${norm(name)}|${norm(unit)}`; }
  function sourceLabel(r) { return `${r.kind === 'lote' ? 'Lote' : 'Receta'} · Pág. ${r.page} del PDF`; }
  function getSizeAndBase(name) {
    const re = /(^|[\s\/()\-_])(Corto|Alto|Grande|Venti|Trenta|Mini|Gde|Vti|Gran)(?=$|[\s\/()\-_])/gi;
    let m, last = null;
    while ((m = re.exec(name))) last = { start: m.index + m[1].length, word: m[2], length: m[2].length };
    if (!last) return { base: name.trim(), size: 'Único' };
    const canonical = SIZE_WORDS.find(s => norm(s) === norm(last.word)) || last.word;
    const base = (name.slice(0,last.start) + name.slice(last.start + last.length)).replace(/\s+/g,' ').trim();
    return { base: base || name.trim(), size: canonical };
  }
  function buildCatalog() {
    state.byId = new Map(state.recipes.map(r => [r.id, r]));
    state.byName = new Map();
    for (const rec of state.recipes) {
      const key = norm(rec.name);
      if (!state.byName.has(key)) state.byName.set(key, []);
      state.byName.get(key).push(rec);
    }
    const groups = new Map();
    for (const r of state.recipes) {
      const {base,size} = getSizeAndBase(r.name);
      const key = norm(base);
      if (!groups.has(key)) groups.set(key, {key, name:base, options:[], support:true, keywords:''});
      const g = groups.get(key);
      g.options.push({size,recipeId:r.id,name:r.name});
      if (!isSupport(r.name)) g.support = false;
    }
    state.groups = [...groups.values()].map(g => {
      g.options.sort((a,b) => (SIZE_ORDER[a.size] ?? 20) - (SIZE_ORDER[b.size] ?? 20) || a.name.localeCompare(b.name,'es'));
      g.keywords = norm(g.name + ' ' + g.options.map(x => x.name).join(' '));
      return g;
    }).sort((a,b) => a.name.localeCompare(b.name,'es'));
  }
  function validateData(doc) {
    if (!doc || !Array.isArray(doc.recipes) || !doc.recipes.length) throw new Error('El JSON no contiene recetas.');
    for (const rec of doc.recipes) {
      if (!rec.id || !rec.name || !Array.isArray(rec.items) || !Number.isFinite(Number(rec.yield)) || Number(rec.yield) <= 0)
        throw new Error('Una ficha de receta tiene formato incompleto.');
      for (const row of rec.items) if (!row.name || !row.unit || !Number.isFinite(Number(row.qty))) throw new Error('Hay un insumo o cantidad inválido.');
    }
  }
  function useData(doc) {
    validateData(doc);
    state.recipes = doc.recipes;
    state.source = doc;
    buildCatalog();
    $('hero-count').textContent = new Intl.NumberFormat('es-MX').format(state.recipes.length);
    $('source-date').textContent = doc.reportDate || 'Fecha no indicada';
    state.activeGroup = null; state.activeRecipe = null;
    renderGroups(); renderDetail(); renderSummary();
  }
  async function loadDefault() {
    try {
      const response = await fetch('./data/recipes.json', {cache:'no-cache'});
      if (!response.ok) throw new Error(`No se pudieron leer los datos (${response.status}).`);
      useData(await response.json());
    } catch (error) {
      $('results-label').textContent = 'No se pudieron cargar las recetas';
      $('recipe-list').innerHTML = `<div class="empty-search">Abre la aplicación mediante GitHub Pages o un servidor local (no haciendo doble clic sobre index.html).<p>También puedes usar «abrir un JSON de recetas» al final de la página.</p><small>${esc(error.message)}</small></div>`;
      $('source-date').textContent = 'Sin catálogo';
      notify('El catálogo no se cargó. Verifica data/recipes.json.');
    }
  }
  function listForQuery(query, showInternal) {
    const q = norm(query);
    let matches = state.groups.filter(g => (showInternal || !g.support) && (!q || g.keywords.includes(q)));
    if (!q) {
      const popular = /\b(latte|mocha|macchiato|capuccino|cappuccino|americano|chai|cold brew|frappuccino|frapuccino|frapp|refreshers)\b/i;
      matches = matches.filter(g => popular.test(g.name));
    } else {
      matches.sort((a,b) => (norm(a.name).startsWith(q) ? 0 : 1) - (norm(b.name).startsWith(q) ? 0 : 1) || a.name.localeCompare(b.name,'es'));
    }
    return matches;
  }
  function renderGroups() {
    if (!state.recipes.length) return;
    const search = $('recipe-search').value;
    state.visible = listForQuery(search, state.showInternal);
    const maximum = 80;
    const visible = state.visible.slice(0,maximum);
    $('results-label').textContent = search ? `${state.visible.length.toLocaleString('es-MX')} resultado(s)` : 'Bebidas sugeridas';
    if (!visible.length) {
      $('recipe-list').innerHTML = `<div class="empty-search">No encontramos coincidencias. Prueba con otro nombre o activa la búsqueda de subrecetas.</div>`;
      return;
    }
    $('recipe-list').innerHTML = visible.map((g, i) => {
      const count = new Set(g.options.map(o => o.size)).size;
      return `<button type="button" class="recipe-row ${state.activeGroup?.key === g.key ? 'active' : ''}" data-group-idx="${i}">
        <span class="drink-mini" aria-hidden="true">${g.support ? '◫' : '☕'}</span>
        <span class="recipe-row-main"><strong>${esc(g.name)}</strong><small>${count} ${count === 1 ? 'presentación' : 'presentaciones'} · ${g.support ? 'Receta auxiliar' : 'Receta disponible'}</small></span><span class="recipe-chevron" aria-hidden="true">›</span></button>`;
    }).join('') + (state.visible.length > maximum ? `<div class="read-more">Mostrando ${maximum} resultados; escribe más del nombre para acotar la lista.</div>` : '');
  }
  function chooseGroup(group) {
    state.activeGroup = group;
    const best = group.options.find(o => o.size === 'Grande') || group.options.find(o => o.size === 'Alto') || group.options[0];
    state.activeRecipe = best.recipeId;
    state.quantity = 1;
    renderGroups(); renderDetail();
    if (window.innerWidth < 1000) $('.detail-panel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function getBreakdown(rec, expand = true) {
    const rows = new Map();
    const zeros = new Map();
    const warnings = {negative:0, cycle:0, unit:0, ambiguous:0, expanded:0, zeros:0};
    function insert(map,item,q) {
      const key = keyOfItem(item.name,item.unit);
      const row = map.get(key) || {name:item.name,unit:item.unit,qty:0};
      row.qty += q;
      map.set(key,row);
    }
    function walk(parent,mult,stack,depth) {
      for (const item of parent.items) {
        const value = Number(item.qty) * mult;
        if (item.qty === 0 || value === 0) {
          warnings.zeros += 1;
          insert(zeros,item,0);
          continue;
        }
        if (value < 0) warnings.negative += 1;
        const refs = state.byName.get(norm(item.name)) || [];
        const child = refs[0];
        if (expand && child) {
          if (refs.length > 1) warnings.ambiguous++;
          if (stack.has(child.id) || depth > 18) warnings.cycle++;
          else if (unitCode(item.unit) !== unitCode(child.yieldUnit) || Number(child.yield) <= 0) warnings.unit++;
          else {
            warnings.expanded++;
            walk(child,value/Number(child.yield),new Set([...stack,child.id]),depth+1);
            continue;
          }
        }
        insert(rows,item,value);
      }
    }
    walk(rec,1,new Set([rec.id]),0);
    const list = [...rows.values()].map(r => ({...r,qty:cleanNumber(r.qty)})).sort((a,b) => a.name.localeCompare(b.name,'es'));
    return {rows:list, zeros:[...zeros.values()],warnings};
  }
  function packagingOnly(rows) {
    return !rows.some(r => r.qty > 0 && !/(?:\bpqt\b|\bvaso\b|\btapa\b|\bservilleta\b|\betiqueta\b|\bbolsa\b|\bpopote\b|\bfajilla\b|\bdomo\b|\bcharola\b)/i.test(r.name));
  }
  function renderDetail() {
    const wrapper = $('recipe-detail');
    const rec = state.byId.get(state.activeRecipe);
    if (!rec) {
      wrapper.innerHTML = '<div class="initial-state"><div class="initial-illustration"><span>☕</span></div><h3>Comienza por elegir una bebida</h3><p>Verás sus tamaños, insumos y cantidades por preparación.</p></div>';
      return;
    }
    const split = getBreakdown(rec,state.expand);
    const showRows = state.showZeros ? [...split.rows,...split.zeros].sort((a,b)=>a.name.localeCompare(b.name,'es')) : split.rows;
    const warnings = [];
    if (packagingOnly(split.rows)) warnings.push('Esta ficha registra solo empaques o no registra insumos con consumo positivo. Puede estar incompleta para merma de la bebida.');
    if (split.warnings.negative) warnings.push('Se encontraron cantidades negativas; se consideran ajustes de crédito tal como aparecen en el PDF.');
    if (split.warnings.unit) warnings.push(`${split.warnings.unit} subreceta(s) no se expandieron por diferencia de unidades. Se conservó su valor original.`);
    if (split.warnings.cycle) warnings.push(`${split.warnings.cycle} referencia(s) circular(es) no se expandieron.`);
    if (split.warnings.ambiguous) warnings.push('Hay referencias a nombres de subreceta duplicados; se tomó la primera ficha del reporte.');
    const group = state.activeGroup;
    wrapper.innerHTML = `
      <div class="selected-heading"><span class="detail-overline">${esc(rec.kind === 'lote' ? 'Receta de lote' : 'Bebida seleccionada')}</span><h3>${esc(rec.name)}</h3><small>${esc(sourceLabel(rec))} · Rinde ${num(rec.yield)} ${esc(rec.yieldUnit)}</small></div>
      <div class="field-group-title">Tamaño o presentación</div><div class="size-grid">${group.options.map((o) => `<button type="button" class="size-option ${o.recipeId === rec.id ? 'selected' : ''}" data-recipe-id="${esc(o.recipeId)}" title="${esc(o.name)}">${esc(o.size)}</button>`).join('')}</div>
      <div class="detail-controls"><div class="count-wrap"><div class="field-group-title">Cantidad de bebidas</div><div class="drink-count"><button type="button" data-quantity-step="-1" aria-label="Restar bebida">−</button><input id="drink-qty" type="number" min="1" step="1" value="${state.quantity}" aria-label="Cantidad de bebidas"/><button type="button" data-quantity-step="1" aria-label="Sumar bebida">+</button></div></div><button type="button" class="btn btn-primary" id="add-to-merma">+ Agregar a merma</button></div>
      <div class="options-row"><label><input id="expand-recipes" type="checkbox" ${state.expand?'checked':''}/> Desglosar subrecetas</label><label><input id="show-zero" type="checkbox" ${state.showZeros?'checked':''}/> Mostrar cantidades cero</label></div>
      <div class="ingredients-title"><strong>Insumos por preparación</strong><span>${split.rows.length} insumo(s) ${state.expand?`· ${split.warnings.expanded} subrecetas abiertas`:''}</span></div>
      <table class="ingredients-table"><thead><tr><th>Insumo</th><th>Cant.</th><th>Unidad</th></tr></thead><tbody>${showRows.length ? showRows.map(row => `<tr class="${row.qty===0?'zero-row':''} ${row.qty<0?'negative-row':''}"><td>${esc(row.name)}</td><td class="amount">${num(row.qty)}</td><td class="unit">${esc(readableUnit(row.unit))}</td></tr>`).join('') : '<tr><td colspan="3">No hay insumos con cantidad distinta de cero en esta ficha.</td></tr>'}</tbody></table>
      ${warnings.length ? `<div class="small-callout"><strong>Revisión recomendada:</strong><ul>${warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`:''}
      ${split.warnings.zeros && !state.showZeros ? `<p class="read-more">Se ocultaron ${split.warnings.zeros} renglones con cantidad cero. Puedes mostrarlos desde la opción superior.</p>`:''}
    `;
  }
  function addRecipe() {
    if (!state.activeRecipe) return;
    const n = Number($('drink-qty')?.value || state.quantity);
    if (!Number.isSafeInteger(n) || n < 1 || n > 100000) { notify('Indica una cantidad entera de bebidas entre 1 y 100,000.'); return; }
    state.quantity = n;
    const existing = state.cart.find(i => i.type === 'drink' && i.recipeId === state.activeRecipe && i.expand === state.expand);
    if (existing) existing.qty += n;
    else state.cart.push({id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),type:'drink',recipeId:state.activeRecipe,qty:n,expand:state.expand});
    persist(STORAGE_CART,state.cart); renderSummary(); notify(`${n} bebida(s) agregada(s) al registro.`);
  }
  function computedTotals() {
    const all = new Map();
    function add(item,qty,type) {
      const key = keyOfItem(item.name,item.unit);
      let r = all.get(key);
      if (!r) { r = {key,name:item.name,unit:item.unit,qty:0,manual:false}; all.set(key,r); }
      r.qty += qty;
      if (type === 'manual') r.manual = true;
    }
    for (const entry of state.cart) {
      if (entry.type === 'manual') { add(entry,entry.qty,'manual'); continue; }
      const rec = state.byId.get(entry.recipeId);
      if (!rec) continue;
      for (const item of getBreakdown(rec,entry.expand).rows) add(item,item.qty * entry.qty,'recipe');
    }
    return [...all.values()].map(x=>({...x,qty:cleanNumber(x.qty)})).filter(x=>Math.abs(x.qty)>1e-9).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }
  function renderCart() {
    const html = state.cart.map((e,i) => {
      const r = e.type === 'drink' ? state.byId.get(e.recipeId) : null;
      const label = e.type === 'manual' ? e.name : (r ? r.name : 'Receta no encontrada en el catálogo actual');
      const subtitle = e.type === 'manual' ? `${num(e.qty)} ${e.unit} · Ajuste manual` : `${r ? 'Página '+r.page : 'Catálogo anterior'} · ${e.expand?'Desglose activado':'Desglose desactivado'}`;
      return `<div class="cart-row"><div class="cart-label"><strong>${esc(label)}</strong><small>${esc(subtitle)}</small></div><div class="cart-tools">${e.type==='drink' ? `<button type="button" class="small-icon-btn" data-cart-step="${i}:-1" title="Restar una bebida" aria-label="Restar una bebida">−</button><span class="cart-qty">${e.qty}</span><button type="button" class="small-icon-btn" data-cart-step="${i}:1" title="Sumar una bebida" aria-label="Sumar una bebida">+</button>` : ''}<button type="button" class="small-icon-btn danger" data-cart-remove="${i}" title="Eliminar renglón" aria-label="Eliminar renglón">×</button></div></div>`;
    }).join('');
    $('cart-list').innerHTML = html || '<div class="cart-empty">Todavía no agregas bebidas. Selecciona una receta y pulsa <strong>Agregar a merma</strong>.</div>';
    const n = state.cart.reduce((sum,e) => sum + (e.type==='drink' ? Number(e.qty) : 0),0);
    $('ledger-count').textContent = `${num(n)} ${n===1?'bebida':'bebidas'}`;
  }
  function renderTotals() {
    state.totals = computedTotals();
    const table = state.totals.length ? `<table class="total-table"><thead><tr><th>SAP</th><th>Insumo</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>${state.totals.map((r,i) => `<tr class="${r.qty<0?'net-negative':''}"><td><input class="sap-input" data-sap-index="${i}" value="${esc(state.sap[r.key] || '')}" placeholder="SAP" maxlength="30" aria-label="SAP de ${esc(r.name)}"/></td><td>${esc(r.name)}${r.manual?'<small> *</small>':''}</td><td>${num(r.qty)}</td><td>${esc(readableUnit(r.unit))}</td></tr>`).join('')}</tbody></table>` : '<div class="totals-empty">Los insumos aparecerán aquí al agregar bebidas.</div>';
    $('total-list').innerHTML = table;
    ['export-csv','export-detail','print-summary'].forEach(id=>$(id).disabled=!state.cart.length);
  }
  function renderSummary() { renderCart();renderTotals(); }
  function changeCart(index,delta) {
    const entry = state.cart[index];
    if (!entry || entry.type!=='drink') return;
    entry.qty += delta;
    if (entry.qty <= 0) state.cart.splice(index,1);
    persist(STORAGE_CART,state.cart); renderSummary();
  }
  function addManual(form) {
    const data = new FormData(form);
    const name = String(data.get('itemName')||'').trim(), unit=String(data.get('itemUnit')||'').trim(), qty=Number(data.get('itemQty'));
    if (!name || !unit || !(qty > 0) || !Number.isFinite(qty)) { notify('Verifica el nombre, la unidad y la cantidad del ajuste.'); return; }
    state.cart.push({id:String(Date.now())+Math.random(),type:'manual',name,unit,qty});
    persist(STORAGE_CART,state.cart); renderSummary(); form.reset();notify('Insumo manual agregado.');
  }
  function csvCell(value) { return '"' + String(value ?? '').replace(/"/g,'""').replace(/[\r\n]+/g,' ') + '"'; }
  function createCSV(name,headers,rows) {
    const body = [headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff',body],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),2000);
    notify('Archivo CSV generado para abrir en Excel.');
  }
  function exportSummary() {
    if (!state.cart.length) return;
    const store = $('store-name').value.trim(), who = $('responsible').value.trim();
    const rows = state.totals.map(r=>[state.sap[r.key]||'',r.name,r.qty,r.unit,store,who,new Date().toLocaleDateString('es-MX'),r.manual?'Incluye ajuste manual':'Receta PDF']);
    createCSV('merma-insumos-'+localDate()+'.csv',['SAP','Insumo','Cantidad neta','Unidad','Tienda','Responsable','Fecha','Origen'],rows);
  }
  function exportDetails() {
    if (!state.cart.length) return;
    const rows=[];
    for (const entry of state.cart) {
      if (entry.type==='manual') { const key=keyOfItem(entry.name,entry.unit);rows.push(['AJUSTE MANUAL','',1,entry.name,entry.qty,entry.qty,entry.unit,state.sap[key]||'','Manual']);continue; }
      const r=state.byId.get(entry.recipeId); if(!r) continue;
      for (const item of getBreakdown(r,entry.expand).rows) { const key=keyOfItem(item.name,item.unit); rows.push([r.name,r.page,entry.qty,item.name,item.qty,cleanNumber(item.qty*entry.qty),item.unit,state.sap[key]||'',entry.expand?'Desglosado':'Directo']); }
    }
    createCSV('detalle-merma-'+localDate()+'.csv',['Bebida/receta','Página PDF','Cant. bebidas','Insumo','Cant. por bebida','Cantidad total','Unidad','SAP','Desglose'],rows);
  }
  function localDate() {
    const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function notify(message) {
    const toast=$('toast'); if (!toast) return;
    toast.textContent=message;toast.classList.add('visible');
    if(state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(()=>toast.classList.remove('visible'),3600);
  }
  function bind() {
    $('recipe-search').addEventListener('input',renderGroups);
    $('show-internal').addEventListener('change',e=>{state.showInternal=e.target.checked;renderGroups();});
    document.querySelectorAll('[data-quick]').forEach(button=>button.addEventListener('click',()=>{$('recipe-search').value=button.dataset.quick;renderGroups();$('recipe-search').focus();}));
    $('recipe-list').addEventListener('click',e=>{const b=e.target.closest('[data-group-idx]');if(!b)return;const group=state.visible[Number(b.dataset.groupIdx)];if(group)chooseGroup(group);});
    $('recipe-detail').addEventListener('click',e=>{
      const r=e.target.closest('[data-recipe-id]');
      if(r){state.activeRecipe=r.dataset.recipeId;state.quantity=1;renderDetail();return;}
      const change=e.target.closest('[data-quantity-step]');
      if(change){const n=Number($('drink-qty')?.value)||1;state.quantity=Math.min(100000,Math.max(1,n+Number(change.dataset.quantityStep)));$('drink-qty').value=state.quantity;return;}
      if(e.target.closest('#add-to-merma'))addRecipe();
    });
    $('recipe-detail').addEventListener('input',e=>{if(e.target.id==='drink-qty')state.quantity=Number(e.target.value);});
    $('recipe-detail').addEventListener('change',e=>{
      if(e.target.id==='expand-recipes'){state.expand=e.target.checked;renderDetail();}
      if(e.target.id==='show-zero'){state.showZeros=e.target.checked;renderDetail();}
    });
    $('cart-list').addEventListener('click',e=>{
      const remove=e.target.closest('[data-cart-remove]');if(remove){state.cart.splice(Number(remove.dataset.cartRemove),1);persist(STORAGE_CART,state.cart);renderSummary();return;}
      const step=e.target.closest('[data-cart-step]');if(step){const [i,d]=step.dataset.cartStep.split(':');changeCart(Number(i),Number(d));}
    });
    $('manual-form').addEventListener('submit',e=>{e.preventDefault();addManual(e.currentTarget);});
    $('clear-cart').addEventListener('click',()=>{if(!state.cart.length)return;if(window.confirm('¿Vaciar todo el registro de merma?')){state.cart=[];persist(STORAGE_CART,[]);renderSummary();notify('Registro vaciado.');}});
    $('total-list').addEventListener('change',e=>{const input=e.target.closest('[data-sap-index]');if(!input)return;const r=state.totals[Number(input.dataset.sapIndex)];if(!r)return;state.sap[r.key]=input.value.trim();persist(STORAGE_SAP,state.sap);});
    $('export-csv').addEventListener('click',exportSummary);
    $('export-detail').addEventListener('click',exportDetails);
    $('print-summary').addEventListener('click',()=>window.print());
    const metadata=safeRead(STORAGE_META,{});
    $('store-name').value=metadata.store||'';$('responsible').value=metadata.responsible||'';
    ['store-name','responsible'].forEach(id=>$(id).addEventListener('input',()=>persist(STORAGE_META,{store:$('store-name').value,responsible:$('responsible').value})));
    $('json-file').addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try { const data=JSON.parse(await file.text()); useData(data);notify('Catálogo JSON cargado para esta sesión.'); }
      catch(err){notify('Error de catálogo: '+err.message);}finally{e.target.value='';}
    });
    document.addEventListener('keydown',e=>{if(e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('recipe-search').focus();}});
  }
  bind();
  renderCart();
  loadDefault();
})();
