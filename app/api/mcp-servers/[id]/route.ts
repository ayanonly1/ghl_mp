import { NextRequest, NextResponse } from "next/server";
import { getServer, SmitheryApiError } from "@/lib/smithery";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing server id" }, { status: 400 });
  }

  try {
    const server = await getServer(id);
    return NextResponse.json(server);
  } catch (err) {
    if (err instanceof SmitheryApiError) {
      const status = err.status === 404 ? 404 : err.status >= 500 ? 503 : err.status;
      return NextResponse.json(
        { error: err.message },
        { status }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch MCP server" },
      { status: 503 }
    );
  }
}
