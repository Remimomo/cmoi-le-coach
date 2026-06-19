import { NextResponse } from "next/server";
import { callEnterpriseRpc } from "@/services/enterprise";

export async function POST() {
  try {
    const result = await callEnterpriseRpc("leave_current_company");
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Impossible de quitter l'entreprise."
    }, { status: 400 });
  }
}

