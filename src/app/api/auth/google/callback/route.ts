import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { applySessionCookie } from "@/lib/auth";
import {
  completeGoogleCustomer,
  googleCallbackUrl,
  googleConfigured,
  googleProfileFromCode,
  oauthStateCookieName,
  safeNext,
  sessionToken,
  verifyOAuthState,
} from "@/lib/google-oauth";
import { withPhoneGate } from "@/lib/phone";

function redirectLogin(origin: string, next: string, error: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return clearOAuthState(NextResponse.redirect(url));
}

function clearOAuthState<T extends NextResponse>(response: T) {
  response.cookies.set(oauthStateCookieName, "", { path: "/", maxAge: 0 });
  response.cookies.delete(oauthStateCookieName);
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const jar = await cookies();
  const stateCookie = jar.get(oauthStateCookieName)?.value;

  const verified = await verifyOAuthState(url.searchParams.get("state") || stateCookie);
  const next = verified?.next ?? "/";

  if (!googleConfigured()) {
    return clearOAuthState(NextResponse.redirect(new URL(`/login/google?next=${encodeURIComponent(next)}`, origin)));
  }
  if (url.searchParams.get("error")) {
    return redirectLogin(origin, next, "google");
  }
  const code = url.searchParams.get("code");
  if (!code || !verified) return redirectLogin(origin, next, "google");

  const profile = await googleProfileFromCode({ code, redirectUri: googleCallbackUrl(req) });
  if (!profile) return redirectLogin(origin, next, "google");

  const result = await completeGoogleCustomer(profile);
  if ("error" in result) {
    return redirectLogin(origin, next, result.error === "partner" ? "google_partner" : "google");
  }
  const token = await sessionToken(result.session);
  return applySessionCookie(
    clearOAuthState(NextResponse.redirect(new URL(withPhoneGate(next, result.phone, result.session.role), origin))),
    token,
  );
}
