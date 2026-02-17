import { NextRequest, NextResponse } from "next/server";
import { listServers, SmitheryApiError } from "@/lib/smithery";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") ?? undefined;
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");

    const result = await listServers({
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SmitheryApiError) {
      const status = err.status >= 500 ? 503 : err.status;
      return NextResponse.json(
        { error: err.message },
        { status }
      );
    }
    if (err instanceof Error && err.message.includes("SMITHERY_API_KEY")) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch MCP servers" },
      { status: 503 }
    );
  }
}
