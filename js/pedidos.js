// ============================================================
// REGISTRAR PEDIDOS
// ============================================================
import {
  listenDetalles,
  listenOcasiones,
  listenDomiciliarios,
  addPedido,
  listenPedidosRecientes,
} from "./data.js";
import {
  openModal,
  closeModal,
  toast,
  escapeHtml,
  icons,
  matchesSearch,
  debounce,
  formatCOP,
  parseCOPInput,
  todayISO,
  nowTimeHHMM,
  formatDateStr,
} from "./utils.js";
import { registerCleanup, navigateTo } from "./app.js";

let allDetalles = [];
let allOcasiones = [];
let allDomiciliarios = [];
let lineasDetalle = []; // { uid, detalleId, nombre, cantidad, precioUnitario }
let lineasAdicional = []; // { uid, nombre, cantidad, valorUnitario }
let uidCounter = 0;

function newUid() {
  return `l${++uidCounter}`;
}

export function renderPedidos(container) {
  lineasDetalle = [newLineaDetalle()];
  lineasAdicional = [];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Registrar Pedido</h1>
        <p>Registra cada venta de forma estandarizada para obtener informes confiables.</p>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:24px;">
      <div class="form-section-title">Información General</div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-label">Fecha</label>
          <input type="date" id="pedido-fecha" value="${todayISO()}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-label">Ocasión</label>
          <select id="pedido-ocasion"><option value="">Selecciona una ocasión</option></select>
        </div>
        <div class="form-group"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-label">Nombre de quien envía</label>
          <input type="text" id="pedido-envia" placeholder="Ej: Juan Pérez" />
        </div>
        <div class="form-group">
          <label class="field-label">Nombre del sorprendido</label>
          <input type="text" id="pedido-sorprendido" placeholder="Ej: María Gómez" />
        </div>
      </div>

      <div class="form-section-title">Detalles vendidos</div>
      <div id="lineas-detalle"></div>
      <button class="btn btn-outline btn-sm" id="btn-add-linea-detalle">${icons.plus} Agregar otro detalle</button>

      <div class="form-section-title">Adicionales</div>
      <div id="lineas-adicional"></div>
      <button class="btn btn-outline btn-sm" id="btn-add-linea-adicional">${icons.plus} Agregar adicional</button>

      <div class="form-section-title">Domicilio</div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-label">Valor del domicilio</label>
          <input type="text" inputmode="numeric" id="pedido-domicilio" placeholder="$0" value="$0" />
        </div>
        <div class="form-group">
          <label class="field-label">Domiciliario</label>
          <select id="pedido-domiciliario"><option value="">Selecciona un domiciliario</option></select>
        </div>
      </div>

      <div class="form-section-title">Totales</div>
      <div class="totals-box">
        <div class="totals-row"><span>Total productos</span><span id="total-productos">$0</span></div>
        <div class="totals-row"><span>Domicilio</span><span id="total-domicilio-view">$0</span></div>
        <div class="totals-row grand"><span>Total pedido</span><span id="total-pedido">$0</span></div>
      </div>

      <div style="margin-top:22px;display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn btn-ghost" id="btn-limpiar">Limpiar formulario</button>
        <button class="btn btn-primary" id="btn-guardar-pedido">${icons.check} Registrar pedido</button>
      </div>
    </div>

    <h3 style="font-size:16px;margin-bottom:14px;">Pedidos recientes</h3>
    <div id="pedidos-recientes-list"></div>
  `;

  renderLineasDetalle();
  renderLineasAdicional();
  recalcularTotales();

  document.getElementById("btn-add-linea-detalle").addEventListener("click", () => {
    lineasDetalle.push(newLineaDetalle());
    renderLineasDetalle();
  });
  document.getElementById("btn-add-linea-adicional").addEventListener("click", () => {
    lineasAdicional.push({ uid: newUid(), nombre: "", cantidad: 1, valorUnitario: 0 });
    renderLineasAdicional();
  });
  document.getElementById("pedido-domicilio").addEventListener("input", (e) => {
    e.target.value = formatCOP(parseCOPInput(e.target.value));
    recalcularTotales();
  });
  document.getElementById("btn-limpiar").addEventListener("click", () => renderPedidos(container));
  document.getElementById("btn-guardar-pedido").addEventListener("click", guardarPedido);

  const unsub1 = listenDetalles((d) => (allDetalles = d));
  const unsub2 = listenOcasiones((d) => {
    allOcasiones = d;
    const sel = document.getElementById("pedido-ocasion");
    if (sel) {
      sel.innerHTML =
        `<option value="">Selecciona una ocasión</option>` +
        d.map((o) => `<option value="${o.id}">${escapeHtml(o.nombre)}</option>`).join("") +
        (d.length === 0 ? `` : "");
      if (d.length === 0) {
        sel.innerHTML += `<option value="" disabled>No hay ocasiones. Créalas en Configuración.</option>`;
      }
    }
  });
  const unsub3 = listenDomiciliarios((d) => {
    allDomiciliarios = d.filter((x) => x.activo);
    const sel = document.getElementById("pedido-domiciliario");
    if (sel) {
      sel.innerHTML =
        `<option value="">Selecciona un domiciliario</option>` +
        allDomiciliarios.map((o) => `<option value="${o.id}">${escapeHtml(o.nombre)}</option>`).join("");
    }
  });
  const unsub4 = listenPedidosRecientes((data) => renderRecientes(data), 8);

  registerCleanup(unsub1);
  registerCleanup(unsub2);
  registerCleanup(unsub3);
  registerCleanup(unsub4);
}

function newLineaDetalle() {
  return { uid: newUid(), detalleId: "", nombre: "", cantidad: 1, precioUnitario: 0 };
}

/* ---------- Líneas de detalle ---------- */
function renderLineasDetalle() {
  const el = document.getElementById("lineas-detalle");
  if (!el) return;
  el.innerHTML = lineasDetalle
    .map(
      (l) => `
    <div class="card card-pad" style="margin-bottom:10px;" data-linea="${l.uid}">
      <div class="form-row" style="align-items:flex-end;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="field-label">Detalle</label>
          <div class="autocomplete-wrap">
            <input type="text" data-detalle-search placeholder="Buscar detalle..." value="${escapeHtml(l.nombre)}" autocomplete="off" />
            <div data-detalle-ac></div>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0;display:flex;gap:10px;">
          <div style="flex:1;">
            <label class="field-label">Cantidad</label>
            <input type="number" min="1" value="${l.cantidad}" data-cantidad />
          </div>
          <div style="flex:1;">
            <label class="field-label">Precio unitario</label>
            <input type="text" inputmode="numeric" value="${formatCOP(l.precioUnitario)}" data-precio />
          </div>
        </div>
      </div>
      <div class="flex-between" style="margin-top:10px;">
        <span class="text-muted" style="font-size:13px;">Subtotal: <strong style="color:var(--primary);">${formatCOP(l.cantidad * l.precioUnitario)}</strong></span>
        ${lineasDetalle.length > 1 ? `<button class="btn btn-icon" data-remove-linea title="Quitar">${icons.trash}</button>` : ""}
      </div>
    </div>`
    )
    .join("");

  el.querySelectorAll("[data-linea]").forEach((row) => {
    const uid = row.dataset.linea;
    const linea = lineasDetalle.find((l) => l.uid === uid);
    const searchInput = row.querySelector("[data-detalle-search]");
    const acEl = row.querySelector("[data-detalle-ac]");

    searchInput.addEventListener(
      "input",
      debounce((e) => {
        const term = e.target.value.trim();
        linea.nombre = term;
        linea.detalleId = "";
        if (!term) {
          acEl.innerHTML = "";
          return;
        }
        const matches = allDetalles.filter((d) => matchesSearch(d.nombre, term)).slice(0, 8);
        acEl.innerHTML = `<div class="autocomplete-list">
          ${
            matches.length === 0
              ? `<div class="autocomplete-empty">Sin coincidencias</div>`
              : matches
                  .map(
                    (d) => `<div class="autocomplete-item" data-pick="${d.id}">
                ${d.imagenUrl ? `<img src="${d.imagenUrl}" class="ac-thumb" />` : `<span class="ac-thumb flex-center">${icons.gift}</span>`}
                <span>${escapeHtml(d.nombre)} · ${formatCOP(d.precio)}</span>
              </div>`
                  )
                  .join("")
          }
        </div>`;
        acEl.querySelectorAll("[data-pick]").forEach((item) =>
          item.addEventListener("click", () => {
            const detalle = allDetalles.find((d) => d.id === item.dataset.pick);
            linea.detalleId = detalle.id;
            linea.nombre = detalle.nombre;
            linea.precioUnitario = detalle.precio;
            renderLineasDetalle();
            recalcularTotales();
          })
        );
      }, 150)
    );

    row.querySelector("[data-cantidad]").addEventListener("change", (e) => {
      linea.cantidad = Math.max(1, parseInt(e.target.value, 10) || 1);
      renderLineasDetalle();
      recalcularTotales();
    });
    row.querySelector("[data-precio]").addEventListener("input", (e) => {
      linea.precioUnitario = parseCOPInput(e.target.value);
      recalcularTotales();
    });
    row.querySelector("[data-precio]").addEventListener("blur", () => renderLineasDetalle());
    row.querySelector("[data-remove-linea]")?.addEventListener("click", () => {
      lineasDetalle = lineasDetalle.filter((l) => l.uid !== uid);
      renderLineasDetalle();
      recalcularTotales();
    });
  });
}

/* ---------- Líneas de adicional ---------- */
function renderLineasAdicional() {
  const el = document.getElementById("lineas-adicional");
  if (!el) return;
  if (lineasAdicional.length === 0) {
    el.innerHTML = `<p class="text-muted" style="font-size:13.5px;margin-bottom:10px;">No hay adicionales agregados.</p>`;
    return;
  }
  el.innerHTML = lineasAdicional
    .map(
      (l) => `
    <div class="card card-pad" style="margin-bottom:10px;" data-adic="${l.uid}">
      <div class="form-row" style="align-items:flex-end;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="field-label">Nombre del adicional</label>
          <input type="text" data-nombre value="${escapeHtml(l.nombre)}" placeholder="Ej: Vela decorativa" />
        </div>
        <div class="form-group" style="margin-bottom:0;display:flex;gap:10px;">
          <div style="flex:1;">
            <label class="field-label">Cantidad</label>
            <input type="number" min="1" value="${l.cantidad}" data-cantidad />
          </div>
          <div style="flex:1;">
            <label class="field-label">Valor unitario</label>
            <input type="text" inputmode="numeric" value="${formatCOP(l.valorUnitario)}" data-valor />
          </div>
        </div>
      </div>
      <div class="flex-between" style="margin-top:10px;">
        <span class="text-muted" style="font-size:13px;">Subtotal: <strong style="color:var(--primary);">${formatCOP(l.cantidad * l.valorUnitario)}</strong></span>
        <button class="btn btn-icon" data-remove-adic title="Quitar">${icons.trash}</button>
      </div>
    </div>`
    )
    .join("");

  el.querySelectorAll("[data-adic]").forEach((row) => {
    const uid = row.dataset.adic;
    const linea = lineasAdicional.find((l) => l.uid === uid);
    row.querySelector("[data-nombre]").addEventListener("input", (e) => (linea.nombre = e.target.value));
    row.querySelector("[data-cantidad]").addEventListener("change", (e) => {
      linea.cantidad = Math.max(1, parseInt(e.target.value, 10) || 1);
      renderLineasAdicional();
      recalcularTotales();
    });
    row.querySelector("[data-valor]").addEventListener("input", (e) => {
      linea.valorUnitario = parseCOPInput(e.target.value);
      recalcularTotales();
    });
    row.querySelector("[data-valor]").addEventListener("blur", () => renderLineasAdicional());
    row.querySelector("[data-remove-adic]").addEventListener("click", () => {
      lineasAdicional = lineasAdicional.filter((l) => l.uid !== uid);
      renderLineasAdicional();
      recalcularTotales();
    });
  });
}

/* ---------- Totales ---------- */
function recalcularTotales() {
  const subDetalles = lineasDetalle.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
  const subAdicionales = lineasAdicional.reduce((s, l) => s + l.cantidad * l.valorUnitario, 0);
  const totalProductos = subDetalles + subAdicionales;
  const domicilio = parseCOPInput(document.getElementById("pedido-domicilio")?.value || 0);
  const totalPedido = totalProductos + domicilio;

  const tp = document.getElementById("total-productos");
  const td = document.getElementById("total-domicilio-view");
  const tt = document.getElementById("total-pedido");
  if (tp) tp.textContent = formatCOP(totalProductos);
  if (td) td.textContent = formatCOP(domicilio);
  if (tt) tt.textContent = formatCOP(totalPedido);
}

/* ---------- Guardar pedido ---------- */
async function guardarPedido() {
  const fecha = document.getElementById("pedido-fecha").value;
  const hora = nowTimeHHMM();
  const ocasionId = document.getElementById("pedido-ocasion").value;
  const nombreEnvia = document.getElementById("pedido-envia").value.trim();
  const nombreSorprendido = document.getElementById("pedido-sorprendido").value.trim();
  const domiciliarioId = document.getElementById("pedido-domiciliario").value;
  const valorDomicilio = parseCOPInput(document.getElementById("pedido-domicilio").value);

  if (!fecha) return toast("Ingresa la fecha del pedido", "error");
  if (!nombreEnvia || !nombreSorprendido) return toast("Ingresa el nombre de quien envía y del sorprendido", "error");

  const detallesValidos = lineasDetalle.filter((l) => l.detalleId);
  if (detallesValidos.length === 0) return toast("Selecciona al menos un detalle vendido", "error");

  const ocasion = allOcasiones.find((o) => o.id === ocasionId);
  const domiciliario = allDomiciliarios.find((d) => d.id === domiciliarioId);

  const subDetalles = detallesValidos.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
  const adicionalesValidos = lineasAdicional.filter((l) => l.nombre.trim());
  const subAdicionales = adicionalesValidos.reduce((s, l) => s + l.cantidad * l.valorUnitario, 0);
  const totalProductos = subDetalles + subAdicionales;
  const totalPedido = totalProductos + valorDomicilio;

  const btn = document.getElementById("btn-guardar-pedido");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    await addPedido({
      fecha,
      hora,
      ocasionId: ocasionId || null,
      ocasionNombre: ocasion?.nombre || null,
      nombreEnvia,
      nombreSorprendido,
      detalles: detallesValidos.map((l) => ({
        detalleId: l.detalleId,
        nombre: l.nombre,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: l.cantidad * l.precioUnitario,
      })),
      adicionales: adicionalesValidos.map((l) => ({
        nombre: l.nombre,
        cantidad: l.cantidad,
        valorUnitario: l.valorUnitario,
        subtotal: l.cantidad * l.valorUnitario,
      })),
      valorDomicilio,
      domiciliarioId: domiciliarioId || null,
      domiciliarioNombre: domiciliario?.nombre || null,
      totalProductos,
      totalPedido,
    });
    toast("Pedido registrado correctamente", "success");
    renderPedidos(document.getElementById("main-content"));
  } catch (e) {
    toast("Ocurrió un error al registrar el pedido", "error");
    btn.disabled = false;
    btn.textContent = "Registrar pedido";
  }
}

/* ---------- Pedidos recientes ---------- */
function renderRecientes(pedidos) {
  const el = document.getElementById("pedidos-recientes-list");
  if (!el) return;
  if (pedidos.length === 0) {
    el.innerHTML = `<p class="text-muted" style="padding:14px 0;">Todavía no se han registrado pedidos.</p>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap table-as-cards"><table>
    <thead><tr><th>Fecha</th><th>Envía</th><th>Sorprendido</th><th>Ocasión</th><th>Detalle</th><th>Total</th></tr></thead>
    <tbody>
      ${pedidos
        .map(
          (p) => `<tr>
        <td data-label="Fecha">${formatDateStr(p.fecha)}</td>
        <td data-label="Envía">${escapeHtml(p.nombreEnvia)}</td>
        <td data-label="Sorprendido">${escapeHtml(p.nombreSorprendido)}</td>
        <td data-label="Ocasión">${escapeHtml(p.ocasionNombre || "-")}</td>
        <td data-label="Detalle">${(p.detalles || [])
                          .map((d) => `${escapeHtml(d.nombre)} ×${d.cantidad}`)
                          .join(", ")}</td>
        <td data-label="Total"><strong>${formatCOP(p.totalPedido)}</strong></td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table></div>`;
}
