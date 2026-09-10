import { headers } from "next/headers";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isLoopbackOrigin(origin: string) {
  return /localhost|127\.0\.0\.1/i.test(origin);
}

/**
 * Canonical public origin for vanity URLs and QR codes.
 * Prefer NEXT_PUBLIC_APP_URL when it is a public host (lieferway.de or the demo tunnel).
 */
export async function publicOrigin() {
  const env = stripSlash(process.env.NEXT_PUBLIC_APP_URL ?? "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const forwarded = h.get("x-forwarded-proto");
  const fromRequest = host
    ? stripSlash(
        `${forwarded || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`,
      )
    : "";

  if (env && !isLoopbackOrigin(env)) return env;
  if (fromRequest && !isLoopbackOrigin(fromRequest)) return fromRequest;
  return env || fromRequest || "http://127.0.0.1:43123";
}
