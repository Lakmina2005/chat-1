# Firebase Setup Guide — Step 1

Follow these before opening `index.html`. Takes about 10 minutes.

## 1. Create the Firebase project
1. Go to **https://console.firebase.google.com**
2. Click **Add project** → name it (e.g. `my-chat-app`) → disable Google Analytics (not needed) → **Create project**.

## 2. Register a Web App
1. On the project overview page, click the **Web (`</>`)** icon.
2. Give it a nickname (e.g. `chatapp-web`). Don't check "Firebase Hosting" — you're using GitHub Pages.
3. Click **Register app**. Firebase shows you a `firebaseConfig` object — **copy it**.
4. Open `firebase-config.js` in this project and paste your values over the placeholders:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

## 3. Enable Authentication
1. In the left sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Settings** tab → **Authorized domains** → add your GitHub Pages domain once you deploy, e.g. `yourusername.github.io` (`localhost` is already allowed for local testing).

## 4. Create the Firestore Database
1. **Build → Firestore Database → Create database**.
2. Choose a location close to your users, start in **production mode** (we'll set real rules next).
3. Once created, go to the **Rules** tab and replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Reserved usernames — anyone can read (for lookups/search),
    // but a username can only be claimed once and never changed.
    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    // User profiles — anyone signed in can read (needed to show
    // names/photos in chats), only the owner can write their own doc.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
4. Click **Publish**.

> Note: this client-only setup checks username availability before creating an
> account, but it can't *guarantee* uniqueness under a rare simultaneous
> race condition. For a production app you'd enforce this with a Cloud
> Function. Fine for learning/personal projects.

## 5. Enable Storage
1. **Build → Storage → Get started** → same location as Firestore → Production mode.
2. Go to the **Rules** tab and replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile_pictures/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```
3. Click **Publish**.

## 6. Run it locally
Static files can't use `fetch`/ES modules over `file://`, so serve them with any local server, e.g.:

```bash
# Python
python3 -m http.server 5500
# then open http://localhost:5500
```

Or use the VS Code "Live Server" extension.

## 7. Deploy to GitHub Pages (once you're happy with it)
1. Push this folder to a GitHub repo.
2. Repo **Settings → Pages → Source** → select your branch / root.
3. Once live, add the resulting `https://yourusername.github.io` URL to
   **Authentication → Settings → Authorized domains** (Step 3.3 above).

---

## Files in this step

| File | Purpose |
|---|---|
| `index.html` | Login + Register screen |
| `style.css` | Shared WhatsApp-dark-mode theme |
| `firebase-config.js` | Your Firebase project keys + SDK init |
| `auth.js` | Login/register logic, username uniqueness check, profile photo upload |
| `chat.html` | Temporary placeholder — confirms login works. Replaced with the full chat UI in Step 2. |

## Testing checklist
- [ ] Register with a new email, username, display name, and (optionally) a photo
- [ ] Username field shows "✓ available" / "✕ taken" as you type
- [ ] Submitting creates the account and redirects to `chat.html` showing your name/photo
- [ ] Log out, then log back in with the same email/password
- [ ] In the Firebase console, confirm: a user in **Authentication**, a doc in **Firestore → users**, a doc in **Firestore → usernames**, and a file in **Storage → profile_pictures**

Once all of this works, let me know and we'll move to **Step 2: the main chat UI and sidebar**.
