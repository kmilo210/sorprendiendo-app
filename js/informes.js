// ============================================================
// INFORMES — Resumen anual, dashboard mensual, tabla y exportación
// ============================================================
import { listenTodosPedidos, listenPedidosPorRango, listenDomiciliarios } from "./data.js";
import {
  formatCOP,
  formatDateStr,
  escapeHtml,
  icons,
  loadingHtml,
  emptyStateHtml,
  downloadCSV,
  matchesSearch,
  debounce,
  toast,
} from "./utils.js";
import { registerCleanup, navigateTo } from "./app.js";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function renderInformes(container, yearParam, monthParam) {
  if (!yearParam) return renderSelectorAnio(container);
  if (!monthParam) return renderResumenAnual(container, parseInt(yearParam, 10));
  return renderDashboardMensual(container, parseInt(yearParam, 10), parseInt(monthParam, 10));
}

/* ============================================================
   PASO 1: SELECCIONAR AÑO
   ============================================================ */
function renderSelectorAnio(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Informes</h1><p>Selecciona el año que deseas consultar.</p></div>
    </div>
    <div id="anio-selector">${loadingHtml("Cargando años disponibles...")}</div>
  `;

  const unsub = listenTodosPedidos((pedidos) => {
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]);
    pedidos.forEach((p) => {
      if (p.fecha) years.add(parseInt(p.fecha.slice(0, 4), 10));
    });
    const sorted = Array.from(years).sort((a, b) => b - a);

    const conteoPorAnio = {};
    pedidos.forEach((p) => {
      const y = p.fecha?.slice(0, 4);
      if (!y) return;
      conteoPorAnio[y] = (conteoPorAnio[y] || 0) + 1;
    });

    document.getElementById("anio-selector").innerHTML = `
      <div class="grid-cards" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">
        ${sorted
          .map(
            (y) => `
          <a href="#/informes/${y}" class="item-card" style="text-decoration:none;">
            <div class="item-card-body flex-center" style="min-height:100px;">
              <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--primary);">${y}</div>
                <div class="item-card-sub">${conteoPorAnio[y] || 0} pedidos</div>
              </div>
            </div>
          </a>`
          )
          .join("")}
      </div>
    `;
  });
  registerCleanup(unsub);
}

/* ============================================================
   PASO 2: RESUMEN ANUAL
   ============================================================ */
function renderResumenAnual(container, year) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <a href="#/informes" class="btn btn-ghost btn-sm" style="margin-bottom:8px;padding-left:0;">${icons.arrowLeft} Cambiar año</a>
        <h1>Informe anual ${year}</h1>
        <p>Resumen mes a mes del negocio.</p>
      </div>
    </div>
    <div id="resumen-anual-body">${loadingHtml("Calculando informe anual...")}</div>
  `;

  const unsub = listenPedidosPorRango(`${year}-01-01`, `${year}-12-31`, (pedidos) => {
    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: i,
      pedidos: 0,
      unidades: 0,
      ventaProductos: 0,
      ventaDomicilios: 0,
      ventaTotal: 0,
    }));
    pedidos.forEach((p) => {
      const m = parseInt(p.fecha.slice(5, 7), 10) - 1;
      if (m < 0 || m > 11) return;
      meses[m].pedidos += 1;
      meses[m].unidades += (p.detalles || []).reduce((s, d) => s + (d.cantidad || 0), 0);
      meses[m].ventaProductos += p.totalProductos || 0;
      meses[m].ventaDomicilios += p.valorDomicilio || 0;
      meses[m].ventaTotal += p.totalPedido || 0;
    });

    const maxVenta = Math.max(1, ...meses.map((m) => m.ventaTotal));
    const totalAnual = meses.reduce((s, m) => s + m.ventaTotal, 0);
    const totalPedidosAnual = meses.reduce((s, m) => s + m.pedidos, 0);

    document.getElementById("resumen-anual-body").innerHTML = `
      <div class="stat-grid">
        ${statBox(icons.clipboard, totalPedidosAnual, "Pedidos en el año")}
        ${statBox(icons.chart, formatCOP(totalAnual), "Ventas del año")}
        ${statBox(icons.gift, meses.reduce((s, m) => s + m.unidades, 0), "Unidades vendidas")}
        ${statBox(icons.bike, formatCOP(meses.reduce((s, m) => s + m.ventaDomicilios, 0)), "Total domicilios")}
      </div>

      <div class="chart-card" style="margin-bottom:24px;">
        <h3>Ventas por mes</h3>
        <div style="display:flex;align-items:flex-end;gap:8px;height:180px;">
          ${meses
            .map((m) => {
              const h = Math.max(4, Math.round((m.ventaTotal / maxVenta) * 150));
              return `
              <a href="#/informes/${year}/${m.mes + 1}" style="flex:1;display:flex;flex-direction:column;align-items:center;text-decoration:none;" title="${formatCOP(m.ventaTotal)}">
                <div style="width:100%;height:${h}px;border-radius:8px 8px 4px 4px;background:linear-gradient(180deg,var(--secondary),var(--primary));"></div>
                <span style="font-size:11px;color:var(--text-secondary);margin-top:6px;">${MESES[m.mes].slice(0, 3)}</span>
              </a>`;
            })
            .join("")}
        </div>
      </div>

      <div class="table-wrap table-as-cards">
        <table>
          <thead><tr><th>Mes</th><th>Pedidos</th><th>Unidades</th><th>Valor productos</th><th>Domicilios</th><th>Total</th><th></th></tr></thead>
          <tbody>
            ${meses
              .map(
                (m) => `
              <tr>
                <td data-label="Mes">${MESES[m.mes]}</td>
                <td data-label="Pedidos">${m.pedidos}</td>
                <td data-label="Unidades">${m.unidades}</td>
                <td data-label="Valor productos">${formatCOP(m.ventaProductos)}</td>
                <td data-label="Domicilios">${formatCOP(m.ventaDomicilios)}</td>
                <td data-label="Total"><strong>${formatCOP(m.ventaTotal)}</strong></td>
                <td data-label=""><a href="#/informes/${year}/${m.mes + 1}" class="btn btn-outline btn-sm">Ver</a></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  });
  registerCleanup(unsub);
}

