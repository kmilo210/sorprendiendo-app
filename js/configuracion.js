// ============================================================
// CONFIGURACIÓN — Ocasiones y datos de la cuenta
// ============================================================
import { listenOcasiones, addOcasion, updateOcasion, deleteOcasion, OCASIONES_INICIALES } from "./data.js";
import { confirmDialog, toast, escapeHtml, icons, loadingHtml, emptyStateHtml } from "./utils.js";
import { registerCleanup } from "./app.js";
import { auth } from "./firebase-config.js";

let allOcasiones = [];

export function renderConfiguracion(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Configuración</h1>
        <p>Administra las opciones generales del sistema.</p>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:24px;">
      <h3 style="font-size:15.5px;margin-bottom:4px;">Cuenta</h3>
      <p class="text-muted" style="font-size:13.5px;margin-bottom:14px;">Sesión iniciada como <strong>${escapeHtml(auth.currentUser?.email || "")}</strong></p>
      <p class="field-hint">Para cambiar la contraseña de este usuario, hazlo desde Firebase Authentication en la consola de Firebase (ver README del proyecto).</p>
    </div>

    <div class="card card-pad">
      <div class="flex-between" style="margin-bottom:6px;">
        <h3 style="font-size:15.5px;">Ocasiones</h3>
      </div>
      <p class="text-muted" style="font-size:13.5px;margin-bottom:18px;">
        Lista estandarizada de ocasiones disponibles al registrar un pedido. Selecciona siempre desde esta lista para mantener informes confiables.
      </p>
      <div class="flex gap-8" style="margin-bottom:18px;max-width:420px;">
        <input type="text" id="ocasion-new" placeholder="Ej: Grado" />
        <button class="btn btn-primary" id="ocasion-add-btn" style="flex-shrink:0;">${icons.plus} Agregar</button>
      </div>
      <div id="ocasiones-list">${loadingHtml("Cargando ocasiones...")}</div>
    </div>
  `;

  document.getElementById("ocasion-add-btn").addEventListener("click", async () => {
    const input = document.getElementById("ocasion-new");
    const nombre = input.value.trim();
    if (!nombre) return toast("Escribe el nombre de la ocasión", "error");
    await addOcasion(nombre);
    toast("Ocasión creada correctamente", "success");
    input.value = "";
  });

  const unsub = listenOcasiones((data) => {
    allOcasiones = data;
    renderList();
  });
  registerCleanup(unsub);
}

function renderList() {
  const el = document.getElementById("ocasiones-list");
  if (!el) return;

  if (allOcasiones.length === 0) {
    el.innerHTML = emptyStateHtml({
      icon: "🎉",
      title: "No hay ocasiones configuradas",
      message: "Puedes cargar la lista sugerida inicial o crear las tuyas manualmente arriba.",
      actionHtml: `<button class="btn btn-primary" id="btn-load-suggested">${icons.plus} Cargar ocasiones sugeridas</button>`,
    });
    el.querySelector("#btn-load-suggested").addEventListener("click", async () => {
      await Promise.all(OCASIONES_INICIALES.map((n) => addOcasion(n)));
      toast("Ocasiones sugeridas cargadas", "success");
    });
    return;
  }

  el.innerHTML = allOcasiones
    .map(
      (o) => `
    <div class="line-item" data-id="${o.id}">
      <span class="line-item-name" data-view>${escapeHtml(o.nombre)}</span>
      <input type="text" class="hidden" data-edit value="${escapeHtml(o.nombre)}" style="flex:1;padding:8px 10px;" />
      <button class="btn btn-icon" data-action="edit" title="Editar">${icons.edit}</button>
      <button class="btn btn-icon" data-action="save" title="Guardar" style="display:none;">${icons.check}</button>
      <button class="btn btn-icon" data-action="delete" title="Eliminar">${icons.trash}</button>
    </div>`
    )
    .join("");

  el.querySelectorAll(".line-item").forEach((row) => {
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
      await updateOcasion(id, newName);
      toast("Ocasión actualizada", "success");
    });
    delBtn.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "Eliminar ocasión",
        message: `¿Seguro que deseas eliminar "${viewEl.textContent}"? Los pedidos ya registrados con esta ocasión conservarán su nombre histórico.`,
      });
      if (ok) {
        await deleteOcasion(id);
        toast("Ocasión eliminada", "success");
      }
    });
  });
}
