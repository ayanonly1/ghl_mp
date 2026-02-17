/**
 * In-memory session store for GHL location context.
 * In production, replace with Redis or signed JWT in cookie.
 */

export interface SessionData {
  locationId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

const store = new Map<string, SessionData>();

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export function setSession(sessionId: string, data: SessionData): void {
  store.set(sessionId, {
    ...data,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function getSession(sessionId: string): SessionData | null {
  const data = store.get(sessionId);
  if (!data) return null;
  if (data.expiresAt && data.expiresAt < Date.now()) {
    store.delete(sessionId);
    return null;
  }
  return data;
}

export function deleteSession(sessionId: string): void {
  store.delete(sessionId);
}

export function createSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
}