function statBox(icon, value, label) {
  return `<div class="stat-card"><div class="stat-icon" style="background:var(--surface-alt);color:var(--primary);">${icon}</div><div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div></div>`;
}

/* ============================================================
   PASO 3: DASHBOARD MENSUAL
   ============================================================ */
let filtros = { nombre: "", ocasion: "", domiciliario: "", desde: "", hasta: "" };

function renderDashboardMensual(container, year, month) {
  filtros = { nombre: "", ocasion: "", domiciliario: "", desde: "", hasta: "" };
  const lastDay = new Date(year, month, 0).getDate();
  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const hasta = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <a href="#/informes/${year}" class="btn btn-ghost btn-sm" style="margin-bottom:8px;padding-left:0;">${icons.arrowLeft} Volver al año ${year}</a>
        <h1>${MESES[month - 1]} ${year}</h1>
        <p>Dashboard mensual del negocio.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="btn-export-csv">${icons.download} Exportar CSV</button>
      </div>
    </div>
    <div id="dashboard-mes-body">${loadingHtml("Cargando información del mes...")}</div>
  `;

  let pedidosMes = [];
  let domiciliariosCache = [];

  const unsub1 = listenPedidosPorRango(desde, hasta, (data) => {
    pedidosMes = data;
    paint();
  });
  const unsub2 = listenDomiciliarios((data) => {
    domiciliariosCache = data;
    paint();
  });
  registerCleanup(unsub1);
  registerCleanup(unsub2);

  document.getElementById("btn-export-csv").addEventListener("click", () => {
    if (pedidosMes.length === 0) return;
    const rows = [
      ["Fecha", "Hora", "Ocasión", "Envía", "Sorprendido", "Detalles", "Adicionales", "Valor productos", "Domicilio", "Domiciliario", "Total"],
      ...filtrarPedidos(pedidosMes).map((p) => [
        formatDateStr(p.fecha),
        p.hora || "",
        p.ocasionNombre || "",
        p.nombreEnvia,
        p.nombreSorprendido,
        (p.detalles || []).map((d) => `${d.nombre} x${d.cantidad}`).join(" | "),
        (p.adicionales || []).map((a) => `${a.nombre} x${a.cantidad}`).join(" | "),
        p.totalProductos || 0,
        p.valorDomicilio || 0,
        p.domiciliarioNombre || "",
        p.totalPedido || 0,
      ]),
    ];
    downloadCSV(`pedidos_${year}_${String(month).padStart(2, "0")}.csv`, rows);
    toast("Archivo CSV descargado", "success");
  });

  function filtrarPedidos(pedidos) {
    return pedidos.filter((p) => {
      if (filtros.nombre && !matchesSearch(`${p.nombreEnvia} ${p.nombreSorprendido}`, filtros.nombre) && !(p.detalles || []).some((d) => matchesSearch(d.nombre, filtros.nombre)))
        return false;
      if (filtros.ocasion && p.ocasionId !== filtros.ocasion) return false;
      if (filtros.domiciliario && p.domiciliarioId !== filtros.domiciliario) return false;
      if (filtros.desde && p.fecha < filtros.desde) return false;
      if (filtros.hasta && p.fecha > filtros.hasta) return false;
      return true;
    });
  }

  function paint() {
    const body = document.getElementById("dashboard-mes-body");
    if (!body) return;

    if (pedidosMes.length === 0) {
      body.innerHTML = emptyStateHtml({ icon: "📊", title: "Sin pedidos este mes", message: "No se registraron pedidos en el mes seleccionado." });
      return;
    }

    const totalPedidos = pedidosMes.length;
    const totalUnidades = pedidosMes.reduce((s, p) => s + (p.detalles || []).reduce((s2, d) => s2 + (d.cantidad || 0), 0), 0);
    const totalProductos = pedidosMes.reduce((s, p) => s + (p.totalProductos || 0), 0);
    const totalDomicilios = pedidosMes.reduce((s, p) => s + (p.valorDomicilio || 0), 0);
    const totalGeneral = pedidosMes.reduce((s, p) => s + (p.totalPedido || 0), 0);

    // Detalles más vendidos
    const detalleCounts = {};
    pedidosMes.forEach((p) =>
      (p.detalles || []).forEach((d) => {
        detalleCounts[d.nombre] = (detalleCounts[d.nombre] || 0) + d.cantidad;
      })
    );
    const topDetalles = Object.entries(detalleCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxDetalle = Math.max(1, ...topDetalles.map((d) => d[1]));

    // Ocasiones más frecuentes
    const ocasionCounts = {};
    pedidosMes.forEach((p) => {
      const key = p.ocasionNombre || "Sin ocasión";
      ocasionCounts[key] = (ocasionCounts[key] || 0) + 1;
    });
    const topOcasiones = Object.entries(ocasionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxOcasion = Math.max(1, ...topOcasiones.map((o) => o[1]));

    // Domiciliarios
    const domCounts = {};
    pedidosMes.forEach((p) => {
      if (!p.domiciliarioId) return;
      if (!domCounts[p.domiciliarioId])
        domCounts[p.domiciliarioId] = { nombre: p.domiciliarioNombre || "—", cantidad: 0, valor: 0, pendiente: 0 };
      domCounts[p.domiciliarioId].cantidad += 1;
      domCounts[p.domiciliarioId].valor += p.valorDomicilio || 0;
      if (!p.domicilioPagado) domCounts[p.domiciliarioId].pendiente += p.valorDomicilio || 0;
    });

    // Evolución de ventas por día
    const dias = {};
    pedidosMes.forEach((p) => {
      dias[p.fecha] = (dias[p.fecha] || 0) + (p.totalPedido || 0);
    });
    const diasOrdenados = Object.keys(dias).sort();
    const maxDia = Math.max(1, ...Object.values(dias));

    const listaOcasiones = [...new Set(pedidosMes.map((p) => p.ocasionId).filter(Boolean))];
    const listaDomiciliarios = [...new Set(pedidosMes.map((p) => p.domiciliarioId).filter(Boolean))];

    const pedidosFiltrados = filtrarPedidos(pedidosMes).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

    body.innerHTML = `
      <div class="stat-grid">
        ${statBox(icons.clipboard, totalPedidos, "Número de pedidos")}
        ${statBox(icons.gift, totalUnidades, "Unidades vendidas")}
        ${statBox(icons.chart, formatCOP(totalProductos), "Total en productos")}
        ${statBox(icons.bike, formatCOP(totalDomicilios), "Total en domicilios")}
      </div>
      <div class="card card-pad flex-between" style="margin-bottom:24px;">
        <span style="font-weight:700;">Total general del mes</span>
        <span style="font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--primary);">${formatCOP(totalGeneral)}</span>
      </div>

      <div class="grid-cards" style="grid-template-columns:1fr 1fr;margin-bottom:24px;">
        <div class="chart-card">
          <h3>Detalles más vendidos</h3>
          ${
            topDetalles.length === 0
              ? `<p class="text-muted">Sin datos.</p>`
              : topDetalles
                  .map(
                    ([nombre, cant]) => `
              <div style="margin-bottom:10px;">
                <div class="flex-between" style="font-size:13px;margin-bottom:4px;"><span>${escapeHtml(nombre)}</span><strong>${cant}</strong></div>
                <div style="background:var(--surface-alt);border-radius:6px;height:8px;overflow:hidden;">
                  <div style="width:${(cant / maxDetalle) * 100}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--secondary));"></div>
                </div>
              </div>`
                  )
                  .join("")
          }
        </div>
        <div class="chart-card">
          <h3>Ocasiones más frecuentes</h3>
          ${
            topOcasiones.length === 0
              ? `<p class="text-muted">Sin datos.</p>`
              : topOcasiones
                  .map(
                    ([nombre, cant]) => `
              <div style="margin-bottom:10px;">
                <div class="flex-between" style="font-size:13px;margin-bottom:4px;"><span>${escapeHtml(nombre)}</span><strong>${cant}</strong></div>
                <div style="background:var(--surface-alt);border-radius:6px;height:8px;overflow:hidden;">
                  <div style="width:${(cant / maxOcasion) * 100}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-light));"></div>
                </div>
              </div>`
                  )
                  .join("")
          }
        </div>
      </div>

      <div class="chart-card" style="margin-bottom:24px;">
        <h3>Evolución de ventas en el mes</h3>
        <div style="display:flex;align-items:flex-end;gap:3px;height:150px;overflow-x:auto;">
          ${diasOrdenados
            .map((d) => {
              const h = Math.max(3, Math.round((dias[d] / maxDia) * 120));
              return `<div title="${formatDateStr(d)}: ${formatCOP(dias[d])}" style="flex:1;min-width:6px;height:${h}px;border-radius:4px 4px 0 0;background:linear-gradient(180deg,var(--secondary),var(--primary));"></div>`;
            })
            .join("")}
        </div>
      </div>

      <div class="chart-card" style="margin-bottom:24px;">
        <h3>Domiciliarios</h3>
        ${
          Object.keys(domCounts).length === 0
            ? `<p class="text-muted">No hubo domicilios asignados este mes.</p>`
            : `<div class="table-wrap table-as-cards"><table>
            <thead><tr><th>Domiciliario</th><th>Domicilios</th><th>Valor total</th><th>Pendiente</th></tr></thead>
            <tbody>
              ${Object.values(domCounts)
                .map(
                  (d) => `<tr>
                <td data-label="Domiciliario">${escapeHtml(d.nombre)}</td>
                <td data-label="Domicilios">${d.cantidad}</td>
                <td data-label="Valor total">${formatCOP(d.valor)}</td>
                <td data-label="Pendiente">${d.pendiente > 0 ? `<span class="badge badge-warning">${formatCOP(d.pendiente)}</span>` : `<span class="badge badge-success">Al día</span>`}</td>
              </tr>`
                )
                .join("")}
            </tbody>
          </table></div>`
        }
      </div>

      <div class="flex-between" style="margin-bottom:14px;">
        <h3 style="font-size:17px;">Pedidos del mes</h3>
      </div>
      <div class="filters-bar">
        <div class="search-box" style="flex:1;min-width:200px;">
          ${icons.search}
          <input type="search" id="f-nombre" placeholder="Buscar por nombre o detalle..." />
        </div>
        <select id="f-ocasion">
          <option value="">Todas las ocasiones</option>
          ${listaOcasiones.map((id) => {
            const p = pedidosMes.find((x) => x.ocasionId === id);
            return `<option value="${id}">${escapeHtml(p?.ocasionNombre || id)}</option>`;
          }).join("")}
        </select>
        <select id="f-domiciliario">
          <option value="">Todos los domiciliarios</option>
          ${listaDomiciliarios.map((id) => {
            const p = pedidosMes.find((x) => x.domiciliarioId === id);
            return `<option value="${id}">${escapeHtml(p?.domiciliarioNombre || id)}</option>`;
          }).join("")}
        </select>
        <input type="date" id="f-desde" title="Desde" />
        <input type="date" id="f-hasta" title="Hasta" />
      </div>
      <div id="tabla-pedidos-wrap"></div>
    `;

    renderTabla(pedidosFiltrados);

    const dNombre = debounce((v) => { filtros.nombre = v; renderTabla(filtrarPedidos(pedidosMes)); }, 200);
    document.getElementById("f-nombre").addEventListener("input", (e) => dNombre(e.target.value));
    document.getElementById("f-ocasion").addEventListener("change", (e) => { filtros.ocasion = e.target.value; renderTabla(filtrarPedidos(pedidosMes)); });
    document.getElementById("f-domiciliario").addEventListener("change", (e) => { filtros.domiciliario = e.target.value; renderTabla(filtrarPedidos(pedidosMes)); });
    document.getElementById("f-desde").addEventListener("change", (e) => { filtros.desde = e.target.value; renderTabla(filtrarPedidos(pedidosMes)); });
    document.getElementById("f-hasta").addEventListener("change", (e) => { filtros.hasta = e.target.value; renderTabla(filtrarPedidos(pedidosMes)); });
  }

  function renderTabla(pedidos) {
    const wrap = document.getElementById("tabla-pedidos-wrap");
    if (!wrap) return;
    if (pedidos.length === 0) {
      wrap.innerHTML = `<p class="text-muted" style="padding:20px 0;">No hay pedidos que coincidan con los filtros.</p>`;
      return;
    }
    wrap.innerHTML = `<div class="table-wrap table-as-cards"><table>
      <thead><tr><th>Fecha</th><th>Ocasión</th><th>Envía</th><th>Sorprendido</th><th>Detalles</th><th>Domiciliario</th><th>Total</th></tr></thead>
      <tbody>
        ${pedidos
          .map(
            (p) => `<tr>
          <td data-label="Fecha">${formatDateStr(p.fecha)} ${p.hora || ""}</td>
          <td data-label="Ocasión">${escapeHtml(p.ocasionNombre || "-")}</td>
          <td data-label="Envía">${escapeHtml(p.nombreEnvia)}</td>
          <td data-label="Sorprendido">${escapeHtml(p.nombreSorprendido)}</td>
          <td data-label="Detalles">${(p.detalles || []).map((d) => `${escapeHtml(d.nombre)} ×${d.cantidad}`).join(", ")}</td>
          <td data-label="Domiciliario">${escapeHtml(p.domiciliarioNombre || "-")}</td>
          <td data-label="Total"><strong>${formatCOP(p.totalPedido)}</strong></td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table></div>`;
  }
}
