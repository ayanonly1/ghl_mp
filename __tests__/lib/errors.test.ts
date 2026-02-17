import { apiError, mapSmitheryStatus, mapGhlStatus } from "@/lib/errors";

describe("apiError", () => {
  it("returns Response with JSON body and status", async () => {
    const res = apiError("Something failed", 503);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data).toEqual({ error: "Something failed" });
  });
});

describe("mapSmitheryStatus", () => {
  it("maps 5xx to 503", () => {
    expect(mapSmitheryStatus(500)).toBe(503);
    expect(mapSmitheryStatus(502)).toBe(503);
  });
  it("returns 4xx as-is", () => {
    expect(mapSmitheryStatus(400)).toBe(400);
    expect(mapSmitheryStatus(401)).toBe(401);
  });
});

describe("mapGhlStatus", () => {
  it("maps 404 to 404", () => {
    expect(mapGhlStatus(404)).toBe(404);
  });
  it("preserves 401 and 403", () => {
    expect(mapGhlStatus(401)).toBe(401);
    expect(mapGhlStatus(403)).toBe(403);
  });
  it("maps other errors to 502", () => {
    expect(mapGhlStatus(500)).toBe(502);
  });
});
