import { NextResponse } from "next/server";
import { buildStravaAuthorizeUrl } from "@/services/strava";

export async function GET() {
  const authorizeUrl = buildStravaAuthorizeUrl();

  if (!authorizeUrl) {
    return NextResponse.redirect(new URL("/garmin?strava=not-configured", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  return NextResponse.redirect(authorizeUrl);
}
