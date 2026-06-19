import { getStravaConfig } from "./config";
import type { StravaActivity, StravaTokenResponse } from "./types";

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const config = getStravaConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Strava n'est pas encore configuré.");
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error("Connexion Strava impossible pour le moment.");
  }

  return response.json();
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const config = getStravaConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Strava n'est pas encore configuré.");
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error("Rafraîchissement Strava impossible pour le moment.");
  }

  return response.json();
}

export async function getStravaActivities(accessToken: string, limit = 5): Promise<StravaActivity[]> {
  const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Lecture des activités Strava impossible pour le moment.");
  }

  return response.json();
}
