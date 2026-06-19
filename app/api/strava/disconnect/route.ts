import { NextResponse } from "next/server";
import { saveUserAppData } from "@/services/supabaseData";

const STRAVA_ACCESS_COOKIE = "cmoi_strava_access";
const STRAVA_REFRESH_COOKIE = "cmoi_strava_refresh";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(STRAVA_ACCESS_COOKIE);
  response.cookies.delete(STRAVA_REFRESH_COOKIE);

  try {
    await saveUserAppData({
      stravaData: {
        connected: false,
        activities: [],
        syncedAt: new Date().toISOString()
      }
    });
  } catch {
    // Cookies are still cleared even if the account sync is temporarily unavailable.
  }

  return response;
}
