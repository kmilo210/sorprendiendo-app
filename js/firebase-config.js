// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================
// Reemplaza estos valores con los datos de TU proyecto de Firebase.
// Los encuentras en: Firebase Console > Configuración del proyecto > Tus apps > SDK setup and configuration
//
// Instrucciones completas en README.md
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJHBr9ziql6eTNdnv6x7I98FvF7ieeFXo",
  authDomain: "sorprendiendo-app.firebaseapp.com",
  projectId: "sorprendiendo-app",
  storageBucket: "sorprendiendo-app.firebasestorage.app",
  messagingSenderId: "343372382618",
  appId: "1:343372382618:web:af444772850eae0cad3a23"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Permite que la app funcione mejor con conexión intermitente (celular en movimiento, etc).
// Si falla (por ejemplo, varias pestañas abiertas), simplemente lo ignoramos: la app
// sigue funcionando en línea con Firebase como fuente de verdad.
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (e) {
  /* noop */
}

// Dominio ficticio usado para convertir el "usuario" en un correo válido para
// Firebase Authentication (Firebase Auth requiere email + password).
export const AUTH_EMAIL_DOMAIN = "sorprendiendo.local";
