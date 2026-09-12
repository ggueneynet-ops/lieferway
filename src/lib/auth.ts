import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { AUTH_COOKIE, type Role } from "./constants";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
};

const FALLBACK_AUTH_SECRET = "lieferway-demo-secret-change-in-production";

/** HS256 needs ≥ 32 bytes. Short AUTH_SECRET values are stretched, not rejected. */
export function authSecretBytes() {
  const value = process.env.AUTH_SECRET?.trim() || FALLBACK_AUTH_SECRET;
  const encoded = new TextEncoder().encode(value);
  if (encoded.byteLength >= 32) return encoded;
  return createHash("sha256").update(value).digest();
}

function secret() {
  return authSecretBytes();
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export function logSafeError(scope: string, err: unknown) {
  const name = err instanceof Error ? err.name : typeof err;
  const raw = err instanceof Error ? err.message : String(err);
  const message = raw.replace(
    /(AUTH_SECRET|password|passwd|token|bearer|authorization|secret|cookie)=?[^\s,;]*/gi,
    "[redacted]",
  );
  console.error(`[${scope}] ${name}: ${message}`);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    locale: user.locale,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .setSubject(user.id)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      id: payload.sub,
      email: String(payload.email),
      name: String(payload.name ?? ""),
      role: payload.role as Role,
      locale: String(payload.locale ?? "de"),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    const headerList = await headers();
    const auth = headerList.get("authorization");
    if (auth?.startsWith("Bearer ")) token = auth.slice(7);
  }
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(roles?: Role[]) {
  const session = await getSession();
  if (!session) {
    const error = new Error("UNAUTHENTICATED");
    throw error;
  }
  if (roles && !roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/** Attach the session cookie to the Response a Route Handler returns. */
export function applySessionCookie<T extends NextResponse>(response: T, token: string) {
  response.cookies.set(AUTH_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}

export function applyClearedSessionCookie<T extends NextResponse>(response: T) {
  response.cookies.set(AUTH_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

/** Server Actions only. Route Handlers must use applySessionCookie on the returned NextResponse. */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  cookieStore.delete(AUTH_COOKIE);
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    locale: user.locale,
  };
  return session;
}
