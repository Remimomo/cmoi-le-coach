import { getAuthCookies } from "@/lib/authSession";
import { getSupabaseUser, type AuthUser } from "@/services/supabaseAuth";

type RpcOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
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

export async function getConnectedEnterpriseUser(): Promise<{ user: AuthUser; accessToken: string }> {
  const { accessToken } = await getAuthCookies();
  const user = await getSupabaseUser(accessToken);

  if (!accessToken || !user?.id) {
    throw new Error("Utilisateur non connecté.");
  }

  return { user, accessToken };
}

export async function callEnterpriseRpc<T>(name: string, options: RpcOptions = {}): Promise<T> {
  const { accessToken } = await getConnectedEnterpriseUser();
  const { url, anonKey } = getSupabaseConfig();
  const method = options.method ?? "POST";
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Action entreprise impossible.");
  }

  return response.json() as Promise<T>;
}

