import { cookies } from "next/headers";
import { decodeSessionCookie, getSession } from "@/lib/session";

export interface AuthContext {
  sessionId: string;
  locationId: string;
  accessToken: string;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("ghl_session")?.value;

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
