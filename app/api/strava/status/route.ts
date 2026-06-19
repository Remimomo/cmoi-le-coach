import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildStravaAuthorizeUrl, getStravaConnectionStatus } from "@/services/strava";

const STRAVA_REFRESH_COOKIE = "cmoi_strava_refresh";

export async function GET() {
  const cookieStore = await cookies();
  const configuredStatus = getStravaConnectionStatus();
  const isConnected = Boolean(cookieStore.get(STRAVA_REFRESH_COOKIE)?.value);
  const status = configuredStatus === "ready" && isConnected ? "connected" : configuredStatus;

  return NextResponse.json({
    status,
    authorizeUrl: status === "connected" ? null : buildStravaAuthorizeUrl(),
    message:
      status === "connected"
        ? "Strava est connecté. Les dernières activités peuvent être récupérées."
        : status === "ready"
        ? "Strava est configuré. Tu peux connecter ton compte Strava."
        : "Strava n'est pas encore configuré. Il faudra créer une application Strava et ajouter les clés sur Vercel."
  });
}
