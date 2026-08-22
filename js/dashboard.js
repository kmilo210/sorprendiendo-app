// ============================================================
// DASHBOARD (Página de inicio)
// ============================================================
import { listenPedidosPorRango } from "./data.js";
import { formatCOP, todayISO, icons, loadingHtml } from "./utils.js";
import { registerCleanup } from "./app.js";

export function renderDashboard(container) {
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";

  container.innerHTML = `
    <div class="welcome-banner">
      <h2>Hola, Sorprendiendo 👋</h2>
      <p>Este es el resumen de tu negocio hoy.</p>
    </div>
    <div id="dash-stats">${loadingHtml("Cargando indicadores...")}</div>

    <div class="page-header" style="margin-top:8px;">
      <div>
        <h1 style="font-size:19px;">Accesos rápidos</h1>
      </div>
    </div>
    <div class="grid-cards" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));">
      ${quickLink("detalles", icons.gift, "Detalles", "Gestiona tus productos sorpresa")}
      ${quickLink("compras", icons.cart, "Listas de compras", "Genera listas por proveedor")}
      ${quickLink("pedidos", icons.clipboard, "Registrar pedido", "Registra una nueva venta")}
      ${quickLink("informes", icons.chart, "Informes", "Consulta estadísticas del negocio")}
    </div>
  `;

  let pedidosHoy = [];
  let pedidosMes = [];

  function renderStats() {
    const ventasHoy = pedidosHoy.reduce((sum, p) => sum + (p.totalPedido || 0), 0);
    const ventasMes = pedidosMes.reduce((sum, p) => sum + (p.totalPedido || 0), 0);
    const porPagar = pedidosMes
      .filter((p) => !p.domicilioPagado)
      .reduce((sum, p) => sum + (p.valorDomicilio || 0), 0);

    document.getElementById("dash-stats").innerHTML = `
      <div class="stat-grid">
        ${statCard(icons.clipboard, "var(--info-bg)", "var(--secondary)", pedidosHoy.length, "Pedidos hoy")}
        ${statCard(icons.chart, "var(--warning-bg)", "var(--accent)", formatCOP(ventasHoy), "Ventas hoy")}
        ${statCard(icons.gift, "#EDE7F6", "var(--primary)", pedidosMes.length, "Pedidos del mes")}
        ${statCard(icons.bike, "var(--success-bg)", "var(--success)", formatCOP(porPagar), "Domicilios por pagar")}
      </div>
    `;
  }

  const unsub1 = listenPedidosPorRango(today, today, (data) => {
    pedidosHoy = data;
    renderStats();
  });
  const unsub2 = listenPedidosPorRango(monthStart, today, (data) => {
    pedidosMes = data;
    renderStats();
  });

  registerCleanup(unsub1);
  registerCleanup(unsub2);
}

function statCard(icon, bg, color, value, label) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bg};color:${color};">${icon}</div>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>
  `;
}

function quickLink(route, icon, title, desc) {
  return `
    <a href="#/${route}" class="item-card" style="text-decoration:none;">
      <div class="item-card-body" style="align-items:flex-start;">
        <div class="stat-icon" style="background:var(--surface-alt);color:var(--primary);margin-bottom:6px;">${icon}</div>
        <div class="item-card-title">${title}</div>
        <div class="item-card-sub">${desc}</div>
      </div>
    </a>
  `;
}
