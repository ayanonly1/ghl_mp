import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { patchAgent, getAgent, GhlApiError } from "@/lib/ghl";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = await params;
  if (!agentId) {
    return NextResponse.json({ error: "Missing agent id" }, { status: 400 });
  }

  try {
    const existing = await getAgent(auth.accessToken, auth.locationId, agentId);
    const raw = existing as Record<string, unknown>;
    // GHL PATCH rejects id, locationId, actions, traceId, mcpServers. Strip those and clear MCP via integrations.
    const forbidden = ["id", "locationId", "actions", "traceId", "mcpServers", "mcp_servers"];
    const allowed = { ...raw };
    for (const k of forbidden) delete allowed[k];
    const body = { ...allowed, integrations: { mcpServers: {} } };
    await patchAgent(auth.accessToken, auth.locationId, agentId, body);
    return NextResponse.json({
      success: true,
      agentId,
      message: "MCP detached successfully",
    });
  } catch (err) {
    if (err instanceof GhlApiError) {
      const status = err.status === 404 ? 404 : err.status === 401 || err.status === 403 ? err.status : 502;
      return NextResponse.json(
        { error: err.message || "API error" },
        { status }
      );
    }
    return NextResponse.json(
      { error: "Failed to detach MCP" },
      { status: 502 }
    );
  }
}
