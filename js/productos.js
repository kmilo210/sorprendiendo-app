// ============================================================
// PRODUCTOS
// ============================================================
import {
  listenProductos,
  addProducto,
  updateProducto,
  deleteProducto,
  productoEstaEnUso,
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
  uploadImageAndGetURL,
  emptyStateHtml,
  skeletonGridHtml,
} from "./utils.js";
import { registerCleanup } from "./app.js";

let allProductos = [];
let allProveedoresCache = [];
let searchTerm = "";

export function getProveedoresCache() {
  return allProveedoresCache;
}

export function renderProductos(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Listado de Productos</h1>
        <p>Los productos son los ingredientes o elementos que componen tus detalles.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-new-producto">+ Crear Producto</button>
      </div>
    </div>
    <div class="search-box" style="max-width:360px;margin-bottom:22px;">
      ${icons.search}
      <input type="search" id="producto-search" placeholder="Buscar producto... ej: jugo hit" />
    </div>
    <div id="productos-grid">${skeletonGridHtml()}</div>
  `;

  document.getElementById("btn-new-producto").addEventListener("click", () => openProductoForm());
  const debouncedSearch = debounce((val) => {
    searchTerm = val;
    renderGrid();
  }, 200);
  document.getElementById("producto-search").addEventListener("input", (e) => debouncedSearch(e.target.value));

  const unsub1 = listenProductos((data) => {
    allProductos = data;
    renderGrid();
  });
  const unsub2 = listenProveedores((data) => {
    allProveedoresCache = data;
  });
  registerCleanup(unsub1);
  registerCleanup(unsub2);
}

function proveedorNombre(id) {
  return allProveedoresCache.find((p) => p.id === id)?.nombre || "—";
}

function renderGrid() {
  const grid = document.getElementById("productos-grid");
  if (!grid) return;
  const filtered = searchTerm ? allProductos.filter((p) => matchesSearch(p.nombre, searchTerm)) : allProductos;

  if (allProductos.length === 0) {
    grid.innerHTML = emptyStateHtml({
      icon: "📦",
      title: "Todavía no tienes productos registrados",
      message: "Agrega tu primer producto para comenzar.",
      actionHtml: `<button class="btn btn-primary" id="empty-add-producto">${icons.plus} Crear producto</button>`,
    });
    grid.querySelector("#empty-add-producto")?.addEventListener("click", () => openProductoForm());
    return;
  }
  if (filtered.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="padding:30px 0;text-align:center;">No se encontraron productos con esa búsqueda.</p>`;
    return;
  }

  grid.innerHTML = `<div class="grid-cards">
    ${filtered
      .map((p) => {
        const preferido = (p.proveedores || []).find((x) => x.preferido);
        return `
      <div class="item-card">
        <div class="item-card-img">
          ${p.imagenUrl ? `<img src="${p.imagenUrl}" alt="${escapeHtml(p.nombre)}" />` : `<div class="placeholder-icon">${icons.box}</div>`}
        </div>
        <div class="item-card-body">
          <div class="item-card-title">${escapeHtml(p.nombre)}</div>
          <div class="item-card-sub">${(p.proveedores || []).length} proveedor(es)${
          preferido ? ` · Preferido: ${escapeHtml(proveedorNombre(preferido.proveedorId))}` : ""
        }</div>
        </div>
        <div class="item-card-footer">
          <button class="btn btn-outline btn-sm product-edit-btn" data-edit="${p.id}">
            ${icons.edit} Editar
          </button>
          <button class="btn btn-icon" data-delete="${p.id}" title="Eliminar">${icons.trash}</button>
        </div>
      </div>`;
      })
      .join("")}
  </div>`;

  grid.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openProductoForm(allProductos.find((p) => p.id === btn.dataset.edit)))
  );
  grid.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete))
  );
}

async function handleDelete(id) {
  const producto = allProductos.find((p) => p.id === id);
  const enUso = await productoEstaEnUso(id);
  if (enUso) {
    toast("Este producto está siendo usado en uno o más detalles. Elimínalo primero de esos detalles.", "error");
    return;
  }
  const ok = await confirmDialog({
    title: "Eliminar producto",
    message: `¿Seguro que deseas eliminar "${producto?.nombre}"? Esta acción no se puede deshacer.`,
  });
  if (!ok) return;
  await deleteProducto(id);
  toast("Producto eliminado", "success");
}

