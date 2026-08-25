// ============================================================
// DETALLES
// ============================================================
import {
  listenCategorias,
  listenDetalles,
  listenProductos,
  addDetalle,
  updateDetalle,
  deleteDetalle,
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
  formatCOP,
  parseCOPInput,
  uploadImageAndGetURL,
  emptyStateHtml,
  skeletonGridHtml,
} from "./utils.js";
import { registerCleanup } from "./app.js";
import { openCategoriasManagerModal } from "./categorias.js";
import { openProductoForm } from "./productos.js";

let allCategorias = [];
let allDetalles = [];
let allProductosCache = [];
let activeCategoriaId = "todas";
let searchTerm = "";

export function renderDetalles(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Listado de detalles</h1>
        <p>Los detalles son los productos sorpresa que vendes, organizados por categoría.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="btn-manage-categorias">Categorías</button>
        <button class="btn btn-primary" id="btn-new-detalle">+ Crear detalle</button>
      </div>
    </div>
    <div class="search-box" style="max-width:360px;margin-bottom:18px;">
      ${icons.search}
      <input type="search" id="detalle-search" placeholder="Buscar detalle..." />
    </div>
    <div class="tabs" id="categoria-tabs"></div>
    <div id="detalles-grid">${skeletonGridHtml()}</div>
  `;

  document.getElementById("btn-new-detalle").addEventListener("click", () => openDetalleForm());
  document.getElementById("btn-manage-categorias").addEventListener("click", () => openCategoriasManagerModal(allCategorias));

  const debouncedSearch = debounce((val) => {
    searchTerm = val;
    renderGrid();
  }, 200);
  document.getElementById("detalle-search").addEventListener("input", (e) => debouncedSearch(e.target.value));

  const unsub1 = listenCategorias((data) => {
    allCategorias = data;
    renderTabs();
    renderGrid();
  });
  const unsub2 = listenDetalles((data) => {
    allDetalles = data;
    renderGrid();
  });
  const unsub3 = listenProductos((data) => {
    allProductosCache = data;
  });
  registerCleanup(unsub1);
  registerCleanup(unsub2);
  registerCleanup(unsub3);
}

function renderTabs() {
  const tabsEl = document.getElementById("categoria-tabs");
  if (!tabsEl) return;
  tabsEl.innerHTML = `
    <button class="tab-btn ${activeCategoriaId === "todas" ? "active" : ""}" data-cat="todas">Todas</button>
    ${allCategorias
      .map((c) => `<button class="tab-btn ${activeCategoriaId === c.id ? "active" : ""}" data-cat="${c.id}">${escapeHtml(c.nombre)}</button>`)
      .join("")}
  `;
  tabsEl.querySelectorAll(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeCategoriaId = btn.dataset.cat;
      renderTabs();
      renderGrid();
    })
  );
}

function categoriaNombre(id) {
  return allCategorias.find((c) => c.id === id)?.nombre || "Sin categoría";
}

function renderGrid() {
  const grid = document.getElementById("detalles-grid");
  if (!grid) return;

  let filtered = allDetalles;
  if (activeCategoriaId !== "todas") filtered = filtered.filter((d) => d.categoriaId === activeCategoriaId);
  if (searchTerm) filtered = filtered.filter((d) => matchesSearch(d.nombre, searchTerm));

  if (allDetalles.length === 0) {
    grid.innerHTML = emptyStateHtml({
      icon: "🎁",
      title: "Todavía no tienes detalles registrados",
      message: "Agrega tu primer detalle para comenzar.",
      actionHtml: `<button class="btn btn-primary" id="empty-add-detalle">${icons.plus} Crear detalle</button>`,
    });
    grid.querySelector("#empty-add-detalle")?.addEventListener("click", () => openDetalleForm());
    return;
  }
  if (filtered.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="padding:30px 0;text-align:center;">No se encontraron detalles con esos filtros.</p>`;
    return;
  }

  grid.innerHTML = `<div class="grid-cards">
    ${filtered
      .map(
        (d) => `
      <div class="item-card">
        <div class="item-card-img">
          ${d.imagenUrl ? `<img src="${d.imagenUrl}" alt="${escapeHtml(d.nombre)}" />` : `<div class="placeholder-icon">${icons.gift}</div>`}
        </div>
        <div class="item-card-body">
          <div class="item-card-sub">${escapeHtml(categoriaNombre(d.categoriaId))}</div>
          <div class="item-card-title">${escapeHtml(d.nombre)}</div>
          <div class="item-card-price">${formatCOP(d.precio)}</div>
        </div>
        <div class="item-card-footer" style="flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-view="${d.id}" style="flex:1;">${icons.eye} Ver productos</button>
          <button class="btn btn-icon" data-edit="${d.id}" title="Editar">${icons.edit}</button>
          <button class="btn btn-icon" data-delete="${d.id}" title="Eliminar">${icons.trash}</button>
        </div>
      </div>`
      )
      .join("")}
  </div>`;

  grid.querySelectorAll("[data-view]").forEach((btn) =>
    btn.addEventListener("click", () => openViewProductosModal(allDetalles.find((d) => d.id === btn.dataset.view)))
  );
  grid.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openDetalleForm(allDetalles.find((d) => d.id === btn.dataset.edit)))
  );
  grid.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete))
  );
}

