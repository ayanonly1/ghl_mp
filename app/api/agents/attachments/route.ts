import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { listAgents, getAgent, GhlApiError } from "@/lib/ghl";

export interface AgentAttachment {
  agentId: string;
  agentName?: string;
  mcpKey: string | null;
  mcpName: string | null;
}

function getMcpFromAgent(agent: Record<string, unknown>): { key: string; name?: string } | null {
  const mcpServers = agent.mcpServers as Record<string, { url?: string; [k: string]: unknown }> | undefined;
  if (!mcpServers || typeof mcpServers !== "object") return null;
  const keys = Object.keys(mcpServers);
  if (keys.length === 0) return null;
  const key = keys[0];
  const entry = mcpServers[key];
  const name = typeof entry === "object" && entry && "displayName" in entry
    ? String((entry as { displayName?: string }).displayName)
    : key;
  return { key, name };
}

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agents = await listAgents(auth.accessToken, auth.locationId);
    const attachments: AgentAttachment[] = [];

    for (const agent of agents) {
      const full = await getAgent(auth.accessToken, auth.locationId, agent.id);
      const mcp = getMcpFromAgent(full as Record<string, unknown>);
      attachments.push({
        agentId: agent.id,
        agentName: (agent as { name?: string }).name ?? (full as { name?: string }).name,
        mcpKey: mcp?.key ?? null,
        mcpName: mcp?.name ?? null,
      });
    }

    return NextResponse.json({ attachments });
  } catch (err) {
    if (err instanceof GhlApiError) {
      const status = err.status === 401 || err.status === 403 ? err.status : 502;
      return NextResponse.json(
        { error: err.message || "HighLevel API error" },
        { status }
      );
    }
    return NextResponse.json(
      { error: "Failed to load attachments" },
      { status: 502 }
    );
  }
}
