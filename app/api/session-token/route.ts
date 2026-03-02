import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionCookie } from "@/lib/session";

/**
 * Returns the current session token when the ghl_session cookie is sent.
 * Used by the /auth/connector popup to pass the session into the iframe via postMessage.
 * Only works when the request is same-origin and the cookie is sent (e.g. popup after OAuth).
 */
export async function GET() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("ghl_session")?.value;
  const session = cookieValue ? decodeSessionCookie(cookieValue) : null;
  if (!session) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  return NextResponse.json({ token: cookieValue });
}
