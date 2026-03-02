import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { patchAgent, getAgent, GhlApiError } from "@/lib/ghl";

export async function POST(
  request: NextRequest,
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

  let body: { mcpKey?: string; mcpName?: string; url: string; headers?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, headers, mcpKey, mcpName } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing or invalid MCP url" }, { status: 400 });
  }

  const key = (mcpKey ?? mcpName ?? "smithery-mcp").replace(/\W/g, "_") || "mcp";

  try {
    const existing = await getAgent(auth.accessToken, auth.locationId, agentId);
    const raw = existing as Record<string, unknown>;
    const current = (raw.mcpServers ?? raw.mcp_servers) as Record<string, { url: string; headers?: Record<string, string> }> | undefined;
    const mcpServers = typeof current === "object" && current ? { ...current } : {};
    mcpServers[key] = { url, ...(headers && typeof headers === "object" ? { headers } : {}) };

    await patchAgent(auth.accessToken, auth.locationId, agentId, { mcpServers });
    return NextResponse.json({
      success: true,
      agentId,
      mcpKey: key,
      message: "MCP attached successfully",
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
      { error: "Failed to attach MCP" },
      { status: 502 }
    );
  }
}
