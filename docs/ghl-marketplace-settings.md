# GoHighLevel Marketplace App Settings (Vercel-hosted)

Use this checklist when creating and configuring your GoHighLevel marketplace app so it works with this app after hosting on Vercel.

---

## 1. App profile (Marketplace dashboard)


| Setting                                             | Value / guidance                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **App Name**                                        | e.g. "MCP Registry" or your chosen name                                                                            |
| **App Type**                                        | **Public** (if listing in marketplace) or **Private** (internal only)                                              |
| **Listing Type**                                    | White-label recommended for agencies                                                                               |
| **Distribution Type**                               | **Sub Account** (location-level) — this app is installed per location and uses location-scoped tokens for Voice AI |
| **App Description, Logo, Category, Preview images** | Fill as required for listing                                                                                       |


---

## 2. Advanced Settings → Auth

### 2.1 Redirect URL (Callback URL)

Add **exactly** the URL where your app receives the OAuth callback after the user authorizes. This must match `GHL_OAUTH_REDIRECT_URI` in Vercel.


| Environment             | Redirect URL                                           |
| ----------------------- | ------------------------------------------------------ |
| **Production (Vercel)** | `https://<your-vercel-domain>/api/auth/ap/callback`    |
| Example                 | `https://mcp-registry.vercel.app/api/auth/ap/callback` |


- Click **Add** after entering the URL.
- Use **HTTPS** in production. No trailing slash.
- If you use a custom domain on Vercel, use that domain instead of `*.vercel.app`.

### 2.2 Scopes

Request the minimum scopes your app needs:


| Scope                  | Purpose                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **locations.readonly** | Required: list locations, get location token, and for Voice AI agents in the location |


If your app needs more (e.g. company-level install flow), add only what’s required. Check [HighLevel Scopes](https://marketplace.gohighlevel.com/docs/Authorization/Scopes) for Voice AI–related scopes if the API changes.

### 2.3 Client keys (Client ID & Client Secret)

- Create a client key pair (name it e.g. "Production").
- **Copy and store the Client Secret immediately** — it’s shown only once.
- Set in Vercel:
  - `GHL_CLIENT_ID` = Client ID from Marketplace
  - `GHL_CLIENT_SECRET` = Client Secret

### 2.4 Installation URL

- In **Advanced Settings → Auth**, find **Install Link** and click **Show**.
- **Installation URL** is what you give to users (or set in the marketplace listing) to install the app.
- For this app, set it to your **authorize** endpoint (where users start OAuth), not the callback:


| Setting              | URL                                                  |
| -------------------- | ---------------------------------------------------- |
| **Installation URL** | `https://<your-vercel-domain>/api/auth/ap/authorize` |


Example: `https://mcp-registry.vercel.app/api/auth/ap/authorize`

Users who open this URL will go through HighLevel location picker, then be redirected to your Redirect URL with a `code`, then your app redirects them to the Custom Page.

---

## 3. Custom Page URL

Your app exposes a Custom Page that loads inside HighLevel after install.


| Setting             | URL                                        |
| ------------------- | ------------------------------------------ |
| **Custom Page URL** | `https://<your-vercel-domain>/custom-page` |


Example: `https://mcp-registry.vercel.app/custom-page`

Configure this in the marketplace app’s **Custom Page** / **App module** section (exact label may be "Custom Page URL" or similar). This is the URL that is loaded in the iframe in the app details page after installation.

---

## 4. Webhooks (optional)

If you want to react to install/uninstall events:


| Setting         | Value                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| **Webhook URL** | `https://<your-vercel-domain>/api/webhooks/ghl` (only if you add this route) |
| **Events**      | Subscribe to **App Install** (and optionally **App Uninstall**)              |


This app does not implement webhooks by default; add a route and logic if needed.

---

## 5. Vercel environment variables

Set these in the Vercel project (**Settings → Environment Variables**):


| Variable                 | Description                                      | Example                                             |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------- |
| `SMITHERY_API_KEY`       | Smithery API key (server-only)                   | From Smithery account                               |
| `GHL_CLIENT_ID`          | HighLevel OAuth Client ID                        | From Marketplace Auth → Client Keys                 |
| `GHL_CLIENT_SECRET`      | HighLevel OAuth Client Secret                    | From Marketplace (save at creation)                 |
| `GHL_OAUTH_REDIRECT_URI` | OAuth callback URL                               | `https://<your-vercel-domain>/api/auth/ap/callback` |
| `GHL_SCOPES`             | Optional; default in app is `locations.readonly` | `locations.readonly`                                |
| `NEXT_PUBLIC_APP_URL`    | Public app URL for redirects                     | `https://<your-vercel-domain>`                      |


Use the **same** domain in `GHL_OAUTH_REDIRECT_URI` and `NEXT_PUBLIC_APP_URL` (your Vercel domain or custom domain).

---

## 6. Summary checklist

- App created in [Marketplace](https://marketplace.gohighlevel.com) with correct App Type and Distribution Type.
- **Redirect URL** added in Auth: `https://<domain>/api/auth/ap/callback`.
- **Scopes** include at least `locations.readonly`.
- **Client ID** and **Client Secret** created and stored; both set in Vercel.
- **Installation URL** set to `https://<domain>/api/auth/ap/authorize`.
- **Custom Page URL** set to `https://<domain>/custom-page`.
- All env vars set in Vercel; redeploy after changing env.
- Test: open Installation URL → choose location → land on Custom Page and use MCP Registry.

---

## 7. References

- [OAuth 2.0 | HighLevel API](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0)
- [HighLevel Scopes](https://marketplace.gohighlevel.com/docs/Authorization/Scopes)
- [Developer Marketplace help](https://help.gohighlevel.com/support/solutions/articles/155000000136-how-to-get-started-with-the-developer-s-marketplace)

