import { NextResponse } from "next/server";
import { getAuthCookies } from "@/lib/authSession";
import { getSupabaseUser } from "@/services/supabaseAuth";

export async function GET() {
  try {
    const { accessToken } = getAuthCookies();
    const user = await getSupabaseUser(accessToken);

    return NextResponse.json({
      configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      user
    });
  } catch {
    return NextResponse.json({
      configured: false,
      user: null
    });
  }
}
