import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import {
  completeGoogleCustomer,
  googleConfigured,
  safeNext,
  sessionToken,
} from "@/lib/google-oauth";

export async function POST(req: Request) {
  if (googleConfigured()) {
    return NextResponse.redirect(new URL("/api/auth/google", req.url), 303);
  }
  const form = await req.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  const email = String(form.get("email") ?? "")
    .toLowerCase()
    .trim();
  const name = String(form.get("name") ?? "").trim() || "Google Kunde";
  if (!email.endsWith("@gmail.com")) {
    const url = new URL("/login/google", req.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "gmail");
    return NextResponse.redirect(url, 303);
  }

  const result = await completeGoogleCustomer({
    sub: `dev-google:${email}`,
    email,
    name,
    locale: "de",
  });
  if ("error" in result) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", result.error === "partner" ? "google_partner" : "google");
    return NextResponse.redirect(url, 303);
  }
  await setSessionCookie(await sessionToken(result.session));
  return NextResponse.redirect(new URL(next, req.url), 303);
}
