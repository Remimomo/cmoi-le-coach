import { NextResponse } from "next/server";
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/authSession";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_ACCESS_COOKIE);
  response.cookies.delete(AUTH_REFRESH_COOKIE);
  return response;
}
