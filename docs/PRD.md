# Product Requirements Document: MCP Registry Marketplace App

## Problem

Voice AI agents in HighLevel sub-accounts need to use external MCP (Model Context Protocol) servers to extend their capabilities. There is no in-product way to discover MCPs from a registry and attach them to agents. Users must configure MCPs manually or use external tools.

## Users

- **Sub-account admins** who manage Voice AI agents and want to attach MCP servers from the Smithery registry.
- **Agency admins** who install the app for sub-accounts (bulk or single).

## Goals

1. Let users **browse** MCP servers from the Smithery registry inside HighLevel (search, filter, view name/description/tags).
2. Let users **select** an MCP and **choose** a Voice AI agent in the same sub-account.
3. **Attach** the selected MCP to the chosen agent and **persist** via HighLevel agent configuration.
4. **Show** which MCP (if any) is attached to each agent and support **change** or **detach**.

## Scope

### In scope

- HighLevel Marketplace app that installs into a sub-account and exposes a Custom Page.
- List MCPs from Smithery (search, pagination, display name, description, tags).
- Select MCP → choose Voice AI agent (scoped to current location) → attach MCP to agent.
- Display current MCP attachments per agent; change or detach.
- Secure handling of secrets (Smithery API key and GHL tokens only on backend).
- Error handling for Smithery down, invalid agent, auth failure.

### Out of scope

- Bulk attach (one MCP to many agents in one action).
- Editing MCP connection details (e.g. headers) beyond attach/detach.
- Caching or syncing MCP catalog offline.
- Custom MCP server registration (only Smithery registry).

## Success Criteria

- User can install the app in a sandbox sub-account and open the Custom Page.
- User can search and browse MCPs, select one, select an agent, and see confirmation after attach.
- User can see current attachments and detach or change MCP.
- No secrets in frontend; errors (Smithery down, 401, etc.) show clear messages.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Smithery registry downtime | Backend returns 503; UI shows "Registry temporarily unavailable" and retry. |
| HighLevel auth failure / token expiry | Return 401; prompt re-auth (redirect to authorize). |
| Voice AI agent schema change | Use Patch Agent with minimal payload (mcpServers); document schema dependency. |
| Custom Page context (locationId) | Use cookie-based session after OAuth; document HighLevel Custom Page URL params if needed. |

## Non-functional

- **Security:** All secrets in backend env; frontend only receives session cookie.
- **Reliability:** Idempotent attach/detach (patch overwrites); timeouts on external calls (Smithery, GHL).
- **AI-first SDLC:** PRD, wireframes, code scaffolding, and tests generated/assisted with AI; documented in README.
