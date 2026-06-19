import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStravaActivities, refreshStravaToken } from "@/services/strava";
import { saveUserAppData } from "@/services/supabaseData";

const STRAVA_ACCESS_COOKIE = "cmoi_strava_access";
const STRAVA_REFRESH_COOKIE = "cmoi_strava_refresh";

function stravaCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}

function summarizeActivity(activity: Awaited<ReturnType<typeof getStravaActivities>>[number]) {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.sport_type ?? activity.type,
    distanceKm: Math.round((activity.distance / 1000) * 10) / 10,
    movingMinutes: Math.round(activity.moving_time / 60),
    startDate: activity.start_date,
    averageHeartrate: activity.average_heartrate ?? null,
    elevationGain: activity.total_elevation_gain ?? null
  };
}

async function saveStravaSync(activities: ReturnType<typeof summarizeActivity>[]) {
  await saveUserAppData({
    stravaData: {
      connected: true,
      activities,
      syncedAt: new Date().toISOString()
    }
  });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(STRAVA_ACCESS_COOKIE)?.value;
    const refreshToken = cookieStore.get(STRAVA_REFRESH_COOKIE)?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ ok: false, error: "Compte Strava non connecté." }, { status: 401 });
    }

    if (accessToken) {
      const activities = await getStravaActivities(accessToken);
      const summarized = activities.map(summarizeActivity);
      await saveStravaSync(summarized);
      return NextResponse.json({ ok: true, activities: summarized });
    }

    const refreshed = await refreshStravaToken(refreshToken as string);
    const activities = await getStravaActivities(refreshed.access_token);
    const summarized = activities.map(summarizeActivity);
    await saveStravaSync(summarized);
    const response = NextResponse.json({ ok: true, activities: summarized });

    response.cookies.set(
      STRAVA_ACCESS_COOKIE,
      refreshed.access_token,
      stravaCookieOptions(Math.max(60, refreshed.expires_at - Math.floor(Date.now() / 1000)))
    );
    response.cookies.set(STRAVA_REFRESH_COOKIE, refreshed.refresh_token, stravaCookieOptions(60 * 60 * 24 * 90));

    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Activités Strava indisponibles." },
      { status: 500 }
    );
  }
}
