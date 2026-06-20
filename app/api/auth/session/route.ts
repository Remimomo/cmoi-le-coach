import { NextResponse } from "next/server";
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, getAuthCookieOptions, getAuthCookies } from "@/lib/authSession";
import { getSupabaseUser, refreshSupabaseSession } from "@/services/supabaseAuth";

export async function GET() {
  try {
    const { accessToken, refreshToken } = await getAuthCookies();
    const user = await getSupabaseUser(accessToken);

    if (user?.id) {
      return NextResponse.json({
        configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
        user
      });
    }

    if (refreshToken) {
      const refreshed = await refreshSupabaseSession(refreshToken);
      const refreshedUser = refreshed.user ?? await getSupabaseUser(refreshed.access_token);
      const response = NextResponse.json({
        configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
        user: refreshedUser ?? null
      });

      if (refreshed.access_token) {
        response.cookies.set(AUTH_ACCESS_COOKIE, refreshed.access_token, getAuthCookieOptions(refreshed.expires_in ?? 3600));
      }
      if (refreshed.refresh_token) {
        response.cookies.set(AUTH_REFRESH_COOKIE, refreshed.refresh_token, getAuthCookieOptions(60 * 60 * 24 * 30));
      }

      return response;
    }

    return NextResponse.json({
      configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      user: null
    });
  } catch {
    return NextResponse.json({
      configured: false,
      user: null
    });
  }
}
