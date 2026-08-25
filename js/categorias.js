// ============================================================
// CATEGORÍAS — CRUD (accesible desde la página de Detalles)
// ============================================================
import {
  addCategoria,
  updateCategoria,
  deleteCategoria,
  categoriaTieneDetalles,
  reasignarDetallesDeCategoria,
} from "./data.js";
import { openModal, closeModal, confirmDialog, toast, escapeHtml, icons } from "./utils.js";

export function openCategoriasManagerModal(categorias) {
  renderManager(categorias);
}

function renderManager(categorias) {
  openModal({
    title: "Gestionar Categorías",
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">Nueva categoría</label>
        <div class="flex gap-8">
          <input type="text" id="cat-new-name" placeholder="Ej: Desayunos" />
          <button class="btn btn-primary" id="cat-add-btn" style="flex-shrink:0;">${icons.plus} Agregar</button>
        </div>
      </div>
      <div class="form-section-title">Categorías existentes</div>
      <div id="cat-list">
        ${
          categorias.length === 0
            ? `<p class="text-muted" style="font-size:13.5px;">Todavía no hay categorías.</p>`
            : categorias
                .map(
                  (c) => `
              <div class="line-item" data-id="${c.id}">
                <span class="line-item-name" data-view>${escapeHtml(c.nombre)}</span>
                <input type="text" class="hidden" data-edit value="${escapeHtml(c.nombre)}" style="flex:1;padding:8px 10px;" />
                <button class="btn btn-icon" data-action="edit" title="Editar">${icons.edit}</button>
                <button class="btn btn-icon" data-action="save" title="Guardar" style="display:none;">${icons.check}</button>
                <button class="btn btn-icon" data-action="delete" title="Eliminar">${icons.trash}</button>
              </div>`
                )
                .join("")
        }
      </div>
    `,
    onMount: (overlay) => {
      overlay.querySelector("#cat-add-btn").addEventListener("click", async () => {
        const input = overlay.querySelector("#cat-new-name");
        const name = input.value.trim();
        if (!name) return toast("Escribe un nombre para la categoría", "error");
        try {
          await addCategoria(name);
          toast("Categoría creada correctamente", "success");
          input.value = "";
        } catch (e) {
          toast("No fue posible crear la categoría", "error");
        }
      });

      overlay.querySelectorAll(".line-item").forEach((row) => {
        const id = row.dataset.id;
        const viewEl = row.querySelector("[data-view]");
        const editEl = row.querySelector("[data-edit]");
        const editBtn = row.querySelector('[data-action="edit"]');
        const saveBtn = row.querySelector('[data-action="save"]');
        const delBtn = row.querySelector('[data-action="delete"]');

        editBtn.addEventListener("click", () => {
          viewEl.classList.add("hidden");
          editEl.classList.remove("hidden");
          editBtn.style.display = "none";
          saveBtn.style.display = "inline-flex";
        });
        saveBtn.addEventListener("click", async () => {
          const newName = editEl.value.trim();
          if (!newName) return toast("El nombre no puede estar vacío", "error");
          await updateCategoria(id, newName);
          toast("Categoría actualizada", "success");
        });
        delBtn.addEventListener("click", async () => {
          const enUso = await categoriaTieneDetalles(id);
          if (enUso) {
            const otras = categorias.filter((c) => c.id !== id);
            if (otras.length === 0) {
              toast("No puedes eliminar la única categoría que tiene detalles asociados", "error");
              return;
            }
            openReassignModal(id, row.querySelector("[data-view]").textContent, otras, categorias);
            return;
          }
          const ok = await confirmDialog({
            title: "Eliminar categoría",
            message: `¿Seguro que deseas eliminar "${viewEl.textContent}"? Esta acción no se puede deshacer.`,
          });
          if (ok) {
            await deleteCategoria(id);
            toast("Categoría eliminada", "success");
            closeModal();
          }
        });
      });
    },
  });
}

function openReassignModal(categoriaId, categoriaNombre, otrasCategorias, allCategorias) {
  openModal({
    title: "Reasignar detalles antes de eliminar",
    bodyHtml: `
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
        La categoría "<strong>${escapeHtml(categoriaNombre)}</strong>" tiene detalles asociados. Selecciona a qué categoría deseas moverlos antes de eliminarla.
      </p>
      <div class="form-group">
        <label class="field-label">Mover detalles a</label>
        <select id="reassign-target">
          ${otrasCategorias.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("")}
        </select>
      </div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="reassign-cancel">Cancelar</button>
      <button class="btn btn-danger" id="reassign-confirm">Reasignar y eliminar</button>
    `,
    onMount: (overlay) => {
      overlay.querySelector("#reassign-cancel").addEventListener("click", () => renderManager(allCategorias));
      overlay.querySelector("#reassign-confirm").addEventListener("click", async () => {
        const targetId = overlay.querySelector("#reassign-target").value;
        await reasignarDetallesDeCategoria(categoriaId, targetId);
        await deleteCategoria(categoriaId);
        toast("Detalles reasignados y categoría eliminada", "success");
        closeModal();
      });
    },
  });
}
