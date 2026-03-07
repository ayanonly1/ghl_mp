import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

/**
 * GET /api/debug/ghl-curl?agentId=...
 *
 * Returns bearerToken, locationId, and ready-to-run curl commands for calling
 * the GoHighLevel Voice AI API directly (GET agent, PATCH agent with MCP).
 * Only works when DEBUG_GHL_CURL=1 (or "true") so the token is never exposed in production.
 *
 * Call this in the same browser where you're logged in (cookie ghl_session sent).
 */
export async function GET(request: NextRequest) {
  if (process.env.DEBUG_GHL_CURL !== "1" && process.env.DEBUG_GHL_CURL !== "true") {
    return NextResponse.json(
      { error: "Set DEBUG_GHL_CURL=1 in env to enable this endpoint. Remove it when done debugging." },
      { status: 403 }
    );
  }

  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized. Open this URL in the same browser where you're logged into the app (so ghl_session cookie is sent)." },
      { status: 401 }
    );
  }

  const agentId = request.nextUrl.searchParams.get("agentId") ?? "AGENT_ID";
  const { accessToken, locationId } = auth;

  const getAgentCurl = String.raw`curl -s -X GET \
  "${GHL_BASE}/voice-ai/agents/${agentId}?locationId=${encodeURIComponent(locationId)}" \
  -H "Authorization: Bearer ${accessToken}" \
  -H "Content-Type: application/json" \
  -H "Version: ${GHL_VERSION}"`;

  const patchBody = JSON.stringify({
    mcpServers: { exa: { url: "https://registry.smithery.ai/servers/exa" } },
  });
  const patchAgentCurl = String.raw`curl -s -X PATCH \
  "${GHL_BASE}/voice-ai/agents/${agentId}?locationId=${encodeURIComponent(locationId)}" \
  -H "Authorization: Bearer ${accessToken}" \
  -H "Content-Type: application/json" \
  -H "Version: ${GHL_VERSION}" \
  -d '${patchBody}'`;

  return NextResponse.json({
    bearerToken: accessToken,
    locationId,
    agentId,
    getAgentCurl,
    patchAgentCurl,
    hint: "Run getAgentCurl or patchAgentCurl in your terminal to see the raw GHL response. Set DEBUG_GHL_CURL=0 and redeploy when done.",
  });
}
