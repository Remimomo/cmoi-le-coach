import { NextResponse } from "next/server";
import { updateSupabasePassword } from "@/services/supabaseAuth";

export async function POST(request: Request) {
  try {
    const { accessToken, password } = (await request.json()) as {
      accessToken?: string;
      password?: string;
    };

    if (!accessToken || !password || password.length < 6) {
      return NextResponse.json({ error: "Nouveau mot de passe de 6 caractères minimum requis." }, { status: 400 });
    }

    await updateSupabasePassword(accessToken, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Modification du mot de passe impossible." },
      { status: 500 }
    );
  }
}
