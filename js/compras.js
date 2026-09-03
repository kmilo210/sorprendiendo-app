// ============================================================
// LISTAS DE COMPRAS
// ============================================================
import {
  listenListasCompras,
  listenListaCompras,
  addListaCompras,
  updateListaCompras,
  deleteListaCompras,
  listenCategorias,
  listenDetalles,
  listenProductos,
  listenProveedores,
} from "./data.js";
import {
  openModal,
  closeModal,
  confirmDialog,
  toast,
  escapeHtml,
  icons,
  matchesSearch,
  debounce,
  formatDateTimeCO,
  buildWhatsappLink,
  emptyStateHtml,
  skeletonGridHtml,
  loadingHtml,
} from "./utils.js";
import { registerCleanup, navigateTo } from "./app.js";
import { openProductoForm } from "./productos.js";

const whatsappIconSVG = `
<svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true">
<path d="M16.02 3C9.4 3 4 8.38 4 15c0 2.34.66 4.53 1.8 6.4L4 29l7.78-1.75A11.9 11.9 0 0 0 16.02 27C22.65 27 28 21.62 28 15S22.65 3 16.02 3Zm0 21.6c-1.97 0-3.85-.55-5.46-1.6l-.39-.24-4.62 1.04 1.04-4.5-.26-.4A9.5 9.5 0 0 1 6.4 15c0-5.3 4.3-9.6 9.62-9.6 5.3 0 9.6 4.3 9.6 9.6 0 5.3-4.3 9.6-9.6 9.6Zm5.28-7.2c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.65.14-.19.29-.74.93-.9 1.12-.17.2-.33.22-.62.08-.29-.15-1.2-.44-2.3-1.42-.85-.75-1.42-1.68-1.59-1.97-.17-.29-.02-.44.13-.59.13-.13.29-.34.44-.5.15-.17.19-.29.29-.48.1-.2.05-.37-.02-.52-.08-.15-.65-1.58-.9-2.16-.24-.57-.48-.5-.65-.5-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.76.36-.26.29-1 1-1 2.42 0 1.43 1.03 2.82 1.17 3.02.15.19 2.03 3.1 4.93 4.35.69.3 1.22.48 1.64.61.69.22 1.32.19 1.81.11.55-.08 1.7-.7 1.94-1.37.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.34Z"/>
</svg>`;

/* ============================================================
   LISTADO DE LISTAS DE COMPRAS
   ============================================================ */
let allListas = [];

export function renderCompras(container) {
  container.innerHTML = `
    <div class="page-header compras-page-header">
      <div>
        <h1>Listas de compras</h1>
        <p>Genera listas de compras automáticas a partir de los detalles vendidos.</p>
      </div>

      <div class="page-actions">
        <button class="btn btn-primary" id="btn-new-lista">
          + Crear lista
        </button>
      </div>
    </div>
    <div id="listas-grid">${skeletonGridHtml()}</div>
  `;

  document.getElementById("btn-new-lista").addEventListener("click", () => openNewListaModal());

  const unsub = listenListasCompras((data) => {
    allListas = data;
    renderGrid();
  });
  registerCleanup(unsub);
}

