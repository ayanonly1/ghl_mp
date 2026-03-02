import { NextRequest, NextResponse } from "next/server";
import { createSessionId } from "@/lib/session";

const GHL_AUTH_BASE = "https://marketplace.gohighlevel.com/oauth/chooselocation";

export async function GET(request: NextRequest) {
  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.GHL_OAUTH_REDIRECT_URI;
  const scopes = process.env.GHL_SCOPES ?? "locations.readonly";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Server configuration error: missing OAuth config" },
      { status: 503 }
    );
  }

  const sessionId = createSessionId();
  const isPopup = request.nextUrl.searchParams.get("mode") === "popup";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: sessionId,
  });

  const url = `${GHL_AUTH_BASE}?${params.toString()}`;
  const response = NextResponse.redirect(url);
  if (isPopup) {
    response.cookies.set("oauth_flow", "popup", { maxAge: 60 * 10, path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  }
  return response;
}
