export type StravaConnectionStatus = "not_configured" | "ready" | "connected";

export type StravaClientConfig = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
};

export type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
  };
};

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
};
