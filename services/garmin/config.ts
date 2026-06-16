import type { GarminClientConfig, GarminConnectionStatus } from "./types";

export function getGarminConfig(): GarminClientConfig {
  return {
    clientId: process.env.GARMIN_CLIENT_ID,
    clientSecret: process.env.GARMIN_CLIENT_SECRET,
    webhookSecret: process.env.GARMIN_WEBHOOK_SECRET,
    apiBaseUrl: process.env.GARMIN_API_BASE_URL ?? "https://apis.garmin.com"
  };
}

export function getGarminConnectionStatus(): GarminConnectionStatus {
  const config = getGarminConfig();
  if (config.clientId && config.clientSecret) return "ready";
  return "needs_partner_access";
}
