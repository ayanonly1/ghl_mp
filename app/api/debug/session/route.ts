import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionCookie } from "@/lib/session";

/**
 * GET /api/debug/session
 * Safe to call from the browser (same tab as the app so cookie is sent).
 * Returns whether a session cookie exists and if it's valid — no secrets.
 * Use this to debug "Connect your account" when the app is opened in the browser.
 */
export async function GET() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("ghl_session")?.value;

  const cookiePresent = Boolean(cookieValue);
  const session = cookiePresent ? decodeSessionCookie(cookieValue) : null;
  const sessionValid = Boolean(session);

  const body: {
    cookiePresent: boolean;
    sessionValid: boolean;
    locationIdMasked?: string;
    hint?: string;
  } = {
    cookiePresent,
    sessionValid,
  };

  if (session) {
    // Only show last 6 chars of locationId so you can confirm it's your location
    body.locationIdMasked =
      session.locationId.length > 6
        ? `...${session.locationId.slice(-6)}`
        : session.locationId;
  } else if (cookiePresent) {
    body.hint =
      "Cookie exists but invalid or expired. Try connecting again from the app.";
  } else {
    body.hint =
      "No session cookie. Click 'Connect your account' and complete OAuth.";
  }

  return NextResponse.json(body);
}
