import { getGarminConfig, getGarminConnectionStatus } from "./config";
import type { GarminHealthSummary } from "./types";

export async function getOfficialGarminSummary(): Promise<GarminHealthSummary | null> {
  const status = getGarminConnectionStatus();
  if (status !== "ready") return null;

  const config = getGarminConfig();

  // Placeholder volontaire : Garmin fournit les endpoints exacts, les clés,
  // la méthode de consentement utilisateur et les webhooks après validation
  // dans le Garmin Connect Developer Program.
  void config;

  return null;
}
