# How to debug OAuth and the session cookie

Use this **before** changing code, to see exactly where the flow breaks.

---

## 1. Open DevTools and keep the Network tab visible

1. Open your app: `https://ap-mp.vercel.app/custom-page` (or from GHL).
2. Open **Developer Tools** (F12 or right‑click → Inspect).
3. Go to the **Network** tab.
4. Optionally check **“Preserve log”** so redirects don’t clear the list.
5. Leave DevTools open for the whole flow below.

---

## 2. Run the OAuth flow and watch the requests

1. Click **“Connect your account”** (goes to `/api/auth/ap/authorize`).
2. On **GHL’s page**, sign in and pick the location, then approve.
3. You should be **redirected back** to your app.

While you do this, watch the **Network** tab:

| Step | What to look for |
|------|-------------------|
| After clicking “Connect your account” | A request to `.../api/auth/ap/authorize` → status **302** → next request to `marketplace.gohighlevel.com/oauth/chooselocation?...` |
| After you approve on GHL | A request to `.../api/auth/ap/callback?code=...&state=...` (this is the callback). |
| After the callback | A request to `.../custom-page` (redirect from the callback). |

**Important:** Find the **callback** request (`/api/auth/ap/callback?code=...`) in the list and click it. Then check:

- **Status:** 302 (redirect) = callback ran and redirected. 200/500 or no request = callback not hit or error.
- **Response headers:** Look for **`Set-Cookie`** with `ghl_session=...`.  
  - If **Set-Cookie is present** → the server set the cookie; the problem is likely the browser not storing or sending it (e.g. SameSite, or size).  
  - If **Set-Cookie is missing** → the callback either failed before setting the cookie (e.g. token exchange error) or returned an error redirect.

---

## 3. Check the URL you land on after OAuth

Right after GHL redirects you back, look at the **address bar**:

- **`https://ap-mp.vercel.app/custom-page`** (no query)  
  → Callback ran and redirected. If the cookie still doesn’t work, the issue is cookie storage/sending (see step 4 and 5).

- **`https://ap-mp.vercel.app/custom-page?error=auth_failed&message=...`**  
  → Callback ran but **token exchange failed** (e.g. wrong `redirect_uri`, wrong client secret, or GHL error). The message is in `message=...` (URL‑decoded). No cookie is set in this case.

- **`https://ap-mp.vercel.app/custom-page?error=missing_code`**  
  → Callback was hit without a `code` (e.g. user denied or GHL didn’t send it). No cookie set.

- You never reach `ap-mp.vercel.app` / you stay on GHL  
  → Redirect URI in GHL might be wrong, or the callback URL is not your app.

---

## 4. Check the session debug endpoint (same browser, same tab)

Right after you’ve been redirected back to your app (same tab where you see the Custom Page):

1. In the **same tab**, go to:  
   `https://ap-mp.vercel.app/api/debug/session`
2. You get a JSON response.

**How to read it:**

| Response | Meaning |
|----------|--------|
| `cookiePresent: false` | The server did **not** receive a `ghl_session` cookie. Either the callback never set it, or the browser didn’t store it, or the browser didn’t send it on this request. |
| `cookiePresent: true`, `sessionValid: false` | A cookie was sent but it’s invalid or expired (e.g. wrong secret, or expired). |
| `cookiePresent: true`, `sessionValid: true`, `locationIdMasked: "...xyz"` | Session is valid; the app should consider you logged in. |

Do this in the **same tab** (and same window) as the Custom Page. If you open `/api/debug/session` in a different tab/window or another browser profile, that context might not have the cookie.

---

## 5. Check cookies in DevTools (Application tab)

1. In DevTools, open the **Application** tab (Chrome) or **Storage** (Firefox).
2. Under **Storage** → **Cookies**, select `https://ap-mp.vercel.app`.
3. Look for a cookie named **`ghl_session`**.

- **No `ghl_session`**  
  - Callback might not have sent `Set-Cookie` (see step 2), or  
  - Browser rejected it (e.g. size over ~4KB, or SameSite in an iframe).
- **`ghl_session` is present**  
  - Cookie was stored. If `/api/debug/session` still says `cookiePresent: false`, you’re likely calling the debug URL in a different context (e.g. different tab that didn’t go through the redirect, or incognito).

---

## 6. If the app is inside GHL (iframe)

When the app is embedded in GHL (iframe from another domain):

1. In the Network tab, confirm the **callback** request (`/api/auth/ap/callback?code=...`) is there and check for **Set-Cookie** on that response (step 2). The cookie must include **`Partitioned`** (CHIPS) so the browser stores it in the iframe’s partition.
2. In the Application tab, select the **top-level** frame or the iframe’s origin and check cookies for **`ap-mp.vercel.app`** (step 5). Some browsers group cookies by top-level site when the page is in an iframe.
3. Call **`/api/debug/session`** in the **same** iframe context (e.g. open it in the same iframe or the same tab that’s showing the app). If you open the debug URL in a new tab (top-level), that tab might be first‑party and have different cookies than the iframe.

That will tell you whether the cookie is set but not sent in the iframe (e.g. third‑party cookie rules) vs never set at all.

### Cookie partition (CHIPS) and “cookies in another partition”

Browsers partition third‑party cookies by **(top-level site, your domain)**. For the session to work in the GHL iframe:

- **Complete OAuth in the same iframe.** Click “Connect your account” and finish the GHL sign‑in **without** opening the link in a new tab and without the redirect opening in the top-level window. If the callback runs in a different context (e.g. top-level tab), the cookie is stored in the wrong partition and will not be sent when the app loads in the iframe.
- The callback sets the cookie with **`SameSite=None; Secure; Partitioned`** so it is sent in the cross-site iframe. If you see “This site has cookies in another partition that were not sent”, the cookie was likely set in a first‑party context (e.g. after opening the app in a new tab). Connect again from inside the GHL iframe and do not leave the iframe during the flow.

---

## Quick checklist

- [ ] Network: request to `/api/auth/ap/callback?code=...` appears after OAuth.
- [ ] Callback response: status 302 and **Set-Cookie: ghl_session=...** (with **Partitioned** when in iframe).
- [ ] Final URL: `.../custom-page` (no `?error=`) or `?error=auth_failed&message=...`.
- [ ] Application: cookie `ghl_session` exists for `ap-mp.vercel.app`.
- [ ] `/api/debug/session` opened in the **same** tab/window/iframe: `cookiePresent` and `sessionValid` as expected.

Once you know which of these fails (callback not hit, no Set-Cookie, cookie not stored, or cookie not sent), you can target the fix (e.g. SameSite, redirect URI, or token exchange).
