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
    <main style={styles.main}>
      <h1 style={styles.h1}>MCP Registry</h1>

      {showConnect && (
        <p style={styles.alert}>
          <a href="/api/auth/ghl/authorize" style={styles.link}>
            Connect to HighLevel
          </a>{" "}
          to use this app.
        </p>
      )}

      {error && !showConnect && (
        <div style={styles.error}>
          {error}
          <button type="button" onClick={() => setError(null)} style={styles.dismiss}>
            Dismiss
          </button>
        </div>
      )}
      {attachSuccess && (
        <div style={styles.success}>
          {attachSuccess}
          <button type="button" onClick={() => setAttachSuccess(null)} style={styles.dismiss}>
            Dismiss
          </button>
        </div>
      )}

      {!showConnect && (
        <>
          <section style={styles.section}>
            <h2 style={styles.h2}>Current MCP attachments</h2>
            {loadingAttachments ? (
              <p>Loading…</p>
            ) : attachments.length === 0 ? (
              <p style={styles.muted}>No agents or no MCPs attached yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Agent</th>
                    <th style={styles.th}>Attached MCP</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((a) => (
                    <tr key={a.agentId}>
                      <td style={styles.td}>{a.agentName ?? a.agentId}</td>
                      <td style={styles.td}>{a.mcpName ?? a.mcpKey ?? "None"}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.btnSmall}
                          onClick={() => { setChangeAgentId(a.agentId); setStep("list"); setSelectedMcp(null); }}
                          disabled={!!attachLoading}
                        >
                          Change
                        </button>
                        {" "}
                        <button
                          type="button"
                          style={{ ...styles.btnSmall, ...styles.btnDanger }}
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
            )}
          </section>

          <section style={styles.section}>
            {step === "list" && (
              <>
                {changeAgentId && (
                  <p style={styles.alert}>
                    Select an MCP below to attach to this agent (replacing current).{" "}
                    <button type="button" style={styles.dismiss} onClick={() => setChangeAgentId(null)}>
                      Cancel
                    </button>
                  </p>
                )}
                <h2 style={styles.h2}>Browse MCPs</h2>
                <div style={styles.toolbar}>
                  <input
                    type="search"
                    placeholder="Search MCPs…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    style={styles.input}
                  />
                  <button type="button" onClick={() => loadMcps()} style={styles.btn}>
                    Search
                  </button>
                </div>
                {loadingMcps ? (
                  <p>Loading MCPs…</p>
                ) : mcps && mcps.servers.length > 0 ? (
                  <>
                    <ul style={styles.list}>
                      {mcps.servers.map((mcp) => (
                        <li key={mcp.qualifiedName} style={styles.card}>
                          <div>
                            <strong>{mcp.displayName ?? mcp.qualifiedName}</strong>
                            {mcp.verified && <span style={styles.badge}>Verified</span>}
                          </div>
                          {mcp.description && (
                            <p style={styles.desc}>{mcp.description.slice(0, 120)}{mcp.description.length > 120 ? "…" : ""}</p>
                          )}
                          <button
                            type="button"
                            style={styles.btn}
                            onClick={() => handleSelectMcp(mcp)}
                          >
                            Attach to agent
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div style={styles.pagination}>
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        style={styles.btn}
                      >
                        Previous
                      </button>
                      <span style={styles.pageInfo}>
                        Page {mcps.pagination.currentPage} of {mcps.pagination.totalPages} ({mcps.pagination.totalCount} total)
                      </span>
                      <button
                        type="button"
                        disabled={page >= mcps.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        style={styles.btn}
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <p style={styles.muted}>No MCPs found.</p>
                )}
              </>
            )}

            {step === "choose-agent" && selectedMcp && (
              <>
                <h2 style={styles.h2}>Choose Voice AI Agent</h2>
                <p style={styles.muted}>
                  Attach &quot;{selectedMcp.displayName ?? selectedMcp.qualifiedName}&quot; to:
                </p>
                {loadingAgents ? (
                  <p>Loading agents…</p>
                ) : agents.length === 0 ? (
                  <p style={styles.muted}>No agents in this location.</p>
                ) : (
                  <ul style={styles.list}>
                    {agents.map((agent) => (
                      <li key={agent.id} style={styles.card}>
                        <span>{agent.name ?? agent.id}</span>
                        <button
                          type="button"
                          style={styles.btn}
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
                  style={styles.btnSecondary}
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

const styles: Record<string, React.CSSProperties> = {
  main: { padding: "1.5rem", fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto" },
  h1: { fontSize: "1.5rem", marginBottom: "1rem" },
  h2: { fontSize: "1.2rem", marginBottom: "0.75rem" },
  alert: { padding: "1rem", background: "#fef3c7", borderRadius: 6 },
  link: { color: "#b45309", fontWeight: 600 },
  error: { padding: "0.75rem", background: "#fee2e2", borderRadius: 6, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" },
  success: { padding: "0.75rem", background: "#d1fae5", borderRadius: 6, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" },
  dismiss: { marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" },
  section: { marginBottom: "2rem" },
  muted: { color: "#6b7280", fontSize: "0.9rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "0.5rem", borderBottom: "1px solid #e5e7eb" },
  toolbar: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  input: { flex: 1, padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: 6 },
  btn: { padding: "0.5rem 1rem", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer" },
  btnSecondary: { padding: "0.5rem 1rem", background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", marginTop: "1rem" },
  btnSmall: { padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: "#2563eb", color: "white", border: "none", borderRadius: 4, cursor: "pointer" },
  btnDanger: { background: "#dc2626" },
  list: { listStyle: "none", padding: 0, margin: 0 },
  card: { padding: "1rem", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" },
  desc: { margin: 0, fontSize: "0.9rem", color: "#4b5563" },
  badge: { marginLeft: "0.5rem", fontSize: "0.75rem", background: "#d1fae5", color: "#065f46", padding: "0.15rem 0.5rem", borderRadius: 4 },
  pagination: { display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" },
  pageInfo: { fontSize: "0.9rem", color: "#6b7280" },
};
