# Debugging: Cookie not working in HighLevel iframe

When the app works in a **direct tab** but not inside the **HighLevel iframe**, the browser is not sending the session cookie in the iframe (third-party context). Use this guide to capture the right information for debugging, or to verify the **popup flow** (recommended for iframes).

---

## Option A: Use the popup flow (recommended)

When the app is opened inside the HighLevel iframe:

1. Click **“Connect your account”** (it opens a **popup**).
2. Complete GHL sign-in in the popup.
3. The popup closes and the iframe receives the session via `postMessage` and uses it in API requests (no cookie needed in the iframe).

If this works, no further debugging is needed. If the popup flow fails, capture the items in **Option B** and share them.

---

## Option B: What to capture to debug cookie behavior

If you want to debug why the **cookie** is not sent in the iframe (or why the popup flow fails), capture the following.

### 1. Callback response (from inside the iframe)

1. Open the app **inside the HighLevel iframe** (Custom Page URL in GHL).
2. Open **DevTools** (F12) → **Network** tab. Check **Preserve log**.
3. Click **“Connect your account”** (or “Try again”) and complete OAuth **in the same window** (do not use the popup; use the normal link if you temporarily change it back, or use a build that still uses the link).
4. After redirect, in the Network list find the request: **`callback`** or **`/api/auth/ap/callback?code=...`**.
5. Click that request. In the **Headers** section, under **Response Headers**, copy the full **`Set-Cookie`** line (or take a screenshot).

**Share:** The exact `Set-Cookie` header value (you can redact the long token value if needed; we need to see the attributes: `Path`, `HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Partitioned`).

### 2. Where did the redirect land?

After GHL redirected back to your app:

- Did the **address bar** show your app URL in the **iframe** (e.g. `https://your-app.vercel.app/custom-page`)?
- Or did the **entire browser tab** navigate to your app (top-level), so the iframe disappeared?

**Share:** “Redirect stayed in iframe” or “Redirect was top-level (full tab)”.

### 3. Cookies in DevTools (iframe context)

1. With the app open **in the HighLevel iframe**, open DevTools.
2. Go to **Application** (Chrome) or **Storage** (Firefox).
3. In the left sidebar, under **Storage** → **Cookies**, check both:
   - The **top-level** origin (e.g. HighLevel’s domain).
   - Your app’s origin (e.g. `https://your-app.vercel.app`).
4. For your app’s origin, note whether **`ghl_session`** is listed and whether it has a **Partition Key** (or similar) shown.

**Share:**  
- “ghl_session present for my app / not present”  
- “Partition Key: empty / (HighLevel domain) / (my app domain)”  
- Screenshot of the cookie table for your app’s origin (you can redact the cookie value).

### 4. Request that fails (e.g. attachments)

1. In the same iframe context, trigger the failing request (e.g. load the page so it calls `/api/agents/attachments`).
2. In **Network**, click that request (e.g. **`attachments`**).
3. Open the **Cookies** (or **Headers** → **Request Headers**) section.
4. Check whether **`ghl_session`** appears under **Request Cookies** (or in **Cookie** header).  
   If there is a note like “cookies in another partition were not sent”, that confirms the issue.

**Share:**  
- “ghl_session sent / not sent”  
- Screenshot of the request’s Cookies section (or the “filtered out” message).

### 5. Environment

**Share:**

- App URL (e.g. `https://ap-mp.vercel.app`).
- Whether you’re on **Chrome**, **Edge**, **Safari**, or **Firefox** (and version if possible).
- Whether you’re using the **popup** “Connect” flow or the **in-frame** link.

---

## Summary checklist for you to share

- [ ] **Set-Cookie** from the callback response (full line or screenshot).
- [ ] Redirect stayed in iframe vs top-level.
- [ ] Whether `ghl_session` exists for your app’s origin and its Partition Key (if shown).
- [ ] Whether `ghl_session` is sent on the failing request (e.g. `attachments`).
- [ ] Browser and app URL.
- [ ] Whether you used the popup flow or the in-frame link.

With that, we can tell whether the problem is: cookie not set correctly, cookie in the wrong partition, or redirect happening in the wrong context — and suggest the right fix (or confirm the popup flow is the solution).