function openViewProductosModal(detalle) {
  openModal({
    title: detalle.nombre,
    bodyHtml: `
      <p class="item-card-price" style="margin-bottom:16px;">${formatCOP(detalle.precio)}</p>
      ${(detalle.productos || [])
        .map((p) => {
          const prod = allProductosCache.find((x) => x.id === p.productoId);
          return `<div class="line-item"><span class="line-item-name">${escapeHtml(prod?.nombre || "Producto eliminado")}</span><span class="si-qty">× ${p.cantidad}</span></div>`;
        })
        .join("") || `<p class="text-muted">Este detalle no tiene productos asignados.</p>`}
    `,
    footerHtml: `<button class="btn btn-primary" id="view-close">Cerrar</button>`,
    onMount: (overlay) => overlay.querySelector("#view-close").addEventListener("click", closeModal),
  });
}

async function handleDelete(id) {
  const detalle = allDetalles.find((d) => d.id === id);
  const ok = await confirmDialog({
    title: "Eliminar detalle",
    message: `¿Seguro que deseas eliminar "${detalle?.nombre}"? Esta acción no se puede deshacer.`,
  });
  if (!ok) return;
  await deleteDetalle(id);
  toast("Detalle eliminado", "success");
}

/* ============================================================
   FORMULARIO CREAR / EDITAR DETALLE
   ============================================================ */
