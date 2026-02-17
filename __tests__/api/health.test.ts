/**
 * Integration test: health route handler returns 200 and JSON.
 */

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with status ok and timestamp", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("timestamp");
    expect(typeof data.timestamp).toBe("string");
  });
});
