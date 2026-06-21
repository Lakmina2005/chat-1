// =========================================================
// auth.js — Step 1: Login / Register logic
// =========================================================

import { auth, db, storage } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* ---------------------------------------------------------
   Tab switching (Log In / Sign Up)
--------------------------------------------------------- */
const tabs = document.querySelectorAll(".auth-tab");
const forms = document.querySelectorAll(".auth-form");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    forms.forEach((f) => f.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-form`).classList.add("active");
  });
});

/* ---------------------------------------------------------
   Password show/hide toggles
--------------------------------------------------------- */
document.querySelectorAll(".toggle-visibility").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
  });
});

/* ---------------------------------------------------------
   Profile picture preview
--------------------------------------------------------- */
const photoInput = document.getElementById("register-photo");
const avatarPreview = document.getElementById("avatar-preview");
const avatarPlaceholder = document.querySelector(".avatar-placeholder");
let selectedPhotoFile = null;

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    photoInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("Please choose an image smaller than 5MB.");
    photoInput.value = "";
    return;
  }

  selectedPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    avatarPreview.src = e.target.result;
    avatarPreview.style.display = "block";
    avatarPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
});

/* ---------------------------------------------------------
   Auto-generated username: base text + 4 random digits
   e.g. typing "lakmina" suggests "lakmina4821"
--------------------------------------------------------- */
const usernameInput = document.getElementById("register-username");
const usernameStatus = document.getElementById("username-status");
const usernameError = document.getElementById("username-error");
const usernamePreview = document.getElementById("username-preview");
const usernamePreviewValue = document.getElementById("username-preview-value");
const regenBtn = document.getElementById("regen-username-btn");

const BASE_PATTERN = /^[a-z0-9_]{3,16}$/;

let usernameCheckTimer = null;
let checkToken = 0;          // guards against stale/out-of-order async checks
let finalUsername = "";      // the generated username currently confirmed available
let usernameIsAvailable = false;

function sanitizeBase(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function randomSuffix() {
  return String(Math.floor(1000 + Math.random() * 9000)); // always 4 digits
}

usernameInput.addEventListener("input", () => {
  const base = sanitizeBase(usernameInput.value);
  // keep the field itself clean (lowercase, no invalid chars) without forcing digits on it
  if (usernameInput.value !== base) usernameInput.value = base;

  usernameError.classList.remove("show");
  usernameIsAvailable = false;
  finalUsername = "";
  clearTimeout(usernameCheckTimer);

  if (!base) {
    usernamePreview.classList.remove("show");
    usernameStatus.className = "username-status";
    return;
  }

  if (!BASE_PATTERN.test(base)) {
    usernamePreview.classList.remove("show");
    usernameStatus.className = "username-status";
    usernameError.textContent = "3-16 characters: letters, numbers, underscores only.";
    usernameError.classList.add("show");
    return;
  }

  usernamePreview.classList.add("show");
  usernamePreviewValue.textContent = `${base}····`;
  usernameStatus.textContent = "Generating a unique number…";
  usernameStatus.className = "username-status checking show";

  usernameCheckTimer = setTimeout(() => generateAndCheck(base), 450);
});

regenBtn.addEventListener("click", () => {
  const base = sanitizeBase(usernameInput.value);
  if (!BASE_PATTERN.test(base)) return;
  regenBtn.classList.add("spinning");
  generateAndCheck(base).finally(() => regenBtn.classList.remove("spinning"));
});

// Tries a few random 4-digit suffixes until it finds one that's free.
async function generateAndCheck(base, attempt = 1) {
  const myToken = ++checkToken;
  const suffix = randomSuffix();
  const candidate = `${base}${suffix}`;

  usernamePreviewValue.textContent = candidate;
  usernameStatus.textContent = "Checking availability…";
  usernameStatus.className = "username-status checking show";

  try {
    const snap = await getDoc(doc(db, "usernames", candidate));
    if (myToken !== checkToken) return; // a newer keystroke/click superseded this check

    if (snap.exists()) {
      if (attempt < 5) {
        return generateAndCheck(base, attempt + 1);
      }
      usernameStatus.textContent = "Having trouble finding a free number — tap ⟳ to retry";
      usernameStatus.className = "username-status taken show";
      usernameIsAvailable = false;
      return;
    }

    usernameStatus.textContent = "✓ Available";
    usernameStatus.className = "username-status ok show";
    finalUsername = candidate;
    usernameIsAvailable = true;
  } catch (err) {
    console.error("Username check failed:", err);
    if (myToken !== checkToken) return;
    usernameStatus.textContent = "Couldn't check right now — check your Firestore setup (see console for details)";
    usernameStatus.className = "username-status taken show";
    usernameIsAvailable = false;
  }
}

// Used right before account creation: re-confirms (or finds a fresh) free username.
async function reserveUsername(base) {
  for (let i = 0; i < 6; i++) {
    const suffix = randomSuffix();
    const candidate = `${base}${suffix}`;
    const snap = await getDoc(doc(db, "usernames", candidate));
    if (!snap.exists()) return candidate;
  }
  throw new Error("username-exhausted");
}

/* ---------------------------------------------------------
   Helpers: form messages + button loading state
--------------------------------------------------------- */
function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `auth-form-msg show ${type}`;
}

function clearMsg(el) {
  el.className = "auth-form-msg";
}

function setLoading(btn, isLoading) {
  btn.disabled = isLoading;
  btn.classList.toggle("loading", isLoading);
}

function friendlyAuthError(err) {
  const map = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again."
  };
  return map[err.code] || "Something went wrong. Please try again.";
}

/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-msg");
const loginSubmit = document.getElementById("login-submit");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg(loginMsg);

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  setLoading(loginSubmit, true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMsg(loginMsg, "Logged in! Redirecting…", "success");
    window.location.href = "chat.html";
  } catch (err) {
    showMsg(loginMsg, friendlyAuthError(err), "error");
  } finally {
    setLoading(loginSubmit, false);
  }
});

/* ---------------------------------------------------------
   REGISTER
--------------------------------------------------------- */
const registerForm = document.getElementById("register-form");
const registerMsg = document.getElementById("register-msg");
const registerSubmit = document.getElementById("register-submit");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg(registerMsg);

  const displayName = document.getElementById("register-name").value.trim();
  const base = sanitizeBase(usernameInput.value);
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  if (!BASE_PATTERN.test(base)) {
    showMsg(registerMsg, "Please enter a valid username first.", "error");
    return;
  }

  setLoading(registerSubmit, true);

  try {
    // Prefer the suggestion already shown on screen; re-confirm it's still
    // free, and only generate a fresh one if it was just taken.
    let username = finalUsername;
    let stillFree = false;

    if (username) {
      const snap = await getDoc(doc(db, "usernames", username));
      stillFree = !snap.exists();
    }

    if (!stillFree) {
      username = await reserveUsername(base);
    }

    // 1. Create the auth account (this also signs the user in)
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // 2. Upload the profile picture, if one was chosen
    let photoURL = "";
    if (selectedPhotoFile) {
      const fileRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(fileRef, selectedPhotoFile);
      photoURL = await getDownloadURL(fileRef);
    }

    // 3. Update the Auth profile (so user.displayName / photoURL are set)
    await updateProfile(user, { displayName, photoURL });

    // 4. Write the user doc + reserve the username, together
    const batch = writeBatch(db);
    batch.set(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName,
      username,
      email,
      photoURL,
      createdAt: serverTimestamp()
    });
    batch.set(doc(db, "usernames", username), {
      uid: user.uid
    });
    await batch.commit();

    showMsg(registerMsg, `Account created as @${username}! Redirecting…`, "success");
    window.location.href = "chat.html";
  } catch (err) {
    if (err.message === "username-exhausted") {
      showMsg(registerMsg, "Couldn't find a free username — please try a different base name.", "error");
    } else {
      showMsg(registerMsg, friendlyAuthError(err), "error");
    }
  } finally {
    setLoading(registerSubmit, false);
  }
});

/* ---------------------------------------------------------
   If already logged in, skip straight to the chat placeholder
--------------------------------------------------------- */
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith("index.html")) {
    // Comment this out while testing if you want to stay on this page.
    // window.location.href = "chat.html";
  }
});
