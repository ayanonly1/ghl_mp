# Demo Script (2–5 minutes)

## 1. Install (≈30 s)

- In HighLevel Marketplace (sandbox), install the MCP Registry app into a sub-account.
- Or open the **Installation URL** (e.g. `https://your-app.vercel.app/api/auth/ghl/authorize`) and complete OAuth.

## 2. Open Custom Page (≈15 s)

- From the app’s details in the Marketplace, open the **Custom Page**.
- If not logged in, click “Connect to HighLevel” and complete the flow; you’ll return to the Custom Page.

## 3. Browse MCPs (≈45 s)

- In “Browse MCPs”, use the search box (e.g. “memory” or “files”) and click Search.
- Scroll the list; show **name**, **description**, and **Verified** badge where present.
- Click **“Attach to agent”** on one MCP.

## 4. Choose agent and attach (≈30 s)

- On “Choose Voice AI Agent”, select an agent from the list.
- Click **Attach**; confirm the success message.
- Optional: attach a second MCP to another agent.

## 5. Current attachments (≈30 s)

- Point to **“Current MCP attachments”** at the top.
- Show which MCP is attached to each agent.
- Click **Change** on one row: pick a different MCP and confirm the update.
- Click **Detach** on one row and confirm it shows “None”.

## 6. Tests (≈30 s)

- In the repo run: `npm test`.
- Briefly show that unit tests (Smithery, GHL, errors) and integration tests (health, mcp-servers) pass.

## Notes

- If Smithery or HighLevel is slow, keep the demo to the happy path and mention error handling (503, 401) from the README.
- For “no agents” case: mention that the user can create a Voice AI agent in HighLevel first, then return to the app.
