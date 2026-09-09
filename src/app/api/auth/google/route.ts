import { NextResponse } from "next/server";
import {
  googleAuthorizeUrl,
  googleCallbackUrl,
  googleConfigured,
  oauthStateCookie,
  safeNext,
  signOAuthState,
} from "@/lib/google-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const state = await signOAuthState(next);
  const dest = googleConfigured()
    ? googleAuthorizeUrl({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        redirectUri: googleCallbackUrl(req),
        state,
      })
    : new URL(`/login/google?next=${encodeURIComponent(next)}`, url.origin).toString();

  const res = NextResponse.redirect(dest);
  const cookie = oauthStateCookie(state);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return res;
}
