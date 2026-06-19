import { NextResponse } from "next/server";
import { callEnterpriseRpc } from "@/services/enterprise";

export async function POST() {
  try {
    const report = await callEnterpriseRpc("generate_company_monthly_report");
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Rapport mensuel indisponible."
    }, { status: 403 });
  }
}

