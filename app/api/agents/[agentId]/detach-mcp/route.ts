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
    const current = (existing as Record<string, unknown>).mcpServers as Record<string, { url: string; headers?: Record<string, string> }> | undefined;
    const mcpServers: Record<string, { url: string; headers?: Record<string, string> }> =
      typeof current === "object" && current ? { ...current } : {};
    const keys = Object.keys(mcpServers);
    for (const k of keys) delete mcpServers[k];

    await patchAgent(auth.accessToken, auth.locationId, agentId, { mcpServers });
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
