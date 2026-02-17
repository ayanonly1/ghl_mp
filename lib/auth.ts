import { cookies } from "next/headers";
import { getSession } from "@/lib/session";

export interface AuthContext {
  sessionId: string;
  locationId: string;
  accessToken: string;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("ghl_session")?.value;
  if (!sessionId) return null;

  const session = getSession(sessionId);
  if (!session) return null;

  return {
    sessionId,
    locationId: session.locationId,
    accessToken: session.accessToken,
  };
}

export function requireAuthResponse(body: { error: string }, status: number) {
  return Response.json(body, { status });
}
