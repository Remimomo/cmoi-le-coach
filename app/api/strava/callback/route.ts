import { NextResponse } from "next/server";
import { exchangeStravaCode } from "@/services/strava";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const appUrl = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/garmin?strava=missing-code", appUrl));
  }

  try {
    const tokens = await exchangeStravaCode(code);
    const response = NextResponse.redirect(new URL("/garmin?strava=connected", appUrl));
    response.cookies.set("cmoi_strava_access", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(60, tokens.expires_at - Math.floor(Date.now() / 1000))
    });
    response.cookies.set("cmoi_strava_refresh", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/garmin?strava=error", appUrl));
  }
}
