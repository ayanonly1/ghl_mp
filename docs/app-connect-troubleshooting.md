# App Connect Failing — Troubleshooting

When "Connect your account" opens the GoHighLevel OAuth URL and then fails, use this guide to find the cause.

**OAuth URL that opens:**  
`https://marketplace.gohighlevel.com/oauth/chooselocation?client_id=...&redirect_uri=...&scope=locations.readonly&state=...`

---

## 1. Where does it fail?

| What you see | Likely cause |
|--------------|--------------|
| You pick a location on GHL, then **never leave GHL** or see a GHL error | **Redirect URI mismatch** — GHL is not sending the user back to your callback. |
| You are sent to your app but URL has **`?error=auth_failed&message=...`** | **Token exchange failed** (wrong client secret, wrong redirect_uri in token request, or GHL API error). |
| You land on **`?error=missing_code`** | User denied or GHL did not send a `code`; or redirect_uri in GHL does not match. |
| You land on **`/custom-page`** with no error but still see "Connect your account" | **Cookie not set or not sent** (e.g. iframe + third‑party cookie / SameSite). |

---

## 2. Redirect URI must match exactly

GHL only redirects to a URI that is **exactly** listed in your app’s Auth settings.

1. In **GoHighLevel Marketplace** → your app → **Advanced Settings → Auth**.
2. Under **Redirect URL**, you must have **exactly**:
   ```text
   https://ap-mp.vercel.app/api/auth/ap/callback
   ```
   - No trailing slash.
   - `https` (not `http`).
   - Same host and path as above.

3. In **Vercel** (Environment Variables), set:
   ```text
   GHL_OAUTH_REDIRECT_URI=https://ap-mp.vercel.app/api/auth/ap/callback
   ```
   Same value as in GHL — no extra spaces or slash.

If this does not match, after choosing a location GHL will not redirect to your app (or will show an error), and the flow will "fail" after opening the chooselocation URL.

---

## 3. Token exchange (callback) failing

If you **do** get redirected to your app but the URL is:

```text
https://ap-mp.vercel.app/custom-page?error=auth_failed&message=...
```

Then the **callback** ran but the token exchange with GHL failed. Check:

- **Vercel env**
  - `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET` are set and match the app in the Marketplace (no typos, correct app).
  - `GHL_OAUTH_REDIRECT_URI` is exactly `https://ap-mp.vercel.app/api/auth/ap/callback` (same as in GHL).
- **GHL**
  - Client secret is from the same app and not regenerated without updating Vercel.
  - Scopes (e.g. `locations.readonly`) are allowed for the app.

Decode the `message=` value in the URL to see the exact error from GHL (e.g. `invalid_grant`, `redirect_uri_mismatch`).

---

## 4. App opened inside GHL (iframe)

If the app is loaded **inside the HighLevel iframe**:

- The callback must set the session cookie with **`SameSite=None; Secure; Partitioned`** so the browser keeps it in the iframe context. The codebase does this in production.
- Prefer the **popup** flow: "Connect" opens a popup, you complete OAuth there, and the parent receives the session via `postMessage` so the iframe does not rely on third‑party cookies.
- If you use the in-iframe link (no popup), complete the whole OAuth flow **inside the same iframe** (do not open the chooselocation URL in a new tab), so the callback runs in the same partition and the cookie is sent on the next request.

If the cookie is not sent in the iframe, you will land on `/custom-page` with no `?error=` but still see "Connect your account". Then check [DEBUG-iframe-cookie.md](./DEBUG-iframe-cookie.md).

---

## 5. Quick checklist

- [ ] **GHL Marketplace → Auth → Redirect URL** = `https://ap-mp.vercel.app/api/auth/ap/callback` (exact).
- [ ] **Vercel** `GHL_OAUTH_REDIRECT_URI` = `https://ap-mp.vercel.app/api/auth/ap/callback`.
- [ ] **Vercel** `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET` set and correct for this app.
- [ ] After OAuth, check the **final URL** (success vs `?error=auth_failed&message=...` or `?error=missing_code`).
- [ ] In **Network** tab: request to `/api/auth/ap/callback?code=...` exists; check response for **Set-Cookie: ghl_session** and status (302 = success).
- [ ] If in iframe: use popup flow or complete OAuth in the same iframe; see [DEBUG-iframe-cookie.md](./DEBUG-iframe-cookie.md) if the cookie still does not work.

For more detail on the OAuth flow and cookie debugging, see [debugging-oauth-and-cookie.md](./debugging-oauth-and-cookie.md) and [auth-flow-ghl-vercel.md](./auth-flow-ghl-vercel.md).
