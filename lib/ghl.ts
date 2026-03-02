/**
 * HighLevel API client for OAuth and Voice AI.
 * All tokens and secrets stay server-side.
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";
/** GHL API version header — required for all Lead Connector API requests. */
const GHL_VERSION = "2021-07-28";

function getEnv() {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GHL_CLIENT_ID and GHL_CLIENT_SECRET must be set");
  return { clientId, clientSecret };
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  userType?: string;
  locationId?: string;
  companyId?: string;
  [key: string]: unknown;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  userType: "Location" | "Company" = "Location"
): Promise<OAuthTokenResponse> {
  const { clientId, clientSecret } = getEnv();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    user_type: userType,
  });
  const res = await fetch(`${GHL_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Version: GHL_VERSION,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GhlApiError(res.status, text || res.statusText);
  }

  return res.json();
}

export async function getInstalledLocations(companyToken: string): Promise<{ locationId: string }[]> {
  const res = await fetch(`${GHL_API_BASE}/oauth/installedLocations`, {
    headers: { Authorization: `Bearer ${companyToken}`, Version: GHL_VERSION },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GhlApiError(res.status, text || res.statusText);
  }

  const data = await res.json();
  const locations = data.locations ?? data;
  return Array.isArray(locations) ? locations : [];
}

export async function getLocationToken(
  companyToken: string,
  locationId: string,
  companyId: string
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    companyId,
    locationId,
  });
  const res = await fetch(`${GHL_API_BASE}/oauth/locationToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Version: GHL_VERSION,
      Authorization: `Bearer ${companyToken}`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GhlApiError(res.status, text || res.statusText);
  }

  const data = await res.json();
  return data as OAuthTokenResponse;
}

export interface VoiceAIAgent {
  id: string;
  name?: string;
  [key: string]: unknown;
}

function normalizeAgentName(agent: Record<string, unknown>): string | undefined {
  // GHL API may return the agent name under different field names
  const candidate =
    agent.name ??
    agent.agentName ??
    agent.agent_name ??
    agent.title ??
    agent.displayName ??
    agent.display_name;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

export async function listAgents(locationToken: string, locationId: string): Promise<VoiceAIAgent[]> {
  const res = await fetch(`${GHL_API_BASE}/voice-ai/agents?locationId=${encodeURIComponent(locationId)}`, {
    headers: {
      Authorization: `Bearer ${locationToken}`,
      "Content-Type": "application/json",
      Version: GHL_VERSION,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GhlApiError(res.status, text || res.statusText);
  }

  const data = await res.json();
  const agents = data.agents ?? data;
  if (!Array.isArray(agents)) return [];
  return agents.map((a: Record<string, unknown>) => ({
    ...a,
    name: normalizeAgentName(a),
  }));
}

export async function getAgent(
  locationToken: string,
  locationId: string,
  agentId: string
): Promise<VoiceAIAgent> {
  const res = await fetch(
    `${GHL_API_BASE}/voice-ai/agents/${encodeURIComponent(agentId)}?locationId=${encodeURIComponent(locationId)}`,
    {
      headers: {
        Authorization: `Bearer ${locationToken}`,
        "Content-Type": "application/json",
        Version: GHL_VERSION,
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new GhlApiError(res.status, text || res.statusText);
  }

  const agent = await res.json() as Record<string, unknown>;
  return { ...agent, name: normalizeAgentName(agent) } as VoiceAIAgent;
}

export async function patchAgent(
  locationToken: string,
  locationId: string,
  agentId: string,
  /** Full agent body (e.g. from GET with mcpServers updated). GHL PATCH rejects both mcpServers and mcp_servers when sent alone; sending full agent may be required. */
  patch: Record<string, unknown>
): Promise<VoiceAIAgent> {
  const res = await fetch(
    `${GHL_API_BASE}/voice-ai/agents/${encodeURIComponent(agentId)}?locationId=${encodeURIComponent(locationId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${locationToken}`,
        "Content-Type": "application/json",
        Version: GHL_VERSION,
      },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new GhlApiError(res.status, text || res.statusText);
  }

  return res.json();
}

export class GhlApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GhlApiError";
  }
}
