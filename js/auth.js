// ============================================================
// AUTENTICACIÓN
// ============================================================
import { auth, AUTH_EMAIL_DOMAIN } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

function usernameToEmail(username) {
  const clean = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  return `${clean}@${AUTH_EMAIL_DOMAIN}`;
}

export function watchAuthState(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, (user) => {
    if (user) onLoggedIn(user);
    else onLoggedOut();
  });
}

export async function login(username, password) {
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

const AUTH_ERROR_MESSAGES = {
  "auth/invalid-credential": "Usuario o contraseña incorrectos.",
  "auth/invalid-email": "Usuario o contraseña incorrectos.",
  "auth/user-not-found": "Usuario o contraseña incorrectos.",
  "auth/wrong-password": "Usuario o contraseña incorrectos.",
  "auth/too-many-requests": "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.",
  "auth/network-request-failed": "No hay conexión a internet. Verifica tu red.",
};

export function friendlyAuthError(error) {
  return AUTH_ERROR_MESSAGES[error?.code] || "No fue posible iniciar sesión. Intenta de nuevo.";
}
