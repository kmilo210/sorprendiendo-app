// ============================================================
// PROVEEDORES
// ============================================================
import {
  listenProveedores,
  addProveedor,
  updateProveedor,
  deleteProveedor,
  proveedorEstaEnUso,
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
  loadingHtml,
  emptyStateHtml,
  skeletonGridHtml,
} from "./utils.js";
import { registerCleanup } from "./app.js";

let allProveedores = [];
let searchTerm = "";

export function listenProveedoresGlobal(cb) {
  return listenProveedores(cb);
}

export function renderProveedores(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Proveedores</h1>
        <p>Administra los proveedores de tus productos.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-new-proveedor">+ Crear proveedor</button>
      </div>
    </div>
    <div class="search-box" style="max-width:360px;margin-bottom:22px;">
      ${icons.search}
      <input type="search" id="proveedor-search" placeholder="Buscar proveedor..." />
    </div>
    <div id="proveedores-grid">${skeletonGridHtml()}</div>
  `;

  document.getElementById("btn-new-proveedor").addEventListener("click", () => openProveedorForm());
  const debouncedSearch = debounce((val) => {
    searchTerm = val;
    renderGrid();
  }, 200);
  document.getElementById("proveedor-search").addEventListener("input", (e) => debouncedSearch(e.target.value));

  const unsub = listenProveedores((data) => {
    allProveedores = data;
    renderGrid();
  });
  registerCleanup(unsub);
}

function renderGrid() {
  const grid = document.getElementById("proveedores-grid");
  if (!grid) return;
  const filtered = searchTerm ? allProveedores.filter((p) => matchesSearch(p.nombre, searchTerm)) : allProveedores;

  if (allProveedores.length === 0) {
    grid.innerHTML = emptyStateHtml({
      icon: "🚚",
      title: "Todavía no tienes proveedores registrados",
      message: "Agrega tu primer proveedor para comenzar.",
      actionHtml: `<button class="btn btn-primary" id="empty-add-proveedor">${icons.plus} Crear proveedor</button>`,
    });
    grid.querySelector("#empty-add-proveedor")?.addEventListener("click", () => openProveedorForm());
    return;
  }
  if (filtered.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="padding:30px 0;text-align:center;">No se encontraron proveedores con ese nombre.</p>`;
    return;
  }

  grid.innerHTML = `<div class="grid-cards">
    ${filtered
      .map(
        (p) => `
      <div class="item-card">
        <div class="item-card-img">
          ${
            p.imagenUrl
              ? `<img src="${p.imagenUrl}" alt="${escapeHtml(p.nombre)}" />`
              : `<div class="placeholder-icon">${icons.truck}</div>`
          }
        </div>
        <div class="item-card-body">
          <div class="item-card-title">${escapeHtml(p.nombre)}</div>
        </div>
        <div class="item-card-footer">
          <button class="btn btn-outline btn-sm provider-edit-btn" data-edit="${p.id}">
            ${icons.edit} Editar
          </button>
          <button class="btn btn-icon" data-delete="${p.id}" title="Eliminar">${icons.trash}</button>
        </div>
      </div>`
      )
      .join("")}
  </div>`;

  grid.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openProveedorForm(allProveedores.find((p) => p.id === btn.dataset.edit)))
  );
  grid.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete))
  );
}

async function handleDelete(id) {
  const enUso = await proveedorEstaEnUso(id);
  const proveedor = allProveedores.find((p) => p.id === id);
  const ok = await confirmDialog({
    title: "Eliminar proveedor",
    message: enUso
      ? `"${proveedor?.nombre}" está asociado a uno o más productos. Si lo eliminas, deberás asignar un nuevo proveedor a esos productos. ¿Deseas continuar?`
      : `¿Seguro que deseas eliminar "${proveedor?.nombre}"? Esta acción no se puede deshacer.`,
  });
  if (!ok) return;
  await deleteProveedor(id);
  toast("Proveedor eliminado", "success");
}

function openProveedorForm(proveedor = null) {
  const isEdit = !!proveedor;
  let selectedFile = null;

  openModal({
    title: isEdit ? "Editar proveedor" : "Crear proveedor",
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">Logo o imagen (opcional)</label>
        <div class="input-file-drop" id="proveedor-drop">
          ${
            proveedor?.imagenUrl
              ? `<img src="${proveedor.imagenUrl}" class="preview" id="proveedor-preview" />`
              : `<div id="proveedor-preview-icon">${icons.image}</div>`
          }
          <p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">Haz clic para subir una imagen</p>
          <input type="file" id="proveedor-file" accept="image/*" class="hidden" />
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">Nombre del proveedor</label>
        <input type="text" id="proveedor-nombre" placeholder="Ej: Distribuidora El Fruver" value="${escapeHtml(proveedor?.nombre || "")}" required />
      </div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="proveedor-cancel">Cancelar</button>
      <button class="btn btn-primary" id="proveedor-save">${isEdit ? "Guardar cambios" : "Crear proveedor"}</button>
    `,
    onMount: (overlay) => {
      const drop = overlay.querySelector("#proveedor-drop");
      const fileInput = overlay.querySelector("#proveedor-file");
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

      overlay.querySelector("#proveedor-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#proveedor-save").addEventListener("click", async () => {
        const nombre = overlay.querySelector("#proveedor-nombre").value.trim();
        if (!nombre) return toast("El nombre es obligatorio", "error");
        const saveBtn = overlay.querySelector("#proveedor-save");
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
        try {
          let imagenUrl = proveedor?.imagenUrl || null;
          if (selectedFile) imagenUrl = await uploadImageAndGetURL(selectedFile, "proveedores");
          if (isEdit) {
            await updateProveedor(proveedor.id, { nombre, imagenUrl });
            toast("Proveedor actualizado", "success");
          } else {
            await addProveedor({ nombre, imagenUrl });
            toast("Proveedor creado correctamente", "success");
          }
          closeModal();
        } catch (e) {
          toast("Ocurrió un error al guardar el proveedor", "error");
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? "Guardar cambios" : "Crear proveedor";
        }
      });
    },
  });
}
