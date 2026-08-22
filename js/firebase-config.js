// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

import {
  initializeFirestore,
  persistentLocalCache,
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

// Firestore usa la base de datos "sorprendiendo01"
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache(),
  },
  "sorprendiendo01"
);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Dominio ficticio usado para convertir el "usuario"
// en un correo válido para Firebase Authentication.
export const AUTH_EMAIL_DOMAIN = "sorprendiendo.local";