import { NextResponse } from "next/server";
import { buildStravaAuthorizeUrl, getStravaConnectionStatus } from "@/services/strava";

export async function GET() {
  const status = getStravaConnectionStatus();

  return NextResponse.json({
    status,
    authorizeUrl: buildStravaAuthorizeUrl(),
    message:
      status === "ready"
        ? "Strava est configuré. Tu peux connecter ton compte Strava."
        : "Strava n'est pas encore configuré. Il faudra créer une application Strava et ajouter les clés sur Vercel."
  });
}