function renderGrid() {
  const grid = document.getElementById("listas-grid");
  if (!grid) return;

  if (allListas.length === 0) {
    grid.innerHTML = emptyStateHtml({
      icon: "🛒",
      title: "Todavía no tienes listas de compras",
      message: "Crea tu primera lista para organizar tus compras a proveedores.",
      actionHtml: `<button class="btn btn-primary" id="empty-add-lista">${icons.plus} Crear lista</button>`,
    });
    grid.querySelector("#empty-add-lista")?.addEventListener("click", () => openNewListaModal());
    return;
  }

  grid.innerHTML = `<div class="grid-cards">
    ${allListas
      .map((l) => {
        const total = (l.items || []).length;
        const comprados = (l.items || []).filter((i) => i.comprado).length;
        return `
      <a href="#/compras/${l.id}" class="item-card" style="text-decoration:none;">
        <div class="item-card-body">
          <div class="item-card-sub">${formatDateTimeCO(l.createdAt)}</div>
          <div class="item-card-title">${escapeHtml(l.nombre)}</div>
          <div class="item-card-sub">${comprados} / ${total} productos comprados</div>
        </div>
        <div class="item-card-footer">
          <span class="btn btn-outline btn-sm abrir-lista-btn">
            ${icons.eye} Abrir lista
          </span>
          <button class="btn btn-icon" data-delete="${l.id}" title="Eliminar" style="position:relative;z-index:2;">${icons.trash}</button>
        </div>
      </a>`;
      })
      .join("")}
  </div>`;

  grid.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lista = allListas.find((l) => l.id === btn.dataset.delete);
      const ok = await confirmDialog({
        title: "Eliminar lista de compras",
        message: `¿Seguro que deseas eliminar la lista "${lista?.nombre}"? Esta acción no se puede deshacer.`,
      });
      if (!ok) return;
      await deleteListaCompras(btn.dataset.delete);
      toast("Lista eliminada", "success");
    })
  );
}

function openNewListaModal() {
  openModal({
    title: "Crear lista de compras",
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">Nombre de la lista</label>
        <input type="text" id="lista-nombre" placeholder="Ej: Compras semana 21 - agosto" />
        <p class="field-hint">La fecha y hora de creación se guardan automáticamente.</p>
      </div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="lista-cancel">Cancelar</button>
      <button class="btn btn-primary" id="lista-create">Crear y continuar</button>
    `,
    onMount: (overlay) => {
      overlay.querySelector("#lista-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#lista-create").addEventListener("click", async () => {
        const nombre = overlay.querySelector("#lista-nombre").value.trim();
        if (!nombre) return toast("Escribe un nombre para la lista", "error");
        const ref = await addListaCompras({ nombre, items: [], detallesUsados: [] });
        toast("Lista creada correctamente", "success");
        closeModal();
        navigateTo(`#/compras/${ref.id}`);
      });
    },
  });
}

/* ============================================================
   DETALLE / EDICIÓN DE UNA LISTA DE COMPRAS
   ============================================================ */
let ctx = null; // { lista, categorias, detalles, productos, proveedores }

export function renderCompraDetalle(container, listaId) {
  container.innerHTML = loadingHtml("Cargando lista de compras...");
  painted = false;
  ctx = { lista: null, categorias: [], detalles: [], productos: [], proveedores: [] };

  const unsubLista = listenListaCompras(listaId, (lista) => {
    if (!lista) {
      container.innerHTML = emptyStateHtml({ icon: "🛒", title: "Esta lista ya no existe", message: "Puede que haya sido eliminada." });
      return;
    }
    ctx.lista = lista;
    paintDetalle(container);
  });
  const unsubCat = listenCategorias((d) => {
    ctx.categorias = d;
    paintDetalle(container);
  });
  const unsubDet = listenDetalles((d) => {
    ctx.detalles = d;
    paintDetalle(container);
  });
  const unsubProd = listenProductos((d) => {
    ctx.productos = d;
    paintDetalle(container);
  });
  const unsubProv = listenProveedores((d) => {
    ctx.proveedores = d;
    paintDetalle(container);
  });

  registerCleanup(unsubLista);
  registerCleanup(unsubCat);
  registerCleanup(unsubDet);
  registerCleanup(unsubProd);
  registerCleanup(unsubProv);
}

function proveedorNombre(id) {
  return ctx.proveedores.find((p) => p.id === id)?.nombre || null;
}

function proveedorIcono(id) {
  const proveedor = ctx.proveedores.find((p) => p.id === id);

  if (proveedor?.imagenUrl) {
    return `<img src="${proveedor.imagenUrl}" alt="${escapeHtml(proveedor.nombre)}" class="provider-group-img" />`;
  }

  return icons.truck;
}

