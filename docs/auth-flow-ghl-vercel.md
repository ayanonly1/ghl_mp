# How GoHighLevel and Your Vercel App Connect

This doc explains the full OAuth and session flow between **GoHighLevel (GHL)** and your **MCP Registry app** hosted on Vercel.

---

## High-level flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User in GHL    │     │  Your Vercel App │     │  GHL OAuth API   │
│  (sub-account)  │     │                  │     │  (marketplace)   │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │  1. Open Custom Page  │                        │
         │  (iframe or link)     │                        │
         │──────────────────────>│                        │
         │                       │                        │
         │  2. No session →      │                        │
         │  "Connect your        │                        │
         │   account"            │                        │
         │<──────────────────────│                        │
         │                       │                        │
         │  3. User clicks       │                        │
         │  "Connect your        │                        │
         │   account"            │                        │
         │──────────────────────>│  4. Redirect to       │
         │                       │     GHL OAuth          │
         │                       │───────────────────────>│
         │                       │     (chooselocation)   │
         │  5. User picks       │                        │
         │  location & approves  │                        │
         │<──────────────────────────────────────────────│
         │                       │                        │
         │  6. GHL redirects     │                        │
         │  to your callback     │                        │
         │  with ?code=...       │                        │
         │──────────────────────>│  7. Exchange code     │
         │                       │     for tokens         │
         │                       │───────────────────────>│
         │                       │                        │
         │                       │  8. Tokens + maybe    │
         │                       │     location token     │
         │                       │<───────────────────────│
         │                       │                        │
         │  9. Set session       │                        │
         │  cookie, redirect     │                        │
         │  to /custom-page      │                        │
         │<──────────────────────│                        │
         │                       │                        │
         │  10. Custom Page      │                        │
         │  loads with cookie    │                        │
         │  → API calls work     │                        │
         │<──────────────────────│                        │
```

---

## Step-by-step (what actually happens)

### 1. User opens the Custom Page

- **From GHL:** User installs the app in a sub-account; GHL shows the app and opens the **Custom Page URL** you configured (e.g. `https://your-app.vercel.app/custom-page`). That URL is often loaded in an iframe.
- **Direct:** User can also open `https://your-app.vercel.app/custom-page` in a browser tab.

### 2. Your app has no session yet

- The Custom Page (React) calls your API, e.g. `GET /api/agents/attachments` with `credentials: 'include'` so the browser sends cookies.
- Your API uses `getAuthContext()` → reads the `ghl_session` cookie → looks up the session (locationId + access token).
- **First time:** There is no cookie (or session is missing/invalid), so the API returns `401` with `error: "Unauthorized"`.
- The Custom Page then shows: **“Connect your account to use this app.”**

### 3. User clicks “Connect your account”

- That link goes to: **`/api/auth/ap/authorize`** on your Vercel app.
- Your app:
  - Generates a `state` (session id for CSRF).
  - Redirects the browser to GHL’s OAuth “choose location” URL:
    - `https://marketplace.gohighlevel.com/oauth/chooselocation?client_id=...&redirect_uri=...&scope=...&state=...`

### 4. User authorizes in GoHighLevel

- User signs in to GHL (if needed), picks the **location** (sub-account) where the app is installed, and approves.
- GHL then redirects the browser to your **OAuth Redirect URI** with a one-time `code` and the same `state`:
  - Example: `https://your-app.vercel.app/api/auth/ap/callback?code=...&state=...`

### 5. Your callback runs on Vercel

- **Route:** `GET /api/auth/ap/callback`
- Your app:
  1. Reads `code` and `state` from the query.
  2. Calls GHL: **exchange `code` for tokens** (`POST .../oauth/token`) with:
     - `client_id`, `client_secret`, `grant_type=authorization_code`, `code`, `redirect_uri`, `user_type=Location` (or Company).
  3. If the token is **Company**-level, it fetches installed locations and then gets a **location-level token** for the first (or chosen) location.
  4. It then **creates a session** with:
     - `locationId`
     - `accessToken` (location-scoped, used for Voice AI and other GHL APIs)
     - `refreshToken`
  5. It **sends a redirect** to `/custom-page` and sets a **cookie** (e.g. `ghl_session`) so the next requests are “logged in.”

### 6. After redirect: Custom Page is “connected”

- The browser now has the `ghl_session` cookie for your Vercel domain.
- When the Custom Page loads and calls `/api/agents/attachments` (and other APIs), the browser sends that cookie.
- Your API reads the cookie, restores the session, and uses `accessToken` + `locationId` to call GHL’s APIs (e.g. list agents, patch agent for MCP). The user sees the MCP list and attachments instead of “Connect your account.”

---

## What must match (configuration)

| What | Where | Must match |
|------|--------|------------|
| **Redirect URI** | GHL Marketplace app settings | Exact URL of your callback, e.g. `https://your-app.vercel.app/api/auth/ap/callback` |
| **GHL_OAUTH_REDIRECT_URI** | Vercel env vars | Same as above |
| **Installation URL** (optional) | GHL Marketplace | Often `https://your-app.vercel.app/api/auth/ap/authorize` |
| **Custom Page URL** | GHL Marketplace | `https://your-app.vercel.app/custom-page` |

If the redirect URI in GHL and in Vercel don’t match exactly (including `https` and path), GHL will not send the `code` to your callback and the flow will break.

---

## Why “Connect your account” can keep showing (token/session issues)

1. **Session not found after redirect**  
   The app was using an **in-memory** session store. On Vercel, each request can run on a **different serverless instance**, so the instance that handled the callback (and stored the session) is not the same one that later handles `/api/agents/attachments`. That second request has no session → 401 → “Connect your account” again.  
   **Fix:** Use a session that works across instances (e.g. **cookie-based session** or a shared store like Redis). The codebase is being updated to use a cookie-based session so it works on Vercel.

2. **Cookie not sent (e.g. iframe / SameSite)**  
   If the Custom Page runs in an iframe and your cookie is `SameSite=Strict`, the browser might not send it in some navigations. Using `SameSite=Lax` and `Secure` in production helps. Cookie-based session still uses a single cookie under your domain so same-origin API calls from your Custom Page will send it.

3. **Wrong or missing env on Vercel**  
   If `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, or `GHL_OAUTH_REDIRECT_URI` are wrong or missing, the token exchange in the callback can fail and the user never gets a session cookie.

4. **Redirect URI mismatch**  
   If GHL has a different redirect URI than `GHL_OAUTH_REDIRECT_URI`, the token exchange will fail (e.g. “invalid redirect_uri” or “invalid grant”).

---

## Summary

- **GHL** sends the user to your **authorize** URL; your app redirects to GHL’s **chooselocation**.
- After the user approves, **GHL** redirects to your **callback** with a `code`.
- Your app exchanges **code for tokens**, gets a **location-scoped token**, and then creates a **session** and sets a **cookie**.
- All later API calls from the Custom Page send that cookie; your app uses the stored **access token** and **locationId** to call GHL (Voice AI, etc.).

For the “login tokens” to work reliably on Vercel, the session must not depend on in-memory storage on a single instance. This app uses a **signed cookie-based session**: the OAuth callback encodes the session (locationId, accessToken, refreshToken) into a signed cookie; every API request decodes and verifies it. No server-side session store is required, so it works across Vercel’s serverless instances.
