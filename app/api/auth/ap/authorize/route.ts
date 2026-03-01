import { NextResponse } from "next/server";
import { createSessionId } from "@/lib/session";

const GHL_AUTH_BASE = "https://marketplace.gohighlevel.com/oauth/chooselocation";

export async function GET() {
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

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: sessionId,
  });

  const url = `${GHL_AUTH_BASE}?${params.toString()}`;
  return NextResponse.redirect(url);
}
