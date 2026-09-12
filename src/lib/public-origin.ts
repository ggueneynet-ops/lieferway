import { headers } from "next/headers";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

/** Browser-facing origin for redirects from Route Handlers (never 0.0.0.0). */
export function requestOrigin(req: Request) {
  const url = new URL(req.url);
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host)
    .split(",")[0]
    .trim()
    .replace(/^0\.0\.0\.0/, "127.0.0.1");
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0].trim();
  return `${proto}://${host}`;
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
