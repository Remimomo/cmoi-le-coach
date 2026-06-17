export type AuthMode = "signup" | "login";

export type AuthUser = {
  id: string;
  email?: string;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: AuthUser;
  error?: string;
  error_description?: string;
  message?: string;
  msg?: string;
};

function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error("Supabase n'est pas encore configuré.");
  }

  const url = rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/auth\/v1\/?$/i, "")
    .replace(/\/+$/g, "");

  return { url, anonKey };
}

async function callSupabaseAuth(path: string, body: Record<string, unknown>) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = (await response.json()) as SupabaseAuthResponse;
  if (!response.ok) {
    throw new Error(data.message || data.msg || data.error_description || data.error || "Erreur d'authentification.");
  }

  return data;
}

export async function authenticateWithEmail(mode: AuthMode, email: string, password: string) {
  if (mode === "signup") {
    return callSupabaseAuth("signup", { email, password });
  }

  return callSupabaseAuth("token?grant_type=password", { email, password });
}

export async function getSupabaseUser(accessToken?: string): Promise<AuthUser | null> {
  if (!accessToken) return null;

  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) return null;
  const user = (await response.json()) as AuthUser;
  return user;
}
