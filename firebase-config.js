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
  apiKey: "AIzaSyB7ZbhU6H_fGkZu4cWR4eyc8d0gakK7kdY",
  authDomain: "mywhatsappchat-7cb60.firebaseapp.com",
  projectId: "mywhatsappchat-7cb60",
  storageBucket: "mywhatsappchat-7cb60.firebasestorage.app",
  messagingSenderId: "479602961695",
  appId: "1:479602961695:web:9e07a177da2235d9b2142a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