function productoNombre(id) {
  return ctx.productos.find((p) => p.id === id)?.nombre || "Producto eliminado";
}

let painted = false;
function paintDetalle(container) {
  if (!ctx.lista) return;
  // Solo se pinta el esqueleto de la página una vez; las actualizaciones de datos re-renderizan las secciones internas.
  if (!painted || !document.getElementById("compra-detalle-root")) {
    container.innerHTML = `
      <div id="compra-detalle-root">
        <div class="page-header">
          <div>
            <a href="#/compras" class="btn btn-ghost btn-sm" style="margin-bottom:8px;padding-left:0;">${icons.arrowLeft} Volver a listas</a>
            <h1 id="compra-titulo"></h1>
            <p id="compra-fecha" class="text-muted"></p>
          </div>
          <div class="page-actions">
            <button class="btn btn-outline btn-whatsapp" id="btn-whatsapp">
              ${whatsappIconSVG} Enviar por WhatsApp
            </button>
          </div>
        </div>

        <div class="card card-pad" style="margin-bottom:22px;">
          <h3 style="font-size:15px;margin-bottom:14px;">Agregar detalle a la lista</h3>
          <div class="tabs" id="add-cat-tabs"></div>
          <div class="autocomplete-wrap">
            <div class="search-box">
              ${icons.search}
              <input type="text" id="add-detalle-search" placeholder="Buscar detalle por nombre..." autocomplete="off" />
            </div>
            <div id="add-detalle-ac"></div>
          </div>
        </div>

        <div class="card card-pad" style="margin-bottom:22px;">
          <div class="flex-between" style="margin-bottom:14px;">
            <h3 style="font-size:15px;">Agregar producto individual</h3>
          </div>
          <div class="autocomplete-wrap">
            <div class="search-box">
              ${icons.search}
              <input type="text" id="add-producto-search" placeholder="Buscar producto para agregar directamente..." autocomplete="off" />
            </div>
            <div id="add-producto-ac"></div>
          </div>
        </div>

        <div class="flex-between" style="margin-bottom:14px;">
          <h3 style="font-size:17px;">Lista consolidada por proveedor</h3>
        </div>
        <div id="compra-items-list"></div>
      </div>
    `;
    painted = true;
    bindStaticEvents(container);
  }

  document.getElementById("compra-titulo").textContent = ctx.lista.nombre;
  document.getElementById("compra-fecha").textContent = "Creada el " + formatDateTimeCO(ctx.lista.createdAt);
  renderAddCategoriaTabs();
  renderItemsConsolidados();
}

let activeAddCat = "todas";
function renderAddCategoriaTabs() {
  const el = document.getElementById("add-cat-tabs");
  if (!el) return;
  el.innerHTML = `
    <button class="tab-btn ${activeAddCat === "todas" ? "active" : ""}" data-addcat="todas">Todas</button>
    ${ctx.categorias.map((c) => `<button class="tab-btn ${activeAddCat === c.id ? "active" : ""}" data-addcat="${c.id}">${escapeHtml(c.nombre)}</button>`).join("")}
  `;
  el.querySelectorAll("[data-addcat]").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeAddCat = btn.dataset.addcat;
      renderAddCategoriaTabs();
    })
  );
}

