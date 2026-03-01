import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { listAgents, GhlApiError } from "@/lib/ghl";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agents = await listAgents(auth.accessToken, auth.locationId);
    return NextResponse.json({ agents });
  } catch (err) {
    if (err instanceof GhlApiError) {
      const status = err.status === 401 || err.status === 403 ? err.status : 502;
      return NextResponse.json(
        { error: err.message || "API error" },
        { status }
      );
    }
    return NextResponse.json(
      { error: "Failed to list agents" },
      { status: 502 }
    );
  }
}
