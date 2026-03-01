"use client";

import { useEffect, useState, useCallback } from "react";

type McpServer = {
  qualifiedName: string;
  displayName: string | null;
  description: string | null;
  iconUrl: string | null;
  verified: boolean;
  useCount: number;
  homepage: string;
  tags?: string[];
};

type McpListResponse = {
  servers: McpServer[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
};

type Agent = { id: string; name?: string };

type Attachment = {
  agentId: string;
  agentName?: string;
  mcpKey: string | null;
  mcpName: string | null;
};

const API = "/api";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
  return data;
}

export default function CustomPage() {
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mcps, setMcps] = useState<McpListResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loadingMcps, setLoadingMcps] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [step, setStep] = useState<"list" | "choose-agent">("list");
  const [selectedMcp, setSelectedMcp] = useState<McpServer | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState<string | null>(null);
  const [attachLoading, setAttachLoading] = useState<string | null>(null);
  const [changeAgentId, setChangeAgentId] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    setLoadingAttachments(true);
    setError(null);
    try {
      const data = await apiGet<{ attachments: Attachment[] }>(`${API}/agents/attachments`);
      setAttachments(data.attachments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments");
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  }, []);

  const loadMcps = useCallback(async () => {
    setLoadingMcps(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("page", String(page));
      params.set("pageSize", "10");
      const data = await apiGet<McpListResponse>(`${API}/mcp-servers?${params}`);
      setMcps(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load MCPs");
      setMcps(null);
    } finally {
      setLoadingMcps(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  useEffect(() => {
    loadMcps();
  }, [loadMcps]);

  const handleSelectMcp = (mcp: McpServer) => {
    setSelectedMcp(mcp);
    setError(null);
    if (changeAgentId) {
      void handleAttach(changeAgentId, mcp);
      setChangeAgentId(null);
      return;
    }
    setStep("choose-agent");
    setAgents([]);
    setLoadingAgents(true);
    fetch(`${API}/agents`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Unauthorized"))))
      .then((data: { agents?: Agent[] }) => {
        setAgents(data.agents ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load agents"))
      .finally(() => setLoadingAgents(false));
  };

  const handleAttach = async (agentId: string, mcpOverride?: McpServer | null) => {
    const mcp = mcpOverride ?? selectedMcp;
    if (!mcp) return;
    setAttachLoading(agentId);
    setError(null);
    setAttachSuccess(null);
    try {
      const mcpUrl = mcp.homepage
        ? `https://registry.smithery.ai/servers/${encodeURIComponent(mcp.qualifiedName)}`
        : mcp.qualifiedName;
      await apiPost(`${API}/agents/${agentId}/attach-mcp`, {
        url: mcpUrl,
        mcpKey: mcp.qualifiedName.replace(/\W/g, "_"),
        mcpName: mcp.displayName ?? mcp.qualifiedName,
      });
      setAttachSuccess("MCP attached to agent.");
      await loadAttachments();
      setStep("list");
      setSelectedMcp(null);
      setChangeAgentId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to attach MCP");
    } finally {
      setAttachLoading(null);
    }
  };

  const handleDetach = async (agentId: string) => {
    setAttachLoading(agentId);
    setError(null);
    setAttachSuccess(null);
    try {
      await apiPost(`${API}/agents/${agentId}/detach-mcp`, {});
      setAttachSuccess("MCP detached.");
      await loadAttachments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to detach");
    } finally {
      setAttachLoading(null);
    }
  };

  const showConnect = attachments.length === 0 && !loadingAttachments && error?.toLowerCase().includes("unauthorized");

  return (
    <main className="page-container">
      {showConnect && (
        <div className="alert alert-warning">
          <a href="/api/auth/ap/authorize">Connect your account</a> to use this app.
        </div>
      )}

      {error && !showConnect && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm alert-dismiss" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {attachSuccess && (
        <div className="alert alert-success">
          <span>{attachSuccess}</span>
          <button type="button" className="btn btn-ghost btn-sm alert-dismiss" onClick={() => setAttachSuccess(null)}>
            Dismiss
          </button>
        </div>
      )}

      {!showConnect && (
        <>
          <section className="section">
            <h2 className="section-title">Current MCP attachments</h2>
            {loadingAttachments ? (
              <p className="muted">Loading…</p>
            ) : attachments.length === 0 ? (
              <p className="muted">No agents or no MCPs attached yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Attached MCP</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((a) => (
                      <tr key={a.agentId}>
                        <td>{a.agentName ?? a.agentId}</td>
                        <td>{a.mcpName ?? a.mcpKey ?? "None"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => { setChangeAgentId(a.agentId); setStep("list"); setSelectedMcp(null); }}
                            disabled={!!attachLoading}
                          >
                            Change
                          </button>
                          {" "}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDetach(a.agentId)}
                            disabled={!!attachLoading}
                          >
                            {attachLoading === a.agentId ? "…" : "Detach"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section">
            {step === "list" && (
              <>
                {changeAgentId && (
                  <div className="alert alert-warning" style={{ marginBottom: "1rem" }}>
                    <span>Select an MCP below to attach to this agent (replacing current).</span>
                    <button type="button" className="btn btn-ghost btn-sm alert-dismiss" onClick={() => setChangeAgentId(null)}>
                      Cancel
                    </button>
                  </div>
                )}
                <h2 className="section-title">Browse MCPs</h2>
                <div className="toolbar">
                  <input
                    type="search"
                    className="input"
                    placeholder="Search MCPs…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                  <button type="button" className="btn btn-primary" onClick={() => loadMcps()}>
                    Search
                  </button>
                </div>
                {loadingMcps ? (
                  <p className="muted">Loading MCPs…</p>
                ) : mcps && mcps.servers.length > 0 ? (
                  <>
                    <ul className="mcp-list">
                      {mcps.servers.map((mcp) => (
                        <li key={mcp.qualifiedName} className="mcp-card card">
                          <div>
                            <strong>{mcp.displayName ?? mcp.qualifiedName}</strong>
                            {mcp.verified && <span className="badge">Verified</span>}
                          </div>
                          {mcp.description && (
                            <p className="mcp-card-desc">
                              {mcp.description.slice(0, 120)}{mcp.description.length > 120 ? "…" : ""}
                            </p>
                          )}
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSelectMcp(mcp)}
                          >
                            Attach to agent
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="pagination">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </button>
                      <span className="page-info">
                        Page {mcps.pagination.currentPage} of {mcps.pagination.totalPages} ({mcps.pagination.totalCount} total)
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={page >= mcps.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">No MCPs found.</p>
                )}
              </>
            )}

            {step === "choose-agent" && selectedMcp && (
              <>
                <h2 className="section-title">Choose Voice AI Agent</h2>
                <p className="muted" style={{ marginBottom: "1rem" }}>
                  Attach &quot;{selectedMcp.displayName ?? selectedMcp.qualifiedName}&quot; to:
                </p>
                {loadingAgents ? (
                  <p className="muted">Loading agents…</p>
                ) : agents.length === 0 ? (
                  <p className="muted">No agents in this location.</p>
                ) : (
                  <ul className="mcp-list">
                    {agents.map((agent) => (
                      <li key={agent.id} className="mcp-card card">
                        <span>{agent.name ?? agent.id}</span>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => selectedMcp && handleAttach(agent.id, selectedMcp)}
                          disabled={attachLoading !== null || !selectedMcp}
                        >
                          {attachLoading === agent.id ? "Attaching…" : "Attach"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: "1rem" }}
                  onClick={() => { setStep("list"); setSelectedMcp(null); }}
                >
                  Back to MCP list
                </button>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
