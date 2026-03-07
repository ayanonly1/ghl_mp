# GoHighLevel Voice AI API — cURL reference

Use these curls to call the **GoHighLevel (Lead Connector) Voice AI API** directly so you can see the exact request/response (e.g. when Vercel doesn’t show the external call).

**You do not need** `GHL_CLIENT_ID` or `GHL_CLIENT_SECRET` for these calls. Those are only for OAuth token exchange. For Voice AI you need:

- **`BEARER_TOKEN`** — location-scoped access token (the one stored in your app session after “Connect your account”).
- **`LOCATION_ID`** — location/sub-account ID (also in the session).
- **`AGENT_ID`** — Voice AI agent ID (e.g. `69a5d303502ed8680ed464a2`).

---

## How to get `BEARER_TOKEN` and `LOCATION_ID`

1. **Option A — Debug endpoint (recommended)**  
   Set in Vercel (or `.env.local`):  
   `DEBUG_GHL_CURL=1`  
   Then, in the **same browser** where you’re logged into the app (so the `ghl_session` cookie is sent), open:
   ```text
   https://ap-mp.vercel.app/api/debug/ghl-curl?agentId=69a5d303502ed8680ed464a2
   ```
   The JSON response will include `bearerToken`, `locationId`, and ready-made `getAgentCurl` and `patchAgentCurl` you can copy and run in your terminal.  
   **Remove `DEBUG_GHL_CURL` (or set to 0) when you’re done** so the token isn’t exposed.

2. **Option B — Local run**  
   Run the app locally, set `DEBUG_GHL_CURL=1`, log in via the app, then open  
   `http://localhost:3000/api/debug/ghl-curl?agentId=YOUR_AGENT_ID`  
   and use the returned curls.

---

## Base URL and headers

All Voice AI requests use:

- **Base URL:** `https://services.leadconnectorhq.com`
- **Required header:** `Version: 2021-07-28`
- **Auth:** `Authorization: Bearer <BEARER_TOKEN>`

---

## 1. GET Agent (current config)

```bash
curl -s -X GET \
  "https://services.leadconnectorhq.com/voice-ai/agents/AGENT_ID?locationId=LOCATION_ID" \
  -H "Authorization: Bearer BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Version: 2021-07-28"
```

Replace `AGENT_ID`, `LOCATION_ID`, and `BEARER_TOKEN`.  
Response is the full agent object (including `mcpServers` / `mcp_servers` if present).

---

## 2. PATCH Agent (attach MCP)

Your app sends a **full agent body** with only certain fields stripped (`id`, `locationId`, `actions`, `traceId`, `mcpServers`/`mcp_servers`) and then adds the merged `mcpServers` at the top level.

**Minimal PATCH (only MCP — try this first):**

```bash
curl -s -X PATCH \
  "https://services.leadconnectorhq.com/voice-ai/agents/AGENT_ID?locationId=LOCATION_ID" \
  -H "Authorization: Bearer BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Version: 2021-07-28" \
  -d '{
    "mcpServers": {
      "exa": {
        "url": "https://registry.smithery.ai/servers/exa"
      }
    }
  }'
```

**With optional headers for the MCP (e.g. auth):**

```bash
curl -s -X PATCH \
  "https://services.leadconnectorhq.com/voice-ai/agents/AGENT_ID?locationId=LOCATION_ID" \
  -H "Authorization: Bearer BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Version: 2021-07-28" \
  -d '{
    "mcpServers": {
      "exa": {
        "url": "https://registry.smithery.ai/servers/exa",
        "headers": {
          "X-API-Key": "optional-header-value"
        }
      }
    }
  }'
```

If the minimal PATCH returns 422, the API may require a full agent body. Then:

1. Run **GET Agent** (above), save the JSON.
2. Remove from that JSON: `id`, `locationId`, `actions`, `traceId`, `mcpServers`, `mcp_servers`.
3. Add top-level `"mcpServers": { "exa": { "url": "https://registry.smithery.ai/servers/exa" } }`.
4. PATCH with that full body:

```bash
curl -s -X PATCH \
  "https://services.leadconnectorhq.com/voice-ai/agents/AGENT_ID?locationId=LOCATION_ID" \
  -H "Authorization: Bearer BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Version: 2021-07-28" \
  -d @agent-with-mcp.json
```

---

## 3. List agents (optional)

```bash
curl -s -X GET \
  "https://services.leadconnectorhq.com/voice-ai/agents?locationId=LOCATION_ID" \
  -H "Authorization: Bearer BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Version: 2021-07-28"
```

---

## Summary of what you need

| Variable       | Where it comes from                    | Needed for Voice AI cURL? |
|----------------|----------------------------------------|----------------------------|
| `BEARER_TOKEN` | Session (location token)               | **Yes**                    |
| `LOCATION_ID`  | Session                                | **Yes**                    |
| `AGENT_ID`     | From list agents or your app           | **Yes**                    |
| `GHL_CLIENT_ID` / `GHL_CLIENT_SECRET` | Env (OAuth only) | **No** for these curls     |
