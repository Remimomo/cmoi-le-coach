import { NextResponse } from "next/server";
import { readUserAppData, saveUserAppData, type UserAppData } from "@/services/supabaseData";

export async function GET() {
  try {
    const result = await readUserAppData();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Chargement impossible." },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as UserAppData;
    await saveUserAppData(data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sauvegarde impossible." },
      { status: 500 }
    );
  }
}
