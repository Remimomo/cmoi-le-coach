export type GarminConnectionStatus = "mock" | "needs_partner_access" | "ready";

export type GarminActivity = {
  id: string;
  type: string;
  startedAt: string;
  duration: string;
  intensity: string;
};

export type GarminHealthSummary = {
  sleep: string;
  sleepQuality: string;
  restingHeartRate: string;
  stress: string;
  recovery: string;
  bodyBattery: string;
  activities: GarminActivity[];
};

export type GarminClientConfig = {
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
  apiBaseUrl: string;
};
