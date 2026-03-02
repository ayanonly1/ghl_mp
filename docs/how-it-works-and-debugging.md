# How the app works in detail (and how to debug)

## One app URL, many accounts

Your app has **one** public URL, for example:

- `https://your-app.vercel.app/custom-page`
- `https://your-app.vercel.app/api/auth/ap/authorize`
- `https://your-app.vercel.app/api/auth/ap/callback`

When **5 different GHL accounts (or locations)** install this app from the Marketplace, they all use these same URLs. There is no separate “app instance” per account. Isolation works like this:

1. **Each install is just a link**  
   In each sub-account, “opening the app” means opening your **Custom Page URL** (e.g. in an iframe or new tab). So everyone hits the same `https://your-app.vercel.app/custom-page`.

2. **The browser cookie is the only “identity”**  
   Your app does **not** store “Account A”, “Account B”, etc. in a database. The only thing that ties a browser to a specific GHL location is the **session cookie** (`ghl_session`) that your server sets after OAuth.

3. **Flow per “user session”**  
   - User from **Account 1** opens the Custom Page → no cookie → sees “Connect your account” → clicks it → goes to GHL OAuth → picks **Location 1** → your callback runs → you set a cookie with **Location 1’s** token and redirect to `/custom-page`.  
   - From then on, **that browser** sends the cookie with every request. Your API reads the cookie, gets Location 1’s token, and calls GHL’s APIs for **that location only**.  
   - A **different** user (or the same user in another browser/incognito) from **Account 2** opens the same Custom Page URL → no cookie (or a different cookie) → connects again → gets a cookie for **Location 2**.  
   So: **one browser = one cookie = one location**. Five accounts = five different people (or five different browsers/sessions), each with their own cookie after they each complete “Connect your account”.

4. **No cross-account data**  
   Your backend never looks up “which account is this?” in a table. It only reads the signed cookie, gets `locationId` and `accessToken`, and uses that for all GHL API calls. So Account 1’s data never mixes with Account 2’s.

**Summary:** All 5 accounts use the same app and same URLs. They work “independently” because each user’s browser gets its **own** cookie after OAuth, and that cookie is the only context your server uses.

---

## End-to-end flow (step by step)

### When a user opens the app (e.g. from GHL)

1. **Request 1:** Browser loads `https://your-app.vercel.app/custom-page` (direct or in an iframe).
2. **Request 2:** The Custom Page’s JavaScript runs and calls `GET /api/agents/attachments` with `credentials: 'include'` (so the browser sends cookies).
3. **Your server:** Reads the `ghl_session` cookie. If there is no cookie or it’s invalid/expired → returns `401` with `{ error: "Unauthorized" }`.
4. **Custom Page:** Sees 401 → shows “Connect your account to use this app.”

### When the user clicks “Connect your account”

5. **Browser:** Navigates to `https://your-app.vercel.app/api/auth/ap/authorize`.
6. **Your server:** Builds the GHL OAuth URL with `client_id`, `redirect_uri`, `scope`, `state`, and **redirects the browser** to GHL (e.g. `https://marketplace.gohighlevel.com/oauth/chooselocation?...`).
7. **User:** On GHL’s site: signs in (if needed), chooses the **location** (sub-account) where the app is installed, and approves.
8. **GHL:** Redirects the browser to your **Redirect URI** with a one-time `code`, e.g.  
   `https://your-app.vercel.app/api/auth/ap/callback?code=...&state=...`

### Callback (where the cookie is set)

9. **Request 3:** Browser loads your callback URL (same browser, so same origin).
10. **Your server:**  
    - Calls GHL: “Exchange this `code` for tokens” (`POST .../oauth/token` with `code`, `redirect_uri`, `client_id`, `client_secret`, etc.).  
    - If GHL returns a **Company** token, you then call “installed locations” and “location token” to get a **location-scoped** token.  
    - You build a **session payload**: `locationId`, `accessToken`, `refreshToken`.  
    - You **sign** this payload with your secret and set the **cookie** `ghl_session=<signed-payload>` on the response.  
    - You **redirect** the browser to `https://your-app.vercel.app/custom-page`.
11. **Browser:** Stores the cookie (for your domain), then loads `/custom-page`.

### After redirect (user is “logged in”)

