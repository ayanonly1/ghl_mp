/**
 * Session handling for GHL location context.
 * Uses signed cookie so it works on Vercel (no in-memory store across serverless instances).
 * Fallback in-memory store kept for local dev if cookie is not used.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionData {
  locationId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

const store = new Map<string, SessionData>();
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const COOKIE_TTL_SEC = 60 * 60 * 24; // 24 hours

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.GHL_CLIENT_SECRET;
  if (!secret) throw new Error("SESSION_SECRET or GHL_CLIENT_SECRET must be set for cookie session");
  return secret;
}

/** Payload stored in cookie (short keys to save size). */
interface CookiePayload {
  l: string;   // locationId
  a: string;   // accessToken
  r?: string;  // refreshToken
  e: number;   // exp (seconds)
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}
function fromBase64Url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/**
 * Encode session data into a signed cookie value.
 * Use this in the OAuth callback and set the result as the ghl_session cookie.
 */
export function encodeSessionCookie(data: SessionData): string {
  const exp = Math.floor((Date.now() + SESSION_TTL_MS) / 1000);
  const payload: CookiePayload = {
    l: data.locationId,
    a: data.accessToken,
    r: data.refreshToken,
    e: exp,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = toBase64Url(Buffer.from(payloadJson, "utf8"));
  const secret = getSessionSecret();
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${toBase64Url(sig)}`;
}

/**
 * Decode and verify the ghl_session cookie value.
 * Returns session data or null if invalid/expired.
 */
export function decodeSessionCookie(cookieValue: string | undefined): SessionData | null {
  if (!cookieValue || !cookieValue.includes(".")) return null;
  const [payloadB64, sigB64] = cookieValue.split(".");
  if (!payloadB64 || !sigB64) return null;
  try {
    const secret = getSessionSecret();
    const expectedSig = createHmac("sha256", secret).update(payloadB64).digest();
    const actualSig = fromBase64Url(sigB64);
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
      return null;
    }
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as CookiePayload;
    if (!payload?.l || !payload?.a || typeof payload.e !== "number") return null;
    if (payload.e < Math.floor(Date.now() / 1000)) return null; // expired
    return {
      locationId: payload.l,
      accessToken: payload.a,
      refreshToken: payload.r,
      expiresAt: payload.e * 1000,
    };
  } catch {
    return null;
  }
}

/** Cookie max-age in seconds for Set-Cookie. */
export function getSessionCookieMaxAge(): number {
  return COOKIE_TTL_SEC;
}

// --- In-memory store (fallback / legacy; not used when cookie session is set)

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
