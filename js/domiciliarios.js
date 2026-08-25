// ============================================================
// DOMICILIARIOS + INFORMES DE PAGOS A DOMICILIARIOS
// ============================================================
import {
  listenDomiciliarios,
  addDomiciliario,
  updateDomiciliario,
  setDomiciliarioActivo,
  listenDomiciliosPorDomiciliario,
  marcarDomicilioPagado,
  eliminarDomiciliosPagados,
} from "./data.js";
import {
  openModal,
  closeModal,
  confirmDialog,
  toast,
  escapeHtml,
  icons,
  formatCOP,
  formatDateStr,
  emptyStateHtml,
  loadingHtml,
} from "./utils.js";
import { registerCleanup } from "./app.js";

let allDomiciliarios = [];

export function renderDomiciliarios(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Domiciliarios</h1>
        <p>Gestiona tu equipo de domicilios y consulta sus pagos pendientes.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-new-domiciliario">+ Crear domiciliario</button>
      </div>
    </div>
    <div id="domiciliarios-list">${loadingHtml("Cargando domiciliarios...")}</div>
  `;

  document.getElementById("btn-new-domiciliario").addEventListener("click", () => openDomiciliarioForm());

  const unsub = listenDomiciliarios((data) => {
    allDomiciliarios = data;
    renderList();
  });
  registerCleanup(unsub);
}

function renderList() {
  const el = document.getElementById("domiciliarios-list");
  if (!el) return;
  if (allDomiciliarios.length === 0) {
    el.innerHTML = emptyStateHtml({
      icon: "🛵",
      title: "Todavía no tienes domiciliarios registrados",
      message: "Agrega tu primer domiciliario para asignar pedidos.",
      actionHtml: `<button class="btn btn-primary" id="empty-add-dom">${icons.plus} Crear domiciliario</button>`,
    });
    el.querySelector("#empty-add-dom")?.addEventListener("click", () => openDomiciliarioForm());
    return;
  }

  el.innerHTML = `<div class="grid-cards">
    ${allDomiciliarios
      .map(
        (d) => `
      <div class="item-card">
        <div class="item-card-body">
          <div class="flex-between">
            <div class="item-card-title">${escapeHtml(d.nombre)}</div>
            <span class="badge ${d.activo ? "badge-success" : "badge-neutral"}">${d.activo ? "ACTIVO" : "INACTIVO"}</span>
          </div>
        </div>
        <div class="item-card-footer" style="flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-report="${d.id}" style="flex:1;">${icons.chart} Ver informe</button>
          <button class="btn btn-icon" data-edit="${d.id}" title="Editar">${icons.edit}</button>
          <button class="btn btn-icon" data-toggle="${d.id}" title="${d.activo ? "Desactivar" : "Activar"}">
            ${d.activo ? icons.trash : icons.check}
          </button>
        </div>
      </div>`
      )
      .join("")}
  </div>`;

  el.querySelectorAll("[data-report]").forEach((btn) =>
    btn.addEventListener("click", () => openInformeDomiciliario(allDomiciliarios.find((d) => d.id === btn.dataset.report)))
  );
  el.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openDomiciliarioForm(allDomiciliarios.find((d) => d.id === btn.dataset.edit)))
  );
  el.querySelectorAll("[data-toggle]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const d = allDomiciliarios.find((x) => x.id === btn.dataset.toggle);
      const ok = await confirmDialog({
        title: d.activo ? "Desactivar domiciliario" : "Activar domiciliario",
        message: d.activo
          ? `"${d.nombre}" ya no aparecerá disponible para nuevos pedidos, pero se conservará su historial.`
          : `"${d.nombre}" volverá a estar disponible para nuevos pedidos.`,
        confirmText: d.activo ? "Desactivar" : "Activar",
        danger: d.activo,
      });
      if (!ok) return;
      await setDomiciliarioActivo(d.id, !d.activo);
      toast(d.activo ? "Domiciliario desactivado" : "Domiciliario activado", "success");
    })
  );
}

function openDomiciliarioForm(domiciliario = null) {
  const isEdit = !!domiciliario;
  openModal({
    title: isEdit ? "Editar domiciliario" : "Crear domiciliario",
    bodyHtml: `
      <div class="form-group">
        <label class="field-label">Nombre</label>
        <input type="text" id="dom-nombre" value="${escapeHtml(domiciliario?.nombre || "")}" placeholder="Ej: Carlos Ramírez" />
      </div>
    `,
    footerHtml: `
      <button class="btn btn-ghost" id="dom-cancel">Cancelar</button>
      <button class="btn btn-primary" id="dom-save">${isEdit ? "Guardar cambios" : "Crear domiciliario"}</button>
    `,
    onMount: (overlay) => {
      overlay.querySelector("#dom-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#dom-save").addEventListener("click", async () => {
        const nombre = overlay.querySelector("#dom-nombre").value.trim();
        if (!nombre) return toast("El nombre es obligatorio", "error");
        if (isEdit) await updateDomiciliario(domiciliario.id, { nombre });
        else await addDomiciliario(nombre);
        toast(isEdit ? "Domiciliario actualizado" : "Domiciliario creado correctamente", "success");
        closeModal();
      });
    },
  });
}

/* ---------- Informe de pagos por domiciliario ---------- */
let unsubReport = null;
function openInformeDomiciliario(domiciliario) {
  let registros = [];

  const overlay = openModal({
    title: `Informe de ${domiciliario.nombre}`,
    wide: true,
    bodyHtml: `<div id="informe-dom-body">${loadingHtml("Cargando historial...")}</div>`,
    footerHtml: `<button class="btn btn-primary" id="informe-close">Cerrar</button>`,
    onMount: (ov) => {
      ov.querySelector("#informe-close").addEventListener("click", () => {
        if (unsubReport) unsubReport();
        closeModal();
      });
    },
  });

  function paint() {
    const body = document.getElementById("informe-dom-body");
    if (!body) return;
    const pendientes = registros.filter((r) => !r.pagado);
    const pagados = registros.filter((r) => r.pagado);
    const totalPendiente = pendientes.reduce((s, r) => s + (r.valorDomicilio || 0), 0);
    const totalPagado = pagados.reduce((s, r) => s + (r.valorDomicilio || 0), 0);

    body.innerHTML = `
      <div class="stat-grid" style="grid-template-columns:1fr 1fr;margin-bottom:20px;">
        ${
          '<div class="stat-card"><div class="stat-icon" style="background:var(--warning-bg);color:var(--warning-text);">' +
          icons.truck +
          `</div><div><div class="stat-value">${formatCOP(totalPendiente)}</div><div class="stat-label">Total a pagar</div></div></div>`
        }
        ${
          '<div class="stat-card"><div class="stat-icon" style="background:var(--success-bg);color:var(--success);">' +
          icons.check +
          `</div><div><div class="stat-value">${formatCOP(totalPagado)}</div><div class="stat-label">Total pagado</div></div></div>`
        }
      </div>
      ${
        registros.length === 0
          ? emptyStateHtml({ icon: "🛵", title: "Sin domicilios registrados", message: "Este domiciliario todavía no tiene domicilios asociados a pedidos." })
          : `
      <div class="flex-between" style="margin-bottom:10px;">
        <h3 style="font-size:14.5px;">Historial de domicilios</h3>
        ${pagados.length > 0 ? `<button class="btn btn-ghost btn-sm" id="btn-limpiar-pagados">${icons.trash} Eliminar registros pagados</button>` : ""}
      </div>
      <div class="table-wrap table-as-cards">
        <table>
          <thead><tr><th>Fecha</th><th>Envía</th><th>Sorprendido</th><th>Detalle</th><th>Valor</th><th>Estado</th></tr></thead>
          <tbody>
            ${registros
              .map(
                (r) => `
              <tr>
                <td data-label="Fecha">${formatDateStr(r.fecha)}</td>
                <td data-label="Envía">${escapeHtml(r.nombreEnvia)}</td>
                <td data-label="Sorprendido">${escapeHtml(r.nombreSorprendido)}</td>
                <td data-label="Detalle">${escapeHtml(r.resumenDetalles || "-")}</td>
                <td data-label="Valor"><strong>${formatCOP(r.valorDomicilio)}</strong></td>
                <td data-label="Estado">
                  <label class="checkbox-row" style="cursor:pointer;">
                    <input type="checkbox" data-toggle-pago="${r.id}" ${r.pagado ? "checked" : ""} />
                    <span class="badge ${r.pagado ? "badge-success" : "badge-warning"}">${r.pagado ? "PAGADO" : "PENDIENTE"}</span>
                  </label>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      }
    `;

    body.querySelectorAll("[data-toggle-pago]").forEach((chk) =>
      chk.addEventListener("change", async (e) => {
        await marcarDomicilioPagado(chk.dataset.togglePago, e.target.checked);
        toast(e.target.checked ? "Domicilio marcado como pagado" : "Domicilio marcado como pendiente", "success");
      })
    );
    body.querySelector("#btn-limpiar-pagados")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "Eliminar registros pagados",
        message: `Se eliminarán ${pagados.length} registro(s) de domicilios ya pagados de este historial. Los pedidos de venta NO se verán afectados.`,
        confirmText: "Eliminar registros pagados",
      });
      if (!ok) return;
      await eliminarDomiciliosPagados(domiciliario.id, pagados.map((r) => r.id));
      toast("Registros pagados eliminados", "success");
    });
  }

  unsubReport = listenDomiciliosPorDomiciliario(domiciliario.id, (data) => {
    registros = data;
    paint();
  });
}
