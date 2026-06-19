import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/services/supabaseAuth";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Indique ton email pour recevoir le lien." }, { status: 400 });
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail(email, `${origin}/compte`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email de réinitialisation impossible pour le moment." },
      { status: 500 }
    );
  }
}
