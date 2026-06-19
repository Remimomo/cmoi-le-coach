import { NextResponse } from "next/server";
import { callEnterpriseRpc } from "@/services/enterprise";

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };
    const dashboard = await callEnterpriseRpc("join_company_by_code", {
      body: { invite_code: code?.trim() ?? "" }
    });

    return NextResponse.json({ ok: true, dashboard });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Code entreprise invalide."
    }, { status: 400 });
  }
}

