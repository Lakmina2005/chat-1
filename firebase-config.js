// =========================================================
// firebase-config.js
// -----------------------------------------------------------
// 1. Go to https://console.firebase.google.com → your project
// 2. Project settings (gear icon) → General → "Your apps"
// 3. Click the Web app (</>) → copy the firebaseConfig object
// 4. Paste it below, replacing the placeholder values.
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVZ6Fe5V2CTs3qQF-mvSp7KWo0l_6Fngc",
  authDomain: "studio-9137786164-3f664.firebaseapp.com",
  projectId: "studio-9137786164-3f664",
  // ⚠️ storageBucket eka oyage console snippet eke thibune naha —
  // Storage feature eka mulinma enable karala naththan,
  // Firebase eka eka generate karanne naha. Pahala note eka balanna.
  storageBucket: "studio-9137786164-3f664.firebasestorage.app",
  messagingSenderId: "1097269800864",
  appId: "1:1097269800864:web:951c5d22f90e5b5d207ec5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