12. **Request 4:** The Custom Page loads and again calls `GET /api/agents/attachments` with `credentials: 'include'`.
13. **Your server:** Reads `ghl_session`, verifies the signature, decodes `locationId` and `accessToken`, and uses them to call GHL’s Voice AI APIs. Returns the list of agents/attachments.
14. **Custom Page:** Shows the MCP list and “Current MCP attachments” instead of “Connect your account.”

So the “connection” between GHL and your app is: **GHL gives you a `code` → you exchange it for tokens → you put the tokens in a signed cookie → every later request sends that cookie and you use the token for that location.**

---

## How to debug when you “open the app in the browser”

Use the **session debug endpoint** so you can see exactly what your server sees.

1. Open your app in the browser the same way you usually do (e.g. `https://your-app.vercel.app/custom-page` or from GHL).
2. When you see “Connect your account,” **in the same browser** (same tab or new tab) open:
   ```
   https://your-app.vercel.app/api/debug/session
   ```
   You will get a JSON response like:
   - `{ "cookiePresent": false, "sessionValid": false, "hint": "No session cookie. ..." }`  
     → The server never received a valid cookie. So either you never completed OAuth, or the cookie wasn’t set (e.g. callback failed), or the browser isn’t sending it (e.g. third‑party cookie blocking if the app is in an iframe).
   - `{ "cookiePresent": true, "sessionValid": false, "hint": "Cookie exists but invalid or expired. ..." }`  
     → Cookie is present but signature wrong or session expired. For example, `GHL_CLIENT_SECRET` or `SESSION_SECRET` might differ between when the cookie was set and now (e.g. wrong env in Vercel).
   - `{ "cookiePresent": true, "sessionValid": true, "locationIdMasked": "...xyz123" }`  
     → Session is valid. The app should work; if the Custom Page still shows “Connect your account,” the problem is likely that the **Custom Page** request isn’t sending the cookie (e.g. different origin or cookie policy).

3. **If you see “Connect your account” and then you click it and complete OAuth:**  
   After the redirect back to `/custom-page`, open `/api/debug/session` again in the same browser.  
   - If it still says `cookiePresent: false` or `sessionValid: false`, the **callback** is probably failing (e.g. wrong `redirect_uri`, wrong client credentials, or GHL returning an error). Check the URL after OAuth: if you land on `/custom-page?error=auth_failed&message=...`, the message is the error from the callback (e.g. from GHL). The Custom Page now shows that OAuth error at the top.

4. **Typical issues**
   - **Redirect URI mismatch:** In GHL Marketplace app settings, the “Redirect URI” must be **exactly** the same as `GHL_OAUTH_REDIRECT_URI` in Vercel (e.g. `https://your-app.vercel.app/api/auth/ap/callback`). No trailing slash, same scheme and host.
   - **Callback fails:** Token exchange fails (wrong client id/secret, or wrong `redirect_uri` sent to GHL). Then no cookie is set and you’re redirected to `/custom-page?error=auth_failed&message=...`.
   - **Cookie not sent in iframe:** If the Custom Page is loaded in an iframe from another domain (e.g. GHL), some browsers block third‑party cookies. Then the cookie might be set when you’re on the callback (same domain as your app) but not sent when the iframe loads your domain. Try opening the Custom Page URL in a **first‑party** tab (same window, not inside GHL’s iframe) to confirm the cookie is sent.
   - **Wrong env on Vercel:** `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_OAUTH_REDIRECT_URI` must match the GHL app. After changing env, redeploy.

---

## Quick checklist

- [ ] GHL Marketplace app: **Redirect URI** = `https://<your-vercel-domain>/api/auth/ap/callback`
- [ ] Vercel env: `GHL_OAUTH_REDIRECT_URI` = same URL
- [ ] Vercel env: `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET` set and correct
- [ ] After clicking “Connect your account,” you complete OAuth and are redirected back to your app (not to an error page on GHL)
- [ ] After redirect, opening `/api/debug/session` in the same browser shows `sessionValid: true`
- [ ] If the app is in an iframe and you still have issues, test by opening the Custom Page URL in a normal tab (no iframe) and check `/api/debug/session` again

Using this flow and the debug endpoint, you can see exactly how the two apps (GHL and your Vercel app) connect and why a given browser session is or isn’t “logged in.”
