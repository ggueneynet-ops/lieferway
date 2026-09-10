import { headers } from "next/headers";

export async function publicOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!host) return env || "http://127.0.0.1:43123";
  const forwarded = h.get("x-forwarded-proto");
  const proto =
    forwarded ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}