function bindStaticEvents(container) {
  // Buscar / agregar DETALLE
  const detSearch = document.getElementById("add-detalle-search");
  const detAc = document.getElementById("add-detalle-ac");
  detSearch.addEventListener(
    "input",
    debounce((e) => {
      const term = e.target.value.trim();
      let matches = ctx.detalles;
      if (activeAddCat !== "todas") matches = matches.filter((d) => d.categoriaId === activeAddCat);
      if (term) matches = matches.filter((d) => matchesSearch(d.nombre, term));
      matches = matches.slice(0, 8);
      if (!term && activeAddCat === "todas") {
        detAc.innerHTML = "";
        return;
      }
      detAc.innerHTML = `<div class="autocomplete-list">
        ${
          matches.length === 0
            ? `<div class="autocomplete-empty">Sin coincidencias</div>`
            : matches
                .map(
                  (d) => `<div class="autocomplete-item" data-pick-detalle="${d.id}">
              ${d.imagenUrl ? `<img src="${d.imagenUrl}" class="ac-thumb" />` : `<span class="ac-thumb flex-center">${icons.gift}</span>`}
              <span>${escapeHtml(d.nombre)}</span>
            </div>`
                )
                .join("")
        }
      </div>`;
      detAc.querySelectorAll("[data-pick-detalle]").forEach((el) =>
        el.addEventListener("click", () => {
          openCantidadModal(ctx.detalles.find((d) => d.id === el.dataset.pickDetalle));
          detSearch.value = "";
          detAc.innerHTML = "";
        })
      );
    }, 150)
  );

    // Buscar / agregar PRODUCTO individual
  const prodSearch = document.getElementById("add-producto-search");
  const prodAc = document.getElementById("add-producto-ac");

  prodSearch.addEventListener(
    "input",
    debounce((e) => {
      const term = e.target.value.trim();

      if (!term) {
        prodAc.innerHTML = "";
        return;
      }

      const matches = ctx.productos
        .filter((p) => matchesSearch(p.nombre, term))
        .slice(0, 8);

      prodAc.innerHTML = `<div class="autocomplete-list">
        ${
          matches.length === 0
            ? `<div class="autocomplete-empty">Sin coincidencias</div>`
            : matches
                .map(
                  (p) => `<div class="autocomplete-item" data-pick-producto="${p.id}">
              ${p.imagenUrl ? `<img src="${p.imagenUrl}" class="ac-thumb" />` : `<span class="ac-thumb flex-center">${icons.box}</span>`}
              <span>${escapeHtml(p.nombre)}</span>
            </div>`
                )
                .join("")
        }

        <div class="autocomplete-item autocomplete-new" data-create-producto="1">
          + Crear nuevo producto "${escapeHtml(term)}"
        </div>
      </div>`;

      // Agregar producto existente
      prodAc.querySelectorAll("[data-pick-producto]").forEach((el) =>
        el.addEventListener("click", async () => {
          await addProductoIndividual(el.dataset.pickProducto, 1);
          prodSearch.value = "";
          prodAc.innerHTML = "";
        })
      );

      // Crear producto nuevo
      prodAc.querySelector("[data-create-producto]")?.addEventListener("click", () => {
        openProductoForm(null, (nuevo) => {
          // Actualizar inmediatamente el contexto local
          ctx.productos = [...ctx.productos, nuevo];

          // Agregar automáticamente el producto recién creado
          addProductoIndividual(nuevo.id, 1);
        });

        // Prellenar el nombre con lo que el usuario escribió
        setTimeout(() => {
          const nameInput = document.getElementById("producto-nombre");
          if (nameInput) nameInput.value = term;
        }, 30);

        prodSearch.value = "";
        prodAc.innerHTML = "";
      });
    }, 150)
  );

  document.getElementById("btn-whatsapp").addEventListener("click", openWhatsappModal);
}

