import { cookies, headers } from "next/headers";
import { decodeSessionCookie, getSession } from "@/lib/session";

export interface AuthContext {
  sessionId: string;
  locationId: string;
  accessToken: string;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  let cookieValue = cookieStore.get("ghl_session")?.value;

  // Iframe fallback: accept session token from header (set by client when cookie is not sent in iframe)
  if (!cookieValue) {
    const headersList = await headers();
    const sessionHeader = headersList.get("x-ghl-session");
    if (sessionHeader) cookieValue = sessionHeader;
  }

  // Prefer signed cookie (works on Vercel serverless; no in-memory store needed)
  const cookieSession = decodeSessionCookie(cookieValue);
  if (cookieSession) {
    return {
      sessionId: "cookie",
      locationId: cookieSession.locationId,
      accessToken: cookieSession.accessToken,
    };
  }

  // Fallback: in-memory session by id (local dev only)
  if (!cookieValue) return null;
  const session = getSession(cookieValue);
  if (!session) return null;

  return {
    sessionId: cookieValue,
    locationId: session.locationId,
    accessToken: session.accessToken,
  };
}

export function requireAuthResponse(body: { error: string }, status: number) {
  return Response.json(body, { status });
}
