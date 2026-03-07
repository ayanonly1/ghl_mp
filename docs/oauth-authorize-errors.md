# HighLevel OAuth Authorize Errors — Troubleshooting

When the install flow redirects to `https://backend.leadconnectorhq.com/oauth/authorize`, HighLevel may return an error. This doc explains common causes and what to check, based on [HighLevel's OAuth docs](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0) and [External Authentication](https://marketplace.gohighlevel.com/docs/oauth/ExternalAuthentication/index.html).

---

## Flow: Who calls `backend.leadconnectorhq.com/oauth/authorize`?

1. User opens your **Installation URL** (e.g. `https://ap-mp.vercel.app/api/auth/ap/authorize`).
2. Your app redirects to **`marketplace.gohighlevel.com/oauth/chooselocation`** with `client_id`, `redirect_uri`, `scope`, `state` (your app does **not** call `backend.leadconnectorhq.com/oauth/authorize`).
3. User selects a location on the chooselocation page.
4. **HighLevel’s frontend/backend** then calls **`backend.leadconnectorhq.com/oauth/authorize`** with query params including `response_type`, `client_id`, `location_id`, `redirect_uri`, `scope`, `userType`, `version_id`, `state`.

So the request that fails (with `response_type=undefined` or similar) is built by **HighLevel**, not by your app.

---

## Error: `response_type=undefined`

### What HighLevel expects

From [External Authentication](https://marketplace.gohighlevel.com/docs/oauth/ExternalAuthentication/index.html):

| Parameter      | System value | Description |
|----------------|-------------|-------------|
| **response_type** | **`code`** | HighLevel **exclusively supports the `code` response type** (Authorization Code flow). |

If the authorize URL has `response_type=undefined`, the server will reject the request or show an error.

### Why it can happen

- The Marketplace app’s OAuth / Auth configuration may have a field for “response type” or “authorization URL” that is empty or uses a placeholder that resolves to `undefined`.
- HighLevel may be reading a value from app config that isn’t set, so it sends `undefined` in the query string.

### What to do

1. **In Developer Marketplace → Your app → Advanced Settings → Auth**
   - Look for any **Authorization URL** or **Custom authorize URL** (or similar) that might allow overriding query params.
   - If there is a field for **response type**, set it explicitly to **`code`**.
   - If the authorize URL is built from a template (e.g. `{{response_type}}`), ensure the variable is set to `code` or replace it with the literal `code`.

2. **Use standard Installation URL**
   - Installation URL should be your app’s authorize endpoint, e.g. `https://<your-domain>/api/auth/ap/authorize`.
   - Avoid custom authorize URLs that might omit or mis-set `response_type` unless the docs say how to set it to `code`.

3. **Contact HighLevel support**
   - If your app uses only the standard Installation URL and you don’t have a custom authorize URL or response_type field, the bug may be on HighLevel’s side (e.g. they send `response_type=undefined` when a config is missing). In that case, report the issue and mention that [their docs](https://marketplace.gohighlevel.com/docs/oauth/ExternalAuthentication/index.html) require `response_type=code`.

---

## Other common OAuth/authorize issues (from HighLevel docs)

| Issue | Cause | Action |
|-------|--------|--------|
| **Invalid JWT / 401** | Expired or invalid Bearer token used in the request. | The Bearer token in the authorize request is from the **marketplace session** (user logged into marketplace.gohighlevel.com). User should log in again or retry from a fresh session. |
| **Redirect URI mismatch** | `redirect_uri` in the request does not exactly match a Redirect URL configured in the app. | In Auth → Redirect URL, add exactly `https://<your-domain>/api/auth/ap/callback` (no trailing slash, correct domain). |
| **Wrong scope** | Requested scope not allowed or not selected for the app. | In Auth → Scopes, ensure at least `locations.readonly` (and any other scopes you need) is selected. |
| **State mismatch** | `state` is used for CSRF protection; if it’s modified or missing, callback validation can fail. | Don’t modify or drop the `state` parameter; your app should store it (e.g. in session) and verify it in the callback. |

---

## Quick checklist

- [ ] Installation URL in Marketplace = `https://<domain>/api/auth/ap/authorize`.
- [ ] Redirect URL in Marketplace = `https://<domain>/api/auth/ap/callback` (exact match).
- [ ] Scopes include `locations.readonly`.
- [ ] If the app has a custom “Authorization URL” or “response type” setting, it is set to use **`code`** (not empty and not `undefined`).
- [ ] User is logged into HighLevel and, if needed, retried in a fresh browser session.

---

## References

- [OAuth 2.0 \| HighLevel API](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0)
- [External Authentication \| HighLevel API](https://marketplace.gohighlevel.com/docs/oauth/ExternalAuthentication/index.html) — see table for `response_type`: **`code`**.
- [Get Access Token](https://marketplace.gohighlevel.com/docs/ghl/oauth/get-access-token) — used after you receive the `code` at your callback.
