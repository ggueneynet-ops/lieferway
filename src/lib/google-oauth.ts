import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, type SessionUser } from "@/lib/auth";
import type { Role } from "@/lib/constants";

const STATE_COOKIE = "lw_google_oauth";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function publicAppUrl(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host") || "";
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  if (host && !host.startsWith("127.0.0.1") && !host.startsWith("localhost")) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:43123").replace(/\/$/, "");
}

export function googleCallbackUrl(req: Request) {
  return `${publicAppUrl(req)}/api/auth/google/callback`;
}

export function safeNext(raw?: string | null) {
  const next = (raw ?? "/").trim() || "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith("/restaurant") || next.startsWith("/admin") || next.startsWith("/courier")) {
    return "/";
  }
  return next;
}

export async function signOAuthState(next: string) {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "lieferway-demo-secret-change-in-production");
  return new SignJWT({ next: safeNext(next), v: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyOAuthState(token: string | undefined) {
  if (!token) return null;
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "lieferway-demo-secret-change-in-production");
    const { payload } = await jwtVerify(token, secret);
    return { next: safeNext(typeof payload.next === "string" ? payload.next : "/") };
  } catch {
    return null;
  }
}

export function oauthStateCookie(token: string) {
  return {
    name: STATE_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  };
}

export const oauthStateCookieName = STATE_COOKIE;

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  locale?: string;
};

export async function completeGoogleCustomer(
  profile: GoogleProfile,
): Promise<{ error: "partner" | "email" } | { session: SessionUser }> {
  const email = profile.email.toLowerCase().trim();
  if (!email.includes("@")) return { error: "email" };

  const existing =
    (await prisma.user.findUnique({ where: { googleId: profile.sub } })) ??
    (await prisma.user.findUnique({ where: { email } }));

  if (existing) {
    if (existing.role !== "CUSTOMER") return { error: "partner" };
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        googleId: profile.sub,
        name: existing.name || profile.name,
      },
    });
    return {
      session: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        locale: user.locale,
      },
    };
  }

  const locale = profile.locale === "tr" || profile.locale === "en" || profile.locale === "de" ? profile.locale : "de";
  const user = await prisma.user.create({
    data: {
      email,
      name: profile.name.trim() || email.split("@")[0] || "Google",
      googleId: profile.sub,
      passwordHash: await hashPassword(`${crypto.randomUUID()}${crypto.randomUUID()}`),
      role: "CUSTOMER",
      locale,
    },
  });
  return {
    session: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "CUSTOMER",
      locale: user.locale,
    },
  };
}

export async function sessionToken(session: SessionUser) {
  return signToken(session);
}

export function googleAuthorizeUrl(opts: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function googleProfileFromCode(opts: {
  code: string;
  redirectUri: string;
}): Promise<GoogleProfile | null> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return null;
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return null;
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return null;
  const profile = (await userRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    locale?: string;
  };
  if (!profile.sub || !profile.email || profile.email_verified === false) return null;
  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name || profile.email.split("@")[0] || "Google",
    locale: profile.locale,
  };
}