export function openProductoForm(producto = null, onCreated = null) {
  const isEdit = !!producto;
  let selectedFile = null;
  let seleccion = (producto?.proveedores || []).map((x) => ({ ...x }));

  function proveedoresChecklistHtml() {
    if (allProveedoresCache.length === 0) {
      return `<p class="text-muted" style="font-size:13px;">No hay proveedores registrados todavía. Puedes crear uno desde la sección Proveedores.</p>`;
    }
    return allProveedoresCache
      .map((prov) => {
        const sel = seleccion.find((s) => s.proveedorId === prov.id);
        return `
        <div class="line-item" data-prov-row="${prov.id}">
          <label class="checkbox-row" style="flex:1;">
            <input type="checkbox" data-prov-check="${prov.id}" ${sel ? "checked" : ""} />
            <span class="line-item-name">${escapeHtml(prov.nombre)}</span>
          </label>
          <label class="checkbox-row" style="font-size:12.5px;color:var(--text-secondary);">
            <input type="radio" name="prov-preferido" data-prov-preferido="${prov.id}" ${sel?.preferido ? "checked" : ""} ${sel ? "" : "disabled"} />
            Preferido
          </label>
        </div>`;
      })
      .join("");
  }

  openModal({
    title: isEdit ? "Editar producto" : "Crear producto",
    wide: true,
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">Imagen (opcional)</label>
        <div class="input-file-drop" id="producto-drop">
          ${
            producto?.imagenUrl
              ? `<img src="${producto.imagenUrl}" class="preview" />`
              : `<div>${icons.image}</div>`
          }
          <p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">Haz clic para subir una imagen</p>
          <input type="file" id="producto-file" accept="image/*" class="hidden" />
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">Nombre del producto</label>
        <input type="text" id="producto-nombre" placeholder="Ej: Jugo Hit Mango 500 ml" value="${escapeHtml(producto?.nombre || "")}" required />
      </div>
      <div class="form-section-title">Proveedores</div>
      <p class="field-hint" style="margin-bottom:10px;">Selecciona los proveedores que venden este producto y marca cuál es el preferido para las listas de compras.</p>
      <div id="producto-proveedores">${proveedoresChecklistHtml()}</div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="producto-cancel">Cancelar</button>
      <button class="btn btn-primary" id="producto-save">${isEdit ? "Guardar cambios" : "Crear producto"}</button>
    `,
    onMount: (overlay) => {
      const drop = overlay.querySelector("#producto-drop");
      const fileInput = overlay.querySelector("#producto-file");
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

      function bindProveedorEvents() {
        overlay.querySelectorAll("[data-prov-check]").forEach((chk) => {
          chk.addEventListener("change", () => {
            const id = chk.dataset.provCheck;
            const radio = overlay.querySelector(`[data-prov-preferido="${id}"]`);
            if (chk.checked) {
              if (!seleccion.find((s) => s.proveedorId === id)) {
                const esPrimero = seleccion.length === 0;
                seleccion.push({ proveedorId: id, preferido: esPrimero });
                if (esPrimero) radio.checked = true;
              }
              radio.disabled = false;
            } else {
              seleccion = seleccion.filter((s) => s.proveedorId !== id);
              radio.disabled = true;
              radio.checked = false;
              // Si se quita el preferido, asigna el primero restante
              if (seleccion.length > 0 && !seleccion.some((s) => s.preferido)) {
                seleccion[0].preferido = true;
                overlay.querySelector(`[data-prov-preferido="${seleccion[0].proveedorId}"]`).checked = true;
              }
            }
          });
        });
        overlay.querySelectorAll("[data-prov-preferido]").forEach((radio) => {
          radio.addEventListener("change", () => {
            seleccion.forEach((s) => (s.preferido = s.proveedorId === radio.dataset.provPreferido));
          });
        });
      }
      bindProveedorEvents();

      overlay.querySelector("#producto-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#producto-save").addEventListener("click", async () => {
        const nombre = overlay.querySelector("#producto-nombre").value.trim();
        if (!nombre) return toast("El nombre es obligatorio", "error");
        const saveBtn = overlay.querySelector("#producto-save");
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
        try {
          let imagenUrl = producto?.imagenUrl || null;
          if (selectedFile) imagenUrl = await uploadImageAndGetURL(selectedFile, "productos");
          if (isEdit) {
            await updateProducto(producto.id, { nombre, imagenUrl, proveedores: seleccion });
            toast("Producto actualizado", "success");
          } else {
            const ref = await addProducto({ nombre, imagenUrl, proveedores: seleccion });
            toast("Producto creado correctamente", "success");
            if (onCreated) onCreated({ id: ref.id, nombre, imagenUrl, proveedores: seleccion });
          }
          closeModal();
        } catch (e) {
          toast("Ocurrió un error al guardar el producto", "error");
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? "Guardar cambios" : "Crear producto";
        }
      });
    },
  });
}
