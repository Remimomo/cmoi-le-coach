import { NextResponse } from "next/server";
import { callEnterpriseRpc } from "@/services/enterprise";

export async function GET() {
  try {
    const dashboard = await callEnterpriseRpc("get_company_challenge_dashboard");
    return NextResponse.json({ ok: true, dashboard });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Challenge indisponible."
    }, { status: 200 });
  }
}

