# Using the app on localhost (session / cookies)

You can run the app locally and reuse your Vercel session by copying one cookie, or you can do OAuth on localhost so no copy is needed.

---

## Option A: Copy the session cookie from Vercel to localhost

Only **one** cookie is used for auth: **`ghl_session`**. The app does not use any other cookies for API auth.

### What you need

1. **Same `SESSION_SECRET` locally as on Vercel**  
   The cookie is signed with `SESSION_SECRET` (or `GHL_CLIENT_SECRET` if `SESSION_SECRET` is not set). In `.env.local` set:
   ```env
   SESSION_SECRET=<same value as on Vercel>
   ```
   If you don’t set this, the cookie will be rejected as invalid when you use it on localhost.

2. **Copy the `ghl_session` cookie value from the Vercel app**

   - Open the app on Vercel (e.g. `https://ap-mp.vercel.app/custom-page`) in a browser where you’re already logged in.
   - Open DevTools → **Application** (Chrome) or **Storage** (Firefox) → **Cookies** → select `https://ap-mp.vercel.app` (or your Vercel domain).
   - Find the cookie named **`ghl_session`** and copy its **Value** (the long string).

3. **Set that cookie for localhost**

   - Open your app on localhost (e.g. `http://localhost:3000/custom-page`).
   - Open DevTools → **Application** → **Cookies** → select `http://localhost:3000`.
   - Add a cookie:
     - **Name:** `ghl_session`
     - **Value:** (paste the value you copied from Vercel)
     - **Path:** `/`
   - Save/apply.

4. Reload `http://localhost:3000/custom-page`. The app should treat you as logged in and use the same session as on Vercel.

### Summary: which cookies to copy

| Cookie        | Copy? | Notes                                                                 |
|----------------|-------|-----------------------------------------------------------------------|
| **`ghl_session`** | **Yes** | Only cookie used for auth. Copy its **value** and set it for localhost. |
| `oauth_flow`  | No    | Only used during OAuth (popup flow); not needed for API calls.         |

No other cookies need to be copied.

---

## Option B: Do OAuth on localhost (no cookie copy)

You can log in from localhost so that the session cookie is set by your local server.

1. **Add localhost redirect URI in GHL**
   - In [GHL Marketplace](https://marketplace.gohighlevel.com/) → your app → OAuth / Redirect URIs, add:
     - `http://localhost:3000/api/auth/ap/callback`  
     (or `http://localhost:PORT/api/auth/ap/callback` if you use another port.)

2. **Configure `.env.local`**
   ```env
   GHL_CLIENT_ID=<your client id>
   GHL_CLIENT_SECRET=<your client secret>
   GHL_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/ap/callback
   SESSION_SECRET=<any secret; can be different from Vercel>
   # Optional, for redirects:
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Run the app locally (`npm run dev`), open `http://localhost:3000/custom-page`, and click **“Connect your account”**. Complete OAuth; the callback will set `ghl_session` for localhost.

No need to copy any cookies from Vercel; the session is created on localhost.

---

## Troubleshooting

- **“Connect your account” or 401 on localhost after copying the cookie**  
  - Cookie value must be exactly the one from Vercel (no extra spaces).  
  - `SESSION_SECRET` in `.env.local` must match the one used on Vercel when the cookie was created.

- **Cookie not sent to localhost**  
  - Ensure the cookie is set for `http://localhost:3000` (or your dev URL) and path `/`.  
  - Don’t set the cookie for a different domain (e.g. 127.0.0.1) than the one you’re opening in the browser.

- **OAuth on localhost fails (redirect URI mismatch)**  
  - The redirect URI in GHL must match `GHL_OAUTH_REDIRECT_URI` exactly (including `http://`, port, and path).  
  - No trailing slash.
