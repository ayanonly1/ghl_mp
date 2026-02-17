import {
  exchangeCodeForTokens,
  getLocationToken,
  getInstalledLocations,
  listAgents,
  patchAgent,
  GhlApiError,
} from "@/lib/ghl";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.GHL_CLIENT_ID = "client-id";
  process.env.GHL_CLIENT_SECRET = "client-secret";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.GHL_CLIENT_ID;
  delete process.env.GHL_CLIENT_SECRET;
});

describe("exchangeCodeForTokens", () => {
  it("sends form-urlencoded body and user_type", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "at",
          refresh_token: "rt",
          expires_in: 86400,
          token_type: "Bearer",
          userType: "Location",
          locationId: "loc1",
        }),
    });

    await exchangeCodeForTokens("code123", "https://app.com/cb", "Location");

    expect(fetch).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/oauth/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      })
    );
    const body = (fetch as jest.Mock).mock.calls[0][1].body;
    expect(body).toContain("user_type=Location");
    expect(body).toContain("code=code123");
  });

  it("throws GhlApiError on 401", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    await expect(
      exchangeCodeForTokens("bad", "https://app.com/cb")
    ).rejects.toThrow(GhlApiError);
  });

  it("throws when env is missing", async () => {
    delete process.env.GHL_CLIENT_SECRET;
    await expect(
      exchangeCodeForTokens("code", "https://app.com/cb")
    ).rejects.toThrow("GHL_CLIENT_SECRET");
  });
});

describe("getInstalledLocations", () => {
  it("returns locations array", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ locations: [{ locationId: "L1" }, { locationId: "L2" }] }),
    });
    const locations = await getInstalledLocations("company-token");
    expect(locations).toHaveLength(2);
    expect(locations[0].locationId).toBe("L1");
  });
});

describe("getLocationToken", () => {
  it("sends companyId and locationId in body", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "loc-token",
          locationId: "L1",
          userType: "Location",
        }),
    });
    const result = await getLocationToken("company-token", "L1", "C1");
    expect(result.access_token).toBe("loc-token");
    expect(result.locationId).toBe("L1");
    const body = (fetch as jest.Mock).mock.calls[0][1].body;
    expect(body).toContain("companyId=C1");
    expect(body).toContain("locationId=L1");
  });
});

describe("listAgents", () => {
  it("returns agents array", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ agents: [{ id: "a1", name: "Agent 1" }] }),
    });
    const agents = await listAgents("token", "loc1");
    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe("a1");
  });

  it("handles response without agents key", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "a1" }]),
    });
    const agents = await listAgents("token", "loc1");
    expect(agents).toHaveLength(1);
  });
});

describe("patchAgent", () => {
  it("sends PATCH with mcpServers", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "a1", mcpServers: { mcp1: { url: "https://x.com" } } }),
    });
    await patchAgent("token", "loc1", "a1", {
      mcpServers: { mcp1: { url: "https://x.com" } },
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/voice-ai/agents/a1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ mcpServers: { mcp1: { url: "https://x.com" } } }),
      })
    );
  });
});
