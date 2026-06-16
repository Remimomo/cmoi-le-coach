import { cookies } from "next/headers";

export const AUTH_ACCESS_COOKIE = "cmoi_auth_access";
export const AUTH_REFRESH_COOKIE = "cmoi_auth_refresh";

export function getAuthCookies() {
  const cookieStore = cookies();
  return {
    accessToken: cookieStore.get(AUTH_ACCESS_COOKIE)?.value,
    refreshToken: cookieStore.get(AUTH_REFRESH_COOKIE)?.value
  };
}

export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}
