import { getAuthCookies } from "@/lib/authSession";
import { getSupabaseUser, type AuthUser } from "@/services/supabaseAuth";

export type UserAppData = {
  profile?: unknown;
  readiness?: unknown;
  garminData?: unknown;
  planner?: unknown;
  currentProgram?: unknown;
  history?: unknown;
  memory?: unknown;
};

type UserAppDataRow = {
  user_id: string;
  profile: unknown;
  readiness: unknown;
  garmin_data: unknown;
  planner: unknown;
  current_program: unknown;
  history: unknown;
  memory: unknown;
  updated_at: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEmptyValue(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

function mergeObjectWithoutEmpty(existing: unknown, incoming: unknown) {
  if (!isPlainObject(existing) && !isPlainObject(incoming)) return {};

  const merged: Record<string, unknown> = isPlainObject(existing) ? { ...existing } : {};

  if (!isPlainObject(incoming)) return merged;

  Object.entries(incoming).forEach(([key, value]) => {
    if (isEmptyValue(value)) return;
    merged[key] = value;
  });

  return merged;
}

function pickField(incoming: unknown, existing: unknown, fallback: unknown) {
  return incoming === undefined ? existing ?? fallback : incoming;
}

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

async function getConnectedUser(): Promise<{ user: AuthUser; accessToken: string }> {
  const { accessToken } = getAuthCookies();
  const user = await getSupabaseUser(accessToken);

  if (!accessToken || !user?.id) {
    throw new Error("Utilisateur non connecté.");
  }

  return { user, accessToken };
}

export async function readUserAppData() {
  const { user, accessToken } = await getConnectedUser();
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/user_app_data?user_id=eq.${user.id}&select=*`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Lecture des données utilisateur impossible.");
  }

  const rows = (await response.json()) as UserAppDataRow[];
  const row = rows[0];

  if (!row) {
    return { user, data: null };
  }

  return {
    user,
    data: {
      profile: row.profile,
      readiness: row.readiness,
      garminData: row.garmin_data,
      planner: row.planner,
      currentProgram: row.current_program,
      history: row.history,
      memory: row.memory,
      updatedAt: row.updated_at
    }
  };
}

export async function saveUserAppData(data: UserAppData) {
  const { user, accessToken } = await getConnectedUser();
  const { url, anonKey } = getSupabaseConfig();
  const existingResponse = await fetch(`${url}/rest/v1/user_app_data?user_id=eq.${user.id}&select=*`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });
  const existingRows = existingResponse.ok ? ((await existingResponse.json()) as UserAppDataRow[]) : [];
  const existing = existingRows[0];

  const response = await fetch(`${url}/rest/v1/user_app_data?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      user_id: user.id,
      profile: mergeObjectWithoutEmpty(existing?.profile, data.profile),
      readiness: mergeObjectWithoutEmpty(existing?.readiness, data.readiness),
      garmin_data: mergeObjectWithoutEmpty(existing?.garmin_data, data.garminData),
      planner: mergeObjectWithoutEmpty(existing?.planner, data.planner),
      current_program: pickField(data.currentProgram, existing?.current_program, []),
      history: pickField(data.history, existing?.history, []),
      memory: mergeObjectWithoutEmpty(existing?.memory, data.memory)
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Sauvegarde des données utilisateur impossible.");
  }

  return response.json();
}
