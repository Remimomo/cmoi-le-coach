import { NextResponse } from "next/server";
import { callEnterpriseRpc } from "@/services/enterprise";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      activityType?: string;
      minutes?: number;
      activityDate?: string;
    };
    const result = await callEnterpriseRpc("declare_manual_activity_points", {
      body: {
        activity_type: body.activityType ?? "séance libre",
        minutes: Number(body.minutes ?? 20),
        activity_date: body.activityDate ?? new Date().toISOString()
      }
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Déclaration impossible."
    }, { status: 400 });
  }
}

