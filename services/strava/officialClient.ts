import { getStravaConfig } from "./config";
import type { StravaTokenResponse } from "./types";

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
