import type { StravaClientConfig, StravaConnectionStatus } from "./types";

export function getStravaConfig(): StravaClientConfig {
  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri: process.env.STRAVA_REDIRECT_URI
  };
}

export function getStravaConnectionStatus(): StravaConnectionStatus {
  const config = getStravaConfig();
  return config.clientId && config.clientSecret && config.redirectUri ? "ready" : "not_configured";
}

export function buildStravaAuthorizeUrl() {
  const config = getStravaConfig();
  if (!config.clientId || !config.redirectUri) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all"
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
