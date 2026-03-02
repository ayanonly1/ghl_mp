import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  getInstalledLocations,
  getLocationToken,
  GhlApiError,
} from "@/lib/ghl";
import {
  encodeSessionCookie,
  getSessionCookieMaxAge,
} from "@/lib/session";

const CUSTOM_PAGE_PATH = "/custom-page";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  const redirectUri = process.env.GHL_OAUTH_REDIRECT_URI;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  if (!redirectUri) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  const fullRedirectUri = redirectUri.startsWith("http")
    ? redirectUri
    : `${baseUrl}${redirectUri}`;

  if (!code) {
    return NextResponse.redirect(
      new URL(`${CUSTOM_PAGE_PATH}?error=missing_code`, baseUrl)
    );
  }

  try {
    let tokenResponse = await exchangeCodeForTokens(code, fullRedirectUri, "Location");

    if (tokenResponse.userType === "Company" && tokenResponse.companyId) {
      const locations = await getInstalledLocations(tokenResponse.access_token);
      const first = locations[0];
      if (!first) {
        return NextResponse.redirect(
          new URL(`${CUSTOM_PAGE_PATH}?error=no_location`, baseUrl)
        );
      }
      tokenResponse = await getLocationToken(
        tokenResponse.access_token,
        first.locationId,
        tokenResponse.companyId
      );
    }

    const locationId = tokenResponse.locationId;
    if (!locationId) {
      return NextResponse.redirect(
        new URL(`${CUSTOM_PAGE_PATH}?error=no_location_id`, baseUrl)
      );
    }

    // Use signed cookie so session works on Vercel (no in-memory store across instances)
    const sessionCookie = encodeSessionCookie({
      locationId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    });

    const response = NextResponse.redirect(new URL(CUSTOM_PAGE_PATH, baseUrl));
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set("ghl_session", sessionCookie, {
      httpOnly: true,
      secure: isProduction,
      // SameSite=none so the cookie is sent when the app is embedded in GHL's iframe (cross-site)
      sameSite: isProduction ? "none" : "lax",
      maxAge: getSessionCookieMaxAge(),
      path: "/",
    });
    return response;
  } catch (err) {
    if (err instanceof GhlApiError) {
      return NextResponse.redirect(
        new URL(
          `${CUSTOM_PAGE_PATH}?error=auth_failed&message=${encodeURIComponent(err.message)}`,
          baseUrl
        )
      );
    }
    return NextResponse.redirect(
      new URL(`${CUSTOM_PAGE_PATH}?error=auth_failed`, baseUrl)
    );
  }
}
