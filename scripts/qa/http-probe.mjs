#!/usr/bin/env node
/**
 * Read-only HTTP smoke probe for a Lieferway deployment (Preview or Production).
 *
 * GET only — it never places an order, never touches Stripe, and never posts to
 * an API. Safe against Production because it cannot mutate anything.
 *
 *   node scripts/qa/http-probe.mjs --base-url=https://app.lieferway.de
 *   BASE_URL=... node scripts/qa/http-probe.mjs --slug=anadolu-grill
 *
 * Exit code 0 = all probes passed. Non-zero = at least one probe failed.
 */

const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, "").split("=");
      return [k, rest.join("=") || "true"];
    }),
);

const baseUrl = (
  args.get("base-url") ??
  process.env.BASE_URL ??
  process.env.PREVIEW_URL ??
  ""
)
  .trim()
  .replace(/\/$/, "");

if (!baseUrl) {
  console.error("[probe] missing --base-url (or BASE_URL / PREVIEW_URL)");
  process.exit(2);
}
if (!/^https?:\/\//.test(baseUrl)) {
  console.error(`[probe] base url must start with http(s)://  got: ${baseUrl}`);
  process.exit(2);
}

const slug = (args.get("slug") ?? process.env.QA_SMOKE_SLUG ?? "anadolu-grill").trim();
/** Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation. */
const bypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
const attempts = Number(args.get("attempts") ?? process.env.QA_PROBE_ATTEMPTS ?? 3);
const timeoutMs = Number(args.get("timeout-ms") ?? process.env.QA_PROBE_TIMEOUT_MS ?? 25_000);

/** Markers of `src/app/global-error.tsx` and the Next.js server-error page. */
const SSR_FAILURE_MARKERS = [
  "Seite konnte nicht geladen werden",
  "Application error: a server-side exception has occurred",
  "A server error occurred",
];

/** A Vercel SSO / password wall answers 200 with its own HTML, so every page probe
 *  asserts a Lieferway marker instead of trusting the status code. */
const probes = [
  { path: "/api/health", expect: 200, json: { ok: true }, label: "health" },
  { path: "/", expect: 200, contains: "Lieferway", label: "homepage" },
  { path: `/restaurants/${slug}`, expect: 200, contains: "Lieferway", label: "public restaurant (canonical)" },
  { path: `/${slug}`, expect: 200, contains: "Lieferway", label: "public restaurant (vanity)" },
  { path: "/suchen", expect: 200, contains: "Lieferway", label: "search" },
  { path: "/login", expect: 200, contains: "Lieferway", label: "login" },
  { path: "/impressum", expect: 200, contains: "Lieferway", label: "impressum" },
];

/** React splits `Digest {digest}` with comment markers, so match on stripped text. */
function digestFrom(body) {
  const text = body.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ");
  return (
    text.match(/Digest\s*[:#]?\s*(\d{6,})/i)?.[1] ??
    body.match(/digest["':\s]+(\d{6,})/i)?.[1] ??
    null
  );
}

/** The Vercel SSO wall — a protected Preview without a bypass secret lands here. */
function isProtectionWall(finalUrl, body) {
  if (/^https:\/\/vercel\.com\/(sso|login)/.test(finalUrl)) return true;
  return body.includes("_vercel_sso_nonce") || body.includes("Authentication Required");
}

async function fetchOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "lieferway-release-gate/1.0 (+docs/qa/release-gate.md)",
        "accept-language": "de-DE,de;q=0.9",
        ...(bypassSecret
          ? {
              "x-vercel-protection-bypass": bypassSecret,
              "x-vercel-set-bypass-cookie": "true",
            }
          : {}),
      },
    });
    const body = await res.text();
    return { status: res.status, body, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

async function runProbe(probe) {
  const url = `${baseUrl}${probe.path}`;
  let last = "unknown error";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { status, body, finalUrl } = await fetchOnce(url);
      if (isProtectionWall(finalUrl ?? url, body)) {
        return { ok: false, url, blocked: true, detail: "blocked by Vercel Deployment Protection" };
      }
      const problems = [];
      if (status !== probe.expect) problems.push(`status ${status} (want ${probe.expect})`);
      const plain = body.replace(/<!--.*?-->/g, "");
      const marker = SSR_FAILURE_MARKERS.find((m) => plain.includes(m));
      if (marker) {
        const digest = digestFrom(body);
        problems.push(`SSR error page${digest ? ` digest ${digest}` : ""}`);
      }
      if (probe.contains && !body.includes(probe.contains)) {
        problems.push(`body missing "${probe.contains}"`);
      }
      if (probe.json) {
        try {
          const parsed = JSON.parse(body);
          for (const [k, v] of Object.entries(probe.json)) {
            if (parsed[k] !== v) problems.push(`json ${k}=${JSON.stringify(parsed[k])} (want ${JSON.stringify(v)})`);
          }
        } catch {
          problems.push("body is not JSON");
        }
      }
      if (problems.length === 0) return { ok: true, url, detail: `${status}` };
      last = problems.join("; ");
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  return { ok: false, url, detail: last };
}

console.log(`[probe] GET-only smoke against ${baseUrl} (slug: ${slug}, attempts: ${attempts})`);

let failed = 0;
let blocked = false;
for (const probe of probes) {
  const result = await runProbe(probe);
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${probe.label.padEnd(30)} ${probe.path}  ${result.detail}`);
  if (!result.ok) failed += 1;
  if (result.blocked) blocked = true;
}

if (blocked) {
  console.error(
    "[probe] Vercel Deployment Protection answered instead of the app. Set " +
      "VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Project → Settings → Deployment Protection → " +
      "Protection Bypass for Automation) so the gate can reach protected Previews.",
  );
}
if (failed > 0) {
  console.error(`[probe] ${failed}/${probes.length} probe(s) failed`);
  process.exit(1);
}
console.log(`[probe] all ${probes.length} probes passed`);
