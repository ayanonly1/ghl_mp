import Link from "next/link";

export default function Home() {
  return (
    <div className="page-container">
      <div className="hero">
        <h1 className="hero-title">MCP Registry Marketplace</h1>
        <p className="hero-subtitle">
          Connect your HighLevel Voice AI agents to MCP servers from the Smithery registry—browse, attach, and manage in one place.
        </p>
      </div>

      <div className="card-grid">
        <div className="card card-feature">
          <h2 className="card-feature-title">Get started</h2>
          <p className="muted" style={{ margin: "0 0 1rem 0" }}>
            Connect your HighLevel account to open the app and manage MCP attachments for your Voice AI agents.
          </p>
          <Link href="/api/auth/ap/authorize" className="btn btn-primary">
            Connect to HighLevel
          </Link>
        </div>
        <div className="card card-feature">
          <h2 className="card-feature-title">Open the app</h2>
          <p className="muted" style={{ margin: "0 0 1rem 0" }}>
            After connecting, open the Custom Page to browse MCPs, attach them to agents, and view or change attachments.
          </p>
          <Link href="/custom-page" className="btn btn-secondary">
            Open Custom Page
          </Link>
          <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem" }}>
            Requires an active session.
          </p>
        </div>
      </div>
    </div>
  );
}
