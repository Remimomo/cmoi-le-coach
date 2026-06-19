import { NextResponse } from "next/server";
import { callEnterpriseRpc } from "@/services/enterprise";

export async function GET() {
  try {
    const adminDashboard = await callEnterpriseRpc("get_company_admin_dashboard");
    return NextResponse.json({ ok: true, adminDashboard });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Accès admin entreprise indisponible."
    }, { status: 403 });
  }
}

