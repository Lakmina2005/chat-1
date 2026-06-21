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
   Live username availability check (debounced)
--------------------------------------------------------- */
const usernameInput = document.getElementById("register-username");
const usernameStatus = document.getElementById("username-status");
const usernameError = document.getElementById("username-error");
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

let usernameCheckTimer = null;
let usernameIsAvailable = false;

usernameInput.addEventListener("input", () => {
  usernameInput.value = usernameInput.value.toLowerCase().replace(/\s+/g, "");
  usernameIsAvailable = false;
  usernameError.classList.remove("show");
  clearTimeout(usernameCheckTimer);

  const value = usernameInput.value.trim();

  if (!value) {
    usernameStatus.className = "username-status";
    return;
  }

  if (!USERNAME_PATTERN.test(value)) {
    usernameStatus.className = "username-status";
    usernameError.textContent = "3-20 characters: letters, numbers, underscores only.";
    usernameError.classList.add("show");
    return;
  }

  usernameStatus.textContent = "Checking availability…";
  usernameStatus.className = "username-status checking show";

  usernameCheckTimer = setTimeout(() => checkUsernameAvailability(value), 450);
});

async function checkUsernameAvailability(username) {
  try {
    const snap = await getDoc(doc(db, "usernames", username));
    if (snap.exists()) {
      usernameStatus.textContent = "✕ Username is taken";
      usernameStatus.className = "username-status taken show";
      usernameIsAvailable = false;
    } else {
      usernameStatus.textContent = "✓ Username is available";
      usernameStatus.className = "username-status ok show";
      usernameIsAvailable = true;
    }
  } catch (err) {
    usernameStatus.textContent = "Couldn't check right now";
    usernameStatus.className = "username-status taken show";
    usernameIsAvailable = false;
  }
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
  const username = usernameInput.value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  if (!USERNAME_PATTERN.test(username)) {
    showMsg(registerMsg, "Please choose a valid username first.", "error");
    return;
  }

  setLoading(registerSubmit, true);

  try {
    // Re-check username right before creating the account to reduce
    // (but not fully eliminate) the chance of a race condition.
    const usernameSnap = await getDoc(doc(db, "usernames", username));
    if (usernameSnap.exists()) {
      showMsg(registerMsg, "That username was just taken — please pick another.", "error");
      setLoading(registerSubmit, false);
      return;
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

    showMsg(registerMsg, "Account created! Redirecting…", "success");
    window.location.href = "chat.html";
  } catch (err) {
    showMsg(registerMsg, friendlyAuthError(err), "error");
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
