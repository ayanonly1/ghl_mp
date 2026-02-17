export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>MCP Registry Marketplace</h1>
      <p>
        <a href="/api/auth/ap/authorize">Connect to HighLevel</a> to open the app.
      </p>
      <p>
        <a href="/custom-page">Open Custom Page</a> (requires session).
      </p>
    </main>
  );
}