function openCantidadModal(detalle) {
  openModal({
    title: `Agregar "${detalle.nombre}"`,
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">¿Cuántas unidades del detalle vas a preparar?</label>
        <input type="number" id="cantidad-detalle" min="1" value="1" />
        <p class="field-hint">Todos los productos del detalle se multiplicarán automáticamente por esta cantidad.</p>
      </div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="cant-cancel">Cancelar</button>
      <button class="btn btn-primary" id="cant-confirm">Agregar a la lista</button>
    `,
    onMount: (overlay) => {
      overlay.querySelector("#cant-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#cant-confirm").addEventListener("click", async () => {
        const cantidad = Math.max(1, parseInt(overlay.querySelector("#cantidad-detalle").value, 10) || 1);
        await addDetalleAListaCompras(detalle, cantidad);
        closeModal();
        toast(`"${detalle.nombre}" × ${cantidad} agregado a la lista`, "success");
      });
    },
  });
}

function preferredProviderFor(productoId) {
  const prod = ctx.productos.find((p) => p.id === productoId);
  const pref = (prod?.proveedores || []).find((x) => x.preferido);
  return pref ? pref.proveedorId : (prod?.proveedores || [])[0]?.proveedorId || null;
}

async function addDetalleAListaCompras(detalle, cantidadDetalle) {
  const items = (ctx.lista.items || []).map((i) => ({ ...i }));
  (detalle.productos || []).forEach((p) => {
    const cantidadTotal = p.cantidad * cantidadDetalle;
    const existing = items.find((i) => i.productoId === p.productoId);
    if (existing) {
      existing.cantidad += cantidadTotal;
    } else {
      items.push({
        productoId: p.productoId,
        cantidad: cantidadTotal,
        proveedorId: preferredProviderFor(p.productoId),
        comprado: false,
      });
    }
  });
  const detallesUsados = [...(ctx.lista.detallesUsados || []), { detalleId: detalle.id, nombre: detalle.nombre, cantidad: cantidadDetalle }];
  await updateListaCompras(ctx.lista.id, { items, detallesUsados });
}

async function addProductoIndividual(productoId, cantidad) {
  const items = (ctx.lista.items || []).map((i) => ({ ...i }));
  const existing = items.find((i) => i.productoId === productoId);
  if (existing) existing.cantidad += cantidad;
  else
    items.push({
      productoId,
      cantidad,
      proveedorId: preferredProviderFor(productoId),
      comprado: false,
    });
  await updateListaCompras(ctx.lista.id, { items });
  toast("Producto agregado a la lista", "success");
}

function renderItemsConsolidados() {
  const el = document.getElementById("compra-items-list");
  if (!el) return;
  const items = ctx.lista.items || [];

  if (items.length === 0) {
    el.innerHTML = emptyStateHtml({
      icon: "🛒",
      title: "Esta lista todavía no tiene productos",
      message: "Agrega detalles o productos individuales arriba para comenzar a construir tu lista de compras.",
    });
    return;
  }

  // Agrupar por proveedor
  const groups = {};
  items.forEach((item) => {
    const key = item.proveedorId || "sin-proveedor";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === "sin-proveedor") return 1;
    if (b === "sin-proveedor") return -1;
    return (proveedorNombre(a) || "").localeCompare(proveedorNombre(b) || "");
  });

  el.innerHTML = groupKeys
    .map((key) => {
      const nombreGrupo = key === "sin-proveedor" ? "Sin proveedor asignado" : proveedorNombre(key) || "Proveedor eliminado";
      return `
      <div class="provider-group">
        <div class="provider-group-title">
          <span class="provider-group-icon">${key === "sin-proveedor" ? icons.truck : proveedorIcono(key)}</span>
          <span>${escapeHtml(nombreGrupo)}</span>
        </div>
        ${groups[key]
          .map(
            (item) => `
          <div class="shopping-item ${item.comprado ? "checked" : ""}" data-item="${item.productoId}">
            <label class="checkbox-row">
              <input type="checkbox" data-check ${item.comprado ? "checked" : ""} />
            </label>
            <span class="si-name">${escapeHtml(productoNombre(item.productoId))}</span>
            <div class="qty-stepper">
              <button type="button" data-dec>−</button>
              <input type="number" min="1" value="${item.cantidad}" data-qtyval />
              <button type="button" data-inc>+</button>
            </div>
            <select data-provsel style="width:auto;min-width:150px;">
              <option value="">Sin proveedor</option>
              ${ctx.proveedores.map((p) => `<option value="${p.id}" ${item.proveedorId === p.id ? "selected" : ""}>${escapeHtml(p.nombre)}</option>`).join("")}
            </select>
            <button class="btn btn-icon" data-remove title="Quitar producto">${icons.trash}</button>
          </div>`
          )
          .join("")}
      </div>`;
    })
    .join("");

  el.querySelectorAll(".shopping-item").forEach((row) => {
    const productoId = row.dataset.item;
    row.querySelector("[data-check]").addEventListener("change", (e) => updateItem(productoId, { comprado: e.target.checked }));
    row.querySelector("[data-dec]").addEventListener("click", () => {
      const item = ctx.lista.items.find((i) => i.productoId === productoId);
      updateItem(productoId, { cantidad: Math.max(1, item.cantidad - 1) });
    });
    row.querySelector("[data-inc]").addEventListener("click", () => {
      const item = ctx.lista.items.find((i) => i.productoId === productoId);
      updateItem(productoId, { cantidad: item.cantidad + 1 });
    });
    row.querySelector("[data-qtyval]").addEventListener("change", (e) => {
      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
      updateItem(productoId, { cantidad: val });
    });
    row.querySelector("[data-provsel]").addEventListener("change", (e) => {
      updateItem(productoId, { proveedorId: e.target.value || null });
    });
    row.querySelector("[data-remove]").addEventListener("click", async () => {
      const ok = await confirmDialog({ title: "Quitar producto", message: "¿Deseas quitar este producto de la lista?", confirmText: "Quitar" });
      if (!ok) return;
      const items = ctx.lista.items.filter((i) => i.productoId !== productoId);
      await updateListaCompras(ctx.lista.id, { items });
    });
  });
}

async function updateItem(productoId, changes) {
  const items = ctx.lista.items.map((i) => (i.productoId === productoId ? { ...i, ...changes } : i));
  await updateListaCompras(ctx.lista.id, { items });
}

/* ---------- WhatsApp ---------- */
function buildMensajeCompras() {
  const items = ctx.lista.items || [];
  const groups = {};
  items.forEach((item) => {
    const key = item.proveedorId || "sin-proveedor";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === "sin-proveedor") return 1;
    if (b === "sin-proveedor") return -1;
    return (proveedorNombre(a) || "").localeCompare(proveedorNombre(b) || "");
  });

  let msg = `*LISTADO DE COMPRAS*\n${ctx.lista.nombre}\n\n`;
  groupKeys.forEach((key) => {
    const nombreGrupo = key === "sin-proveedor" ? "Sin proveedor asignado" : proveedorNombre(key) || "Proveedor";
    msg += `*${nombreGrupo}*\n`;
    groups[key].forEach((item) => {
      msg += `• ${productoNombre(item.productoId)} × ${item.cantidad}\n`;
    });
    msg += `\n`;
  });
  return msg.trim();
}

function openWhatsappModal() {
  if ((ctx.lista.items || []).length === 0) {
    toast("Esta lista todavía no tiene productos para enviar", "error");
    return;
  }
  openModal({
    title: "Enviar lista por WhatsApp",
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">Número de teléfono (Colombia)</label>
        <input type="tel" id="wa-phone" placeholder="Ej: 3001234567" />
        <p class="field-hint">Se enviará con el código de país +57.</p>
      </div>
      <div class="form-group">
        <label class="field-label">Vista previa del mensaje</label>
        <textarea readonly style="min-height:180px;font-size:13px;">${buildMensajeCompras()}</textarea>
      </div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="wa-cancel">Cancelar</button>
      <button class="btn btn-primary" id="wa-send">${icons.whatsapp} Abrir WhatsApp</button>
    `,
    onMount: (overlay) => {
      overlay.querySelector("#wa-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#wa-send").addEventListener("click", () => {
        const phone = overlay.querySelector("#wa-phone").value.trim();
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10) return toast("Ingresa un número de teléfono válido", "error");
        const link = buildWhatsappLink(digits, buildMensajeCompras());
        window.open(link, "_blank");
        closeModal();
      });
    },
  });
}
