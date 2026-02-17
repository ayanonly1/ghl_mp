/**
 * Integration test: MCP servers route with mocked Smithery.
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/mcp-servers/route";

const originalFetch = globalThis.fetch;
const originalEnv = process.env.SMITHERY_API_KEY;

describe("GET /api/mcp-servers", () => {
  beforeEach(() => {
    process.env.SMITHERY_API_KEY = "test-key";
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          servers: [
            {
              qualifiedName: "smithery/test",
              displayName: "Test MCP",
              description: "Description",
              iconUrl: null,
              verified: true,
              useCount: 0,
              remote: true,
              createdAt: "2024-01-01",
              homepage: "https://example.com",
            },
          ],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalPages: 1,
            totalCount: 1,
          },
        }),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.SMITHERY_API_KEY = originalEnv;
  });

  it("returns 200 and list when Smithery returns 200", async () => {
    const req = new NextRequest("http://localhost/api/mcp-servers");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.servers).toHaveLength(1);
    expect(data.servers[0].qualifiedName).toBe("smithery/test");
    expect(data.pagination.totalCount).toBe(1);
  });

  it("returns 503 when Smithery returns 500", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Smithery error" }),
    });
    const req = new NextRequest("http://localhost/api/mcp-servers");
    const res = await GET(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
