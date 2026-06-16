import { NextResponse } from "next/server";
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, getAuthCookieOptions } from "@/lib/authSession";
import { authenticateWithEmail } from "@/services/supabaseAuth";

export async function POST(request: Request) {
  try {
    const { email, password, mode } = (await request.json()) as {
      email?: string;
      password?: string;
      mode?: "signup" | "login";
    };

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Email et mot de passe de 6 caractères minimum requis." }, { status: 400 });
    }

    const result = await authenticateWithEmail(mode ?? "login", email, password);
    const response = NextResponse.json({ user: result.user ?? null });

    if (result.access_token) {
      response.cookies.set(AUTH_ACCESS_COOKIE, result.access_token, getAuthCookieOptions(result.expires_in ?? 3600));
    }
    if (result.refresh_token) {
      response.cookies.set(AUTH_REFRESH_COOKIE, result.refresh_token, getAuthCookieOptions(60 * 60 * 24 * 30));
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion impossible pour le moment." },
      { status: 500 }
    );
  }
}
