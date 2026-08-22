// ============================================================
// CAPA DE DATOS (Firestore)
// Todas las colecciones y operaciones CRUD del sistema.
// Firebase es la única fuente de verdad: no se usa localStorage
// para almacenar datos del negocio.
// ============================================================
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const col = (name) => collection(db, name);

/* ============================================================
   CATEGORÍAS
   ============================================================ */
export function listenCategorias(cb) {
  const q = query(col("categorias"), orderBy("nombre"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function addCategoria(nombre) {
  return addDoc(col("categorias"), {
    nombre: nombre.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateCategoria(id, nombre) {
  return updateDoc(doc(db, "categorias", id), { nombre: nombre.trim(), updatedAt: serverTimestamp() });
}
export async function deleteCategoria(id) {
  return deleteDoc(doc(db, "categorias", id));
}
export async function categoriaTieneDetalles(categoriaId) {
  const q = query(col("detalles"), where("categoriaId", "==", categoriaId));
  const snap = await getDocs(q);
  return !snap.empty;
}

/* ============================================================
   PRODUCTOS
   ============================================================ */
export function listenProductos(cb) {
  const q = query(col("productos"), orderBy("nombre"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function addProducto({ nombre, imagenUrl = null, proveedores = [] }) {
  return addDoc(col("productos"), {
    nombre: nombre.trim(),
    imagenUrl,
    proveedores, // [{ proveedorId, preferido }]
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateProducto(id, data) {
  return updateDoc(doc(db, "productos", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteProducto(id) {
  return deleteDoc(doc(db, "productos", id));
}
export async function productoEstaEnUso(productoId) {
  const snap = await getDocs(col("detalles"));
  return snap.docs.some((d) => (d.data().productos || []).some((p) => p.productoId === productoId));
}

/* ============================================================
   PROVEEDORES
   ============================================================ */
export function listenProveedores(cb) {
  const q = query(col("proveedores"), orderBy("nombre"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function addProveedor({ nombre, imagenUrl = null }) {
  return addDoc(col("proveedores"), {
    nombre: nombre.trim(),
    imagenUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateProveedor(id, data) {
  return updateDoc(doc(db, "proveedores", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteProveedor(id) {
  return deleteDoc(doc(db, "proveedores", id));
}
export async function proveedorEstaEnUso(proveedorId) {
  const snap = await getDocs(col("productos"));
  return snap.docs.some((d) => (d.data().proveedores || []).some((p) => p.proveedorId === proveedorId));
}

/* ============================================================
   DETALLES
   ============================================================ */
export function listenDetalles(cb) {
  const q = query(col("detalles"), orderBy("nombre"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function addDetalle({ nombre, imagenUrl = null, precio, categoriaId, productos = [] }) {
  return addDoc(col("detalles"), {
    nombre: nombre.trim(),
    imagenUrl,
    precio: Number(precio) || 0,
    categoriaId,
    productos, // [{ productoId, cantidad }]
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateDetalle(id, data) {
  return updateDoc(doc(db, "detalles", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteDetalle(id) {
  return deleteDoc(doc(db, "detalles", id));
}
export async function reasignarDetallesDeCategoria(categoriaId, nuevaCategoriaId) {
  const q = query(col("detalles"), where("categoriaId", "==", categoriaId));
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((d) => updateDoc(doc(db, "detalles", d.id), { categoriaId: nuevaCategoriaId, updatedAt: serverTimestamp() }))
  );
}

/* ============================================================
   OCASIONES
   ============================================================ */
export function listenOcasiones(cb) {
  const q = query(col("ocasiones"), orderBy("nombre"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function addOcasion(nombre) {
  return addDoc(col("ocasiones"), { nombre: nombre.trim(), createdAt: serverTimestamp() });
}
export async function updateOcasion(id, nombre) {
  return updateDoc(doc(db, "ocasiones", id), { nombre: nombre.trim() });
}
export async function deleteOcasion(id) {
  return deleteDoc(doc(db, "ocasiones", id));
}
export const OCASIONES_INICIALES = [
  "Cumpleaños",
  "Amor",
  "Meses",
  "Aniversario",
  "Amistad",
  "Día de la madre",
  "Día del padre",
  "Otro",
];

/* ============================================================
   DOMICILIARIOS
   ============================================================ */
export function listenDomiciliarios(cb) {
  const q = query(col("domiciliarios"), orderBy("nombre"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function addDomiciliario(nombre) {
  return addDoc(col("domiciliarios"), {
    nombre: nombre.trim(),
    activo: true,
    createdAt: serverTimestamp(),
  });
}
export async function updateDomiciliario(id, data) {
  return updateDoc(doc(db, "domiciliarios", id), data);
}
export async function setDomiciliarioActivo(id, activo) {
  return updateDoc(doc(db, "domiciliarios", id), { activo });
}

/* ============================================================
   LISTAS DE COMPRAS
   ============================================================ */
export function listenListasCompras(cb) {
  const q = query(col("listasCompras"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function getListaCompras(id) {
  const snap = await getDoc(doc(db, "listasCompras", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export function listenListaCompras(id, cb) {
  return onSnapshot(doc(db, "listasCompras", id), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}
export async function addListaCompras({ nombre, items = [], detallesSeleccionados = [] }) {
  return addDoc(col("listasCompras"), {
    nombre: nombre.trim(),
    items, // [{ productoId, nombre, cantidad, proveedorId, comprado }]
    detallesSeleccionados, // [{ detalleId, nombre, cantidad }] (para poder editar la lista luego)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateListaCompras(id, data) {
  return updateDoc(doc(db, "listasCompras", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteListaCompras(id) {
  return deleteDoc(doc(db, "listasCompras", id));
}

/* ============================================================
   PEDIDOS
   ============================================================ */
export function listenPedidosRecientes(cb, max = 60) {
  const q = query(col("pedidos"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.slice(0, max).map((d) => ({ id: d.id, ...d.data() }))));
}
export function listenTodosPedidos(cb) {
  const q = query(col("pedidos"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function addPedido(pedido) {
  // Se usa un ID generado de antemano para poder crear, en la misma operación
  // atómica, tanto el pedido (registro de venta permanente) como su registro
  // de domicilio (ficha de pago del domiciliario, que sí se puede depurar
  // más adelante sin afectar los informes de ventas).
  const pedidoRef = doc(col("pedidos"));
  const batch = writeBatch(db);
  batch.set(pedidoRef, {
    ...pedido,
    domicilioPagado: false,
    createdAt: serverTimestamp(),
  });
  if (pedido.domiciliarioId && pedido.valorDomicilio > 0) {
    const domicilioRef = doc(db, "domicilios", pedidoRef.id);
    batch.set(domicilioRef, {
      pedidoId: pedidoRef.id,
      fecha: pedido.fecha,
      nombreEnvia: pedido.nombreEnvia,
      nombreSorprendido: pedido.nombreSorprendido,
      resumenDetalles: (pedido.detalles || []).map((d) => d.nombre).join(", "),
      valorDomicilio: pedido.valorDomicilio,
      domiciliarioId: pedido.domiciliarioId,
      domiciliarioNombre: pedido.domiciliarioNombre || null,
      pagado: false,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return pedidoRef;
}

export async function marcarDomicilioPagado(pedidoId, pagado) {
  const batch = writeBatch(db);
  batch.update(doc(db, "pedidos", pedidoId), { domicilioPagado: pagado });
  batch.update(doc(db, "domicilios", pedidoId), { pagado });
  await batch.commit();
}

export async function eliminarPedidosPagados(pedidoIds) {
  await Promise.all(pedidoIds.map((id) => deleteDoc(doc(db, "pedidos", id))));
}

/* ============================================================
   DOMICILIOS (ficha de pago por domiciliario — se puede depurar
   sin afectar el historial de pedidos usado en los informes)
   ============================================================ */
export function listenDomiciliosPorDomiciliario(domiciliarioId, cb) {
  const q = query(col("domicilios"), where("domiciliarioId", "==", domiciliarioId), orderBy("fecha", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function eliminarDomiciliosPagados(domiciliarioId, ids) {
  await Promise.all(ids.map((id) => deleteDoc(doc(db, "domicilios", id))));
}

export function pedidosEnRango(pedidos, fechaInicioISO, fechaFinISO) {
  return pedidos.filter((p) => p.fecha >= fechaInicioISO && p.fecha <= fechaFinISO);
}

// Consulta eficiente por rango de fecha (fecha almacenada como 'YYYY-MM-DD'),
// evita traer toda la colección histórica de pedidos para reportes o el dashboard.
export function listenPedidosPorRango(fechaInicioISO, fechaFinISO, cb) {
  const q = query(
    col("pedidos"),
    where("fecha", ">=", fechaInicioISO),
    where("fecha", "<=", fechaFinISO),
    orderBy("fecha", "desc")
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
