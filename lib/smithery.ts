/**
 * Smithery Registry API client.
 * All calls use server-side API key; never expose to frontend.
 */

const SMITHERY_BASE = "https://registry.smithery.ai";

export interface SmitheryServer {
  qualifiedName: string;
  displayName: string | null;
  description: string | null;
  iconUrl: string | null;
  verified: boolean;
  useCount: number;
  remote: boolean;
  createdAt: string;
  homepage: string;
  tags?: string[];
}

export interface SmitheryServersResponse {
  servers: SmitheryServer[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface SmitheryError {
  error: string;
}

function getApiKey(): string {
  const key = process.env.SMITHERY_API_KEY;
  if (!key) throw new Error("SMITHERY_API_KEY is not set");
  return key;
}

export async function listServers(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<SmitheryServersResponse> {
  const apiKey = getApiKey();
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.pageSize != null) searchParams.set("pageSize", String(params.pageSize));

  const url = `${SMITHERY_BASE}/servers?${searchParams.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as SmitheryError;
    throw new SmitheryApiError(
      res.status,
      body?.error ?? res.statusText ?? "Smithery request failed"
    );
  }

  return res.json() as Promise<SmitheryServersResponse>;
}

export async function getServer(id: string): Promise<SmitheryServer & Record<string, unknown>> {
  const apiKey = getApiKey();
  const encodedId = encodeURIComponent(id);
  const res = await fetch(`${SMITHERY_BASE}/servers/${encodedId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as SmitheryError;
    throw new SmitheryApiError(
      res.status,
      body?.error ?? res.statusText ?? "Smithery request failed"
    );
  }

  return res.json();
}

export class SmitheryApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "SmitheryApiError";
  }
}
