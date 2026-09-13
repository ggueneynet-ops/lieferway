import { jwtVerify } from "jose";
import { AUTH_COOKIE, type Role } from "@/lib/constants";

const FALLBACK_AUTH_SECRET = "lieferway-demo-secret-change-in-production";

export type EdgeSession = {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
};

/** Edge-safe secret bytes (Web Crypto when AUTH_SECRET is short). */
async function authSecretBytes() {
  const value = process.env.AUTH_SECRET?.trim() || FALLBACK_AUTH_SECRET;
  const encoded = new TextEncoder().encode(value);
  if (encoded.byteLength >= 32) return encoded;
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(digest);
}

export async function verifySessionToken(token: string): Promise<EdgeSession | null> {
  try {
    const { payload } = await jwtVerify(token, await authSecretBytes());
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

export { AUTH_COOKIE };