function openDetalleForm(detalle = null) {
  const isEdit = !!detalle;
  let selectedFile = null;
  let productosDetalle = (detalle?.productos || []).map((p) => ({ ...p }));

  openModal({
    title: isEdit ? "Editar detalle" : "Crear detalle",
    wide: true,
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">Imagen</label>
        <div class="input-file-drop" id="detalle-drop">
          ${detalle?.imagenUrl ? `<img src="${detalle.imagenUrl}" class="preview" />` : `<div>${icons.image}</div>`}
          <p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">Haz clic para subir una imagen</p>
          <input type="file" id="detalle-file" accept="image/*" class="hidden" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-label">Nombre del detalle</label>
          <input type="text" id="detalle-nombre" placeholder="Ej: Desayuno Especial" value="${escapeHtml(detalle?.nombre || "")}" required />
        </div>
        <div class="form-group">
          <label class="field-label">Categoría</label>
          <select id="detalle-categoria">
            <option value="">Selecciona una categoría</option>
            ${allCategorias.map((c) => `<option value="${c.id}" ${detalle?.categoriaId === c.id ? "selected" : ""}>${escapeHtml(c.nombre)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-group" style="max-width:220px;">
        <label class="field-label">Precio</label>
        <input type="text" inputmode="numeric" id="detalle-precio" placeholder="$0" value="${detalle ? formatCOP(detalle.precio) : ""}" />
      </div>

      <div class="form-section-title">Productos del detalle</div>
      <div class="autocomplete-wrap" style="margin-bottom:14px;">
        <div class="search-box">
          ${icons.search}
          <input type="text" id="detalle-producto-search" placeholder="Buscar producto para agregar..." autocomplete="off" />
        </div>
        <div id="detalle-autocomplete-list"></div>
      </div>
      <div id="detalle-productos-list"></div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="detalle-cancel">Cancelar</button>
      <button class="btn btn-primary" id="detalle-save">${isEdit ? "Guardar cambios" : "Crear detalle"}</button>
    `,
    onMount: (overlay) => {
      // Imagen
      const drop = overlay.querySelector("#detalle-drop");
      const fileInput = overlay.querySelector("#detalle-file");
      drop.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          drop.innerHTML = `<img src="${e.target.result}" class="preview" /><p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">Haz clic para cambiar la imagen</p>`;
        };
        reader.readAsDataURL(file);
      });

      // Precio: formatea como moneda mientras el usuario escribe
      const precioInput = overlay.querySelector("#detalle-precio");
      precioInput.addEventListener("input", () => {
        const raw = parseCOPInput(precioInput.value);
        precioInput.value = raw ? formatCOP(raw) : "";
      });

      function renderProductosList() {
        const listEl = overlay.querySelector("#detalle-productos-list");
        if (productosDetalle.length === 0) {
          listEl.innerHTML = `<p class="text-muted" style="font-size:13.5px;padding:10px 0;">Todavía no has agregado productos a este detalle.</p>`;
          return;
        }
        listEl.innerHTML = productosDetalle
          .map((p) => {
            const prod = allProductosCache.find((x) => x.id === p.productoId);
            return `
            <div class="line-item" data-line="${p.productoId}">
              <span class="line-item-name">${escapeHtml(prod?.nombre || "Producto")}</span>
              <div class="qty-stepper">
                <button type="button" data-qty-dec>−</button>
                <input type="number" min="1" value="${p.cantidad}" data-qty-input />
                <button type="button" data-qty-inc>+</button>
              </div>
              <button class="btn btn-icon" data-remove-line title="Quitar">${icons.trash}</button>
            </div>`;
          })
          .join("");

        listEl.querySelectorAll("[data-line]").forEach((row) => {
          const productoId = row.dataset.line;
          const item = productosDetalle.find((p) => p.productoId === productoId);
          row.querySelector("[data-qty-dec]").addEventListener("click", () => {
            item.cantidad = Math.max(1, item.cantidad - 1);
            renderProductosList();
          });
          row.querySelector("[data-qty-inc]").addEventListener("click", () => {
            item.cantidad = item.cantidad + 1;
            renderProductosList();
          });
          row.querySelector("[data-qty-input]").addEventListener("change", (e) => {
            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
            item.cantidad = val;
            renderProductosList();
          });
          row.querySelector("[data-remove-line]").addEventListener("click", () => {
            productosDetalle = productosDetalle.filter((p) => p.productoId !== productoId);
            renderProductosList();
          });
        });
      }
      renderProductosList();

      // Autocompletado de productos
      const searchInput = overlay.querySelector("#detalle-producto-search");
      const acList = overlay.querySelector("#detalle-autocomplete-list");

      function showResults(term) {
        if (!term) {
          acList.innerHTML = "";
          return;
        }
        const matches = allProductosCache.filter((p) => matchesSearch(p.nombre, term)).slice(0, 8);
        acList.innerHTML = `
          <div class="autocomplete-list">
            ${
              matches.length === 0
                ? `<div class="autocomplete-empty">Sin coincidencias</div>`
                : matches
                    .map(
                      (p) => `
                <div class="autocomplete-item" data-add-producto="${p.id}">
                  ${p.imagenUrl ? `<img src="${p.imagenUrl}" class="ac-thumb" />` : `<span class="ac-thumb flex-center">${icons.box}</span>`}
                  <span>${escapeHtml(p.nombre)}</span>
                </div>`
                    )
                    .join("")
            }
            <div class="autocomplete-item autocomplete-new" data-create-producto="1">${icons.plus} Crear nuevo producto "${escapeHtml(term)}"</div>
          </div>
        `;
        acList.querySelectorAll("[data-add-producto]").forEach((el) =>
          el.addEventListener("click", () => {
            addProductoToDetalle(el.dataset.addProducto);
            searchInput.value = "";
            acList.innerHTML = "";
          })
        );
        acList.querySelector("[data-create-producto]")?.addEventListener("click", () => {
          openProductoForm(null, (nuevo) => {
            allProductosCache.push(nuevo);
            addProductoToDetalle(nuevo.id);
          });
          // Pre-fill the name field of the new producto form once it's mounted
          setTimeout(() => {
            const nameInput = document.getElementById("producto-nombre");
            if (nameInput) nameInput.value = term;
          }, 30);
          searchInput.value = "";
          acList.innerHTML = "";
        });
      }

      function addProductoToDetalle(productoId) {
        const existing = productosDetalle.find((p) => p.productoId === productoId);
        if (existing) existing.cantidad += 1;
        else productosDetalle.push({ productoId, cantidad: 1 });
        renderProductosList();
      }

      searchInput.addEventListener("input", debounce((e) => showResults(e.target.value.trim()), 150));
      document.addEventListener("click", (e) => {
        if (!acList.contains(e.target) && e.target !== searchInput) acList.innerHTML = "";
      });

      // Guardar
      overlay.querySelector("#detalle-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#detalle-save").addEventListener("click", async () => {
        const nombre = overlay.querySelector("#detalle-nombre").value.trim();
        const categoriaId = overlay.querySelector("#detalle-categoria").value;
        const precio = parseCOPInput(overlay.querySelector("#detalle-precio").value);

        if (!nombre) return toast("El nombre es obligatorio", "error");
        if (!categoriaId) return toast("Selecciona una categoría", "error");
        if (!precio || precio <= 0) return toast("Ingresa un precio válido", "error");
        if (productosDetalle.length === 0) {
          const ok = await confirmDialog({
            title: "Detalle sin productos",
            message: "No has agregado productos a este detalle. ¿Deseas guardarlo de todas formas?",
            confirmText: "Guardar de todas formas",
            danger: false,
          });
          if (!ok) return;
        }

        const saveBtn = overlay.querySelector("#detalle-save");
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
        try {
          let imagenUrl = detalle?.imagenUrl || null;
          if (selectedFile) imagenUrl = await uploadImageAndGetURL(selectedFile, "detalles");
          const payload = { nombre, categoriaId, precio, imagenUrl, productos: productosDetalle };
          if (isEdit) {
            await updateDetalle(detalle.id, payload);
            toast("Detalle actualizado", "success");
          } else {
            await addDetalle(payload);
            toast("Detalle creado correctamente", "success");
          }
          closeModal();
        } catch (e) {
          toast("Ocurrió un error al guardar el detalle", "error");
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? "Guardar cambios" : "Crear detalle";
        }
      });
    },
  });
}
