import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

import {
  initializeFirestore,
  persistentLocalCache,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "sorprendiendo-app.firebaseapp.com",
  projectId: "sorprendiendo-app",
  storageBucket: "sorprendiendo-app.firebasestorage.app",
  messagingSenderId: "343372382618",
  appId: "1:343372382618:web:af444772850eae0cad3a23"
};

export const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache(),
});

export const auth = getAuth(app);
export const storage = getStorage(app);

export const AUTH_EMAIL_DOMAIN = "sorprendiendo.local";