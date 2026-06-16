export type StravaConnectionStatus = "not_configured" | "ready";

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
