// ============================================================
// APP.JS — Punto de entrada, autenticación, layout y enrutador
// ============================================================
import { watchAuthState, login, logout, friendlyAuthError } from "./auth.js";
import { icons, toast } from "./utils.js";

import { renderDashboard } from "./dashboard.js";
import { renderDetalles } from "./detalles.js";
import { renderProductos } from "./productos.js";
import { renderProveedores } from "./proveedores.js";
import { renderCompras, renderCompraDetalle } from "./compras.js";
import { renderPedidos } from "./pedidos.js";
import { renderDomiciliarios } from "./domiciliarios.js";
import { renderInformes } from "./informes.js";
import { renderConfiguracion } from "./configuracion.js";

const LOGO_SVG = `
  <img src="assets/images/Logo-Sorprendiendo-1x1.png" alt="Logo">
`;

const NAV_ITEMS = [
  { route: "inicio", label: "Inicio", icon: icons.home },
  { route: "detalles", label: "Detalles", icon: icons.gift },
  { route: "productos", label: "Productos", icon: icons.box },
  { route: "proveedores", label: "Proveedores", icon: icons.truck },
  { route: "compras", label: "Listas de compras", icon: icons.cart },
  { route: "pedidos", label: "Registrar pedido", icon: icons.clipboard },
  { route: "domiciliarios", label: "Domiciliarios", icon: icons.bike },
  { route: "informes", label: "Informes", icon: icons.chart },
  { route: "configuracion", label: "Configuración", icon: icons.settings },
];

const PAGE_TITLES = {
  inicio: "Inicio",
  detalles: "Detalles",
  productos: "Productos",
  proveedores: "Proveedores",
  compras: "Listas de compras",
  pedidos: "Registrar pedido",
  domiciliarios: "Domiciliarios",
  informes: "Informes",
  configuracion: "Configuración",
};

const root = document.getElementById("app-root");
let currentUser = null;

watchAuthState(
  (user) => {
    currentUser = user;
    renderAppShell();
    router();
  },
  () => {
    currentUser = null;
    renderLogin();
  }
);

window.addEventListener("hashchange", () => {
  if (currentUser) router();
});

/* ============================================================
   LOGIN
   ============================================================ */
function renderLogin() {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="logo-mark">${LOGO_SVG}</div>
        <h1>Sorprendiendo</h1>
        <p class="login-sub">Gestión de pedidos, compras e informes</p>
        <div id="login-error-slot"></div>
        <form id="login-form">
          <div class="form-group">
            <label class="field-label">Usuario</label>
            <input type="text" id="login-username" autocomplete="username" placeholder="sorprendiendo" required />
          </div>
          <div class="form-group">
            <label class="field-label">Contraseña</label>
            <input type="password" id="login-password" autocomplete="current-password" placeholder="••••••" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="login-submit-btn">Iniciar sesión</button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("login-submit-btn");
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    btn.disabled = true;
    btn.textContent = "Ingresando...";
    document.getElementById("login-error-slot").innerHTML = "";
    try {
      await login(username, password);
    } catch (err) {
      document.getElementById("login-error-slot").innerHTML = `<div class="login-error">${friendlyAuthError(err)}</div>`;
      btn.disabled = false;
      btn.textContent = "Iniciar sesión";
    }
  });
}

/* ============================================================
   LAYOUT DE LA APP (sidebar + topbar + contenido)
   ============================================================ */
function renderAppShell() {
  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="logo-mark">${LOGO_SVG}</div>
          <div>
            <div class="brand-name">Sorprendiendo</div>
            <div class="brand-tag">Panel de gestión</div>
          </div>
        </div>
        <nav id="sidebar-nav">
          ${NAV_ITEMS.map(
            (item) => `
            <a href="#/${item.route}" class="nav-link" data-route="${item.route}">
              ${item.icon}
              <span>${item.label}</span>
            </a>`
          ).join("")}
        </nav>
        <div class="nav-spacer"></div>
        <a href="#" class="nav-link" id="logout-link">
          ${icons.logout}
          <span>Cerrar sesión</span>
        </a>
      </aside>

      <div class="main-area">
        <div class="topbar">
          <button class="btn btn-icon" id="hamburger-btn" style="background:var(--surface-alt);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <div class="topbar-brand">
            <div class="logo-mark" style="width:30px;height:30px;">${LOGO_SVG}</div>
            Sorprendiendo
          </div>
          <div style="width:38px;"></div>
        </div>
        <main class="main-content" id="main-content">
        </main>
      </div>
    </div>
  `;

  document.getElementById("logout-link").addEventListener("click", async (e) => {
    e.preventDefault();
    await logout();
  });

  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  document.getElementById("hamburger-btn").addEventListener("click", () => {
    sidebar.classList.add("open");
    backdrop.classList.add("show");
  });
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  });
  sidebar.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("show");
    });
  });

  if (!location.hash) location.hash = "#/inicio";
}

/* ============================================================
   ENRUTADOR
   ============================================================ */
const routeCleanups = [];

function runCleanups() {
  while (routeCleanups.length) {
    const fn = routeCleanups.pop();
    try {
      fn && fn();
    } catch (e) {
      /* noop */
    }
  }
}

export function registerCleanup(fn) {
  routeCleanups.push(fn);
}

function router() {
  runCleanups();
  const hash = location.hash.replace(/^#\//, "") || "inicio";
  const parts = hash.split("/").filter(Boolean);
  const routeKey = parts[0] || "inicio";

  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === routeKey);
  });

  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  switch (routeKey) {
    case "inicio":
      renderDashboard(mainContent);
      break;
    case "detalles":
      renderDetalles(mainContent);
      break;
    case "productos":
      renderProductos(mainContent);
      break;
    case "proveedores":
      renderProveedores(mainContent);
      break;
    case "compras":
      if (parts[1]) renderCompraDetalle(mainContent, parts[1]);
      else renderCompras(mainContent);
      break;
    case "pedidos":
      renderPedidos(mainContent);
      break;
    case "domiciliarios":
      renderDomiciliarios(mainContent);
      break;
    case "informes":
      renderInformes(mainContent, parts[1], parts[2]);
      break;
    case "configuracion":
      renderConfiguracion(mainContent);
      break;
    default:
      mainContent.innerHTML = `<div class="empty-state"><h3>Página no encontrada</h3></div>`;
  }
}

export function navigateTo(hash) {
  location.hash = hash;
}

