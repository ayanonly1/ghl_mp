# Wireframes / UI Specs — MCP Registry Custom Page

## 1. MCP list + search/filter

- **Layout:** Single Custom Page; top section = “Current attachments”, below = “Browse MCPs”.
- **Browse MCPs:**
  - Search input: free-text search (sent to backend as `q`; backend uses Smithery semantic search).
  - Optional filter: e.g. “Verified only” (Smithery `is:verified`).
  - List/cards of MCPs: each row shows **Name**, **Description** (truncated), **Tags** (if available).
  - Pagination: “Previous” / “Next” or page numbers; `page` and `pageSize` query params.
- **Empty state:** “No MCPs found” when list is empty.
- **Errors:** Inline message if “Failed to load MCPs” (e.g. Smithery down).

## 2. MCP detail → “Choose agent”

- **Trigger:** Click on an MCP row/card.
- **Flow:** No separate “detail” page required; clicking opens the “Choose Voice AI Agent” step.
- **Context:** Selected MCP (name, id/qualifiedName) is kept in state; next screen is agent list.

## 3. Agent list (sub-account only)

- **Screen:** “Choose a Voice AI Agent” with list of agents for the current location.
- **Data:** From backend `GET /api/agents` (location-scoped).
- **Display:** Agent name and id; single select (click or “Attach” button).
- **Empty state:** “No agents in this location” with short guidance to create one in HighLevel.

## 4. Attach confirmation + current attachments

- **After attach:** Toast or inline message: “MCP [name] attached to [agent name].”
- **Current attachments (on load):**
  - Section at top: “Current MCP attachments.”
  - Table/list: one row per agent; columns: **Agent name**, **Attached MCP** (name or “None”), **Actions** (Change | Detach).
  - **Change:** Same flow as attach (choose MCP → choose agent); backend overwrites MCP for that agent.
  - **Detach:** Button calls detach API; row updates to “None” and actions clear.

## 5. Auth and errors

- **Not logged in:** Custom Page shows “Connect to HighLevel” with link to `/api/auth/ghl/authorize`.
- **Auth failure:** Show `?error=...` message (e.g. “Authentication failed”).
- **API errors:** Per-call messages (e.g. “Failed to load agents”, “Failed to attach MCP”) with optional retry.

## 6. Navigation

- Single-page flow: no separate routes required. States: `list-mcps` | `choose-agent` | (optional) `success`.
- “Back” from “Choose agent” returns to MCP list with search preserved.
