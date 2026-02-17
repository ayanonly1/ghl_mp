import { listServers, getServer, SmitheryApiError } from "@/lib/smithery";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.SMITHERY_API_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SMITHERY_API_KEY;
});

describe("listServers", () => {
  it("calls Smithery with Bearer token and returns normalized list", async () => {
    const mockServers = {
      servers: [
        {
          qualifiedName: "smithery/hello",
          displayName: "Hello",
          description: "A test server",
          iconUrl: null,
          verified: true,
          useCount: 10,
          remote: true,
          createdAt: "2024-01-01",
          homepage: "https://example.com",
        },
      ],
      pagination: { currentPage: 1, pageSize: 10, totalPages: 1, totalCount: 1 },
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockServers),
    });

    const result = await listServers({ q: "hello", page: 1, pageSize: 10 });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("registry.smithery.ai/servers"),
      expect.objectContaining({
        headers: { Authorization: "Bearer test-key" },
      })
    );
    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].qualifiedName).toBe("smithery/hello");
    expect(result.pagination.totalCount).toBe(1);
  });

  it("throws SmitheryApiError on 4xx", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ error: "Invalid API key" }),
    });

    await expect(listServers({})).rejects.toThrow(SmitheryApiError);
    await expect(listServers({})).rejects.toMatchObject({
      status: 401,
      message: "Invalid API key",
    });
  });

  it("throws when SMITHERY_API_KEY is missing", async () => {
    delete process.env.SMITHERY_API_KEY;
    await expect(listServers({})).rejects.toThrow("SMITHERY_API_KEY");
  });
});

describe("getServer", () => {
  it("fetches server by id", async () => {
    const mockServer = {
      qualifiedName: "smithery/hello",
      displayName: "Hello",
      description: "Desc",
      iconUrl: null,
      verified: true,
      useCount: 5,
      remote: true,
      createdAt: "2024-01-01",
      homepage: "https://example.com",
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockServer),
    });

    const result = await getServer("smithery/hello");
    expect(result.qualifiedName).toBe("smithery/hello");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("servers/smithery%2Fhello"),
      expect.any(Object)
    );
  });

  it("throws SmitheryApiError on 404", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "Server not found" }),
    });
    await expect(getServer("unknown/foo")).rejects.toThrow(SmitheryApiError);
  });
});
