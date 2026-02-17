# Governance & Reliability

## Secrets

- **Smithery API key:** Set in backend env (`SMITHERY_API_KEY`). Never sent to the frontend or logged.
- **GHL client secret:** Set in backend env (`GHL_CLIENT_SECRET`). Only used in OAuth token exchange on the server.
- **Access tokens:** Stored in server-side session (in-memory by default); session id is sent to the client in an httpOnly cookie. The Custom Page does not receive raw tokens.

## Error handling

| Scenario | Backend behavior | Frontend |
|----------|------------------|----------|
| Smithery down / timeout | Returns 503 with `{ error: "…" }` | Shows "Failed to load MCPs" or similar |
| GHL 401/403 | Returns 401/403 with `{ error: "Unauthorized" }` etc. | Prompts to re-connect (link to authorize) |
| Agent not found (404) | Returns 404 | Shows error message |
| Patch agent failure | Returns 502 with message | Shows "Failed to attach/detach MCP" |
| Invalid agent id | 400 or 404 | Validation / error message |

All API errors use a consistent shape: `{ error: string }`.

## Idempotency

- **Attach:** PATCH agent with `mcpServers`; overwriting a key is idempotent. Safe to retry.
- **Detach:** PATCH agent with empty or cleared `mcpServers` for that key. Safe to retry.
