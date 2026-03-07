# Attach MCP — How It Works & API Reference

## How attach MCP works (high level)

1. **User** selects an MCP from the Smithery list and chooses a Voice AI agent.
2. **Frontend** calls your app: `POST /api/agents/{agentId}/attach-mcp` with `{ url, mcpKey, mcpName }`.
3. **Your app** (with session from cookie or `X-GHL-Session` header):
   - Fetches the existing agent from GoHighLevel: `GET` Voice AI agent.
   - Merges the new MCP into `mcpServers` (or existing equivalent).
   - Sends a **PATCH** to GoHighLevel Voice AI with the full agent body and **top-level** `mcpServers` (per [GHL MCP docs](https://marketplace.gohighlevel.com/docs/other/mcp)).
4. **GHL** persists the agent config. If the Voice AI API rejects the PATCH (e.g. wrong schema), the attach fails with **422**; the response includes a `details` field with GHL’s response body for debugging.

**Important:** Your app does **not** store MCP–agent mappings in a database. The mapping lives only in the HighLevel agent configuration (Patch Agent). Attach = PATCH agent with updated `mcpServers`; detach = PATCH with empty `mcpServers`.

---

## High-level API endpoints

### Your app (Next.js API routes)

| Method | Path | Auth | Purpose |
|--------|------|------|--------|
| `GET` | `/api/agents/attachments` | Cookie or `X-GHL-Session` | List agents and their current MCP attachment (key/name) for the location. |
| `GET` | `/api/agents` | Cookie or `X-GHL-Session` | List Voice AI agents for the location (used when choosing an agent to attach to). |
| `POST` | `/api/agents/{agentId}/attach-mcp` | Cookie or `X-GHL-Session` | Attach an MCP to an agent. Body: `{ url: string, mcpKey?: string, mcpName?: string, headers?: Record<string, string> }`. |
| `POST` | `/api/agents/{agentId}/detach-mcp` | Cookie or `X-GHL-Session` | Detach MCP from the agent (clears MCP config for that agent). |
| `GET` | `/api/mcp-servers?q=...&page=...&pageSize=...` | None (or same auth if you add it) | List MCP servers from Smithery (search/pagination). |

**Attach request body (POST attach-mcp):**

- **`url`** (required): MCP server URL (e.g. Smithery deployment URL or `https://registry.smithery.ai/servers/{qualifiedName}`).
- **`mcpKey`** (optional): Key used in `mcpServers` (e.g. `my_mcp`). Defaults from `mcpName` or `"smithery-mcp"`.
- **`mcpName`** (optional): Display name for the MCP.
- **`headers`** (optional): Optional headers for the MCP connection.

**Auth:** Session is resolved by `getAuthContext()`: first from the `ghl_session` cookie, then from the `x-ghl-session` header (used when the app runs in an iframe and cookies are not sent).

**Example — List attachments (GET /api/agents/attachments):**

```bash
curl 'https://ap-mp.vercel.app/api/agents/attachments' \
  -H 'accept: */*' \
  -b 'ghl_session=<session-value>' \
  -H 'referer: https://ap-mp.vercel.app/custom-page'
```

When running in an iframe (where cookies may be blocked), send the session via header: `-H 'x-ghl-session: <session-token>'`.

---

### GoHighLevel (Lead Connector) — Voice AI

Base URL: **`https://services.leadconnectorhq.com`**  
Required header: **`Version: 2021-07-28`**

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/voice-ai/agents?locationId={locationId}` | List Voice AI agents for the location. |
| `GET` | `/voice-ai/agents/{agentId}?locationId={locationId}` | Get a single agent (used to read current `mcpServers` before attach). |
| `PATCH` | `/voice-ai/agents/{agentId}?locationId={locationId}` | Update agent. Your app sends the full agent body with **top-level** `mcpServers: { [key]: { url, headers? } }` per GHL’s MCP docs. |

**Note:** The app sends `mcpServers` at the top level of the PATCH body (not under `integrations`). If GHL returns 422, the API response includes a `details` field with GHL’s response body for debugging.

---

## Why “attach MCP” might not be working

1. **401 Unauthorized**  
   - Session missing or invalid.  
   - **If in iframe:** Cookie may be blocked; ensure the connector flow runs and the Custom Page sends the session token in the `X-GHL-Session` header.  
   - Check: Open `/api/debug/session` in the same browser; expect `sessionValid: true`.

2. **404**  
   - Wrong `agentId` or agent not in the current location.  
   - Verify with `GET /api/agents` (or `/api/agents/attachments`) that the agent exists for the logged-in location.

3. **422 or PATCH rejected**  
   - GHL Voice AI may not accept MCP updates via this PATCH endpoint or may expect a different payload shape.  
   - The app returns a message like: *“Voice AI PATCH rejected the request. The GoHighLevel API may not support updating MCP via this endpoint—try configuring MCP in the Voice AI agent settings in your GHL dashboard.”*  
   - **Action:** Confirm in GHL/Voice AI docs whether MCP can be updated via PATCH and what body format is required; then align the attach-mcp route (e.g. `integrations.mcpServers` or another field).

4. **502 / “Failed to attach MCP”**  
   - Network or server error calling GHL, or an unhandled exception.  
   - Check server logs for the actual GHL response (status and body).

5. **Silent failure / no error**  
   - Frontend may be catching and not surfacing the error.  
   - In DevTools → Network, inspect the `POST .../attach-mcp` response status and body to see the exact error returned by your API.

---

## Quick debug checklist

- [ ] Same browser: `/api/debug/session` shows `sessionValid: true`.
- [ ] `GET /api/agents/attachments` returns 200 and lists agents (and current MCP if any).
- [ ] In Network tab: `POST /api/agents/{id}/attach-mcp` has body `{ url, mcpKey?, mcpName? }` and returns 200 on success.
- [ ] If 422: GHL likely rejecting PATCH; verify Voice AI API contract for MCP and adjust attach-mcp route if needed.
- [ ] If 401: Fix session (cookie or `X-GHL-Session` in iframe flow).
