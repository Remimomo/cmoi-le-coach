import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStravaActivities, refreshStravaToken } from "@/services/strava";
import { callEnterpriseRpc } from "@/services/enterprise";

const STRAVA_ACCESS_COOKIE = "cmoi_strava_access";
const STRAVA_REFRESH_COOKIE = "cmoi_strava_refresh";

async function getValidAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(STRAVA_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(STRAVA_REFRESH_COOKIE)?.value;

  if (accessToken) return { accessToken, refreshed: null };
  if (!refreshToken) throw new Error("Compte Strava non connecté.");

  const refreshed = await refreshStravaToken(refreshToken);
  return { accessToken: refreshed.access_token, refreshed };
}

export async function POST() {
  try {
    const { accessToken, refreshed } = await getValidAccessToken();
    const activities = await getStravaActivities(accessToken, 30);
    const results = [];

    for (const activity of activities) {
      const result = await callEnterpriseRpc("validate_strava_activity_points", {
        body: {
          strava_activity_id: String(activity.id),
          activity_type: activity.sport_type ?? activity.type,
          moving_minutes: Math.round(activity.moving_time / 60),
          distance_km: Math.round((activity.distance / 1000) * 10) / 10,
          activity_date: activity.start_date
        }
      });
      results.push(result);
    }

    const response = NextResponse.json({ ok: true, activitiesChecked: activities.length, results });
    if (refreshed) {
      response.cookies.set(STRAVA_ACCESS_COOKIE, refreshed.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.max(60, refreshed.expires_at - Math.floor(Date.now() / 1000))
      });
      response.cookies.set(STRAVA_REFRESH_COOKIE, refreshed.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Synchronisation Strava impossible."
    }, { status: 400 });
  }
}

