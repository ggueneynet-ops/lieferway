import { expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Shared helpers for the release-gate browser suite.
 *
 * Cookie names mirror `src/lib/constants.ts`; the SSR marketplace only lists
 * restaurants once an explicit delivery location exists
 * (`isActiveDeliveryLocation`), so every public test seeds one first.
 */

export const COOKIES = {
  plz: "lw_plz",
  city: "lw_city",
  street: "lw_street",
  lat: "lw_lat",
  lng: "lw_lng",
  km: "lw_km",
  geoSource: "lw_geo_source",
  splash: "lw_splash_shown",
  locale: "lieferway_language",
} as const;

/**
 * Frankfurt-Sachsenhausen — the seeded demo restaurants deliver here.
 * Note: `DEFAULT_DEMO_PLZ` (64732 Bad König) has no seeded coverage, which is
 * the marketplace gap tracked in docs/stabilization/feature-inventory.md.
 */
export const DEMO_PLACE = {
  plz: "60594",
  city: "Sachsenhausen",
  lat: 50.1062,
  lng: 8.6868,
  km: 10,
} as const;

export const DEMO_SLUG = process.env.QA_SMOKE_SLUG?.trim() || "anadolu-grill";

/** Markers of `src/app/global-error.tsx` and Next.js' own server-error page. */
const SSR_ERROR_MARKERS = [
  "Seite konnte nicht geladen werden",
  "Application error: a server-side exception has occurred",
  "A server error occurred",
];

export async function seedDeliveryLocation(
  context: BrowserContext,
  baseURL: string,
  place: typeof DEMO_PLACE = DEMO_PLACE,
) {
  const url = baseURL.replace(/\/$/, "");
  const entries: Array<[string, string]> = [
    [COOKIES.plz, place.plz],
    [COOKIES.city, place.city],
    [COOKIES.street, ""],
    [COOKIES.lat, String(place.lat)],
    [COOKIES.lng, String(place.lng)],
    [COOKIES.km, String(place.km)],
    [COOKIES.geoSource, "manual"],
    [COOKIES.splash, "1"],
    [COOKIES.locale, "de"],
  ];
  await context.addCookies(entries.map(([name, value]) => ({ name, value, url })));
}

/**
 * A protected Preview redirects to the Vercel SSO wall, which answers 200 with its
 * own HTML — without this check the suite would assert against Vercel's page.
 */
export async function expectAppNotProtectionWall(page: Page) {
  if (!/^https:\/\/vercel\.com\/(sso|login)/.test(page.url())) return;
  throw new Error(
    "Vercel Deployment Protection answered instead of the app. Set " +
      "VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Project → Settings → Deployment Protection → " +
      "Protection Bypass for Automation).",
  );
}

/**
 * Fails with the Next.js digest when a page fell through to the global error UI.
 * The digest is what ops correlates in Vercel Runtime Logs (docs/production-stability.md).
 */
export async function expectNoSsrErrorPage(page: Page) {
  const body = await page.locator("body").innerText();
  const marker = SSR_ERROR_MARKERS.find((m) => body.includes(m));
  if (!marker) return;
  const digest = body.match(/Digest\s*(\d{6,})/i)?.[1] ?? "unknown";
  throw new Error(
    `SSR error page at ${page.url()} — marker "${marker}", digest ${digest}. ` +
      "Search this digest in Vercel Runtime Logs.",
  );
}

export async function gotoChecked(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `no response for ${path}`).not.toBeNull();
  expect(response!.status(), `unexpected status for ${path}`).toBeLessThan(400);
  await expectAppNotProtectionWall(page);
  await expectNoSsrErrorPage(page);
  return response!;
}

/** Plain POST form login (`src/app/login/page.tsx` → `/login/submit`). */
export async function loginWith(page: Page, email: string, password: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  await expectAppNotProtectionWall(page);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 }),
    page.locator('form[action="/login/submit"] button[type="submit"]').click(),
  ]);
  await expectNoSsrErrorPage(page);
}

export function credentials(role: "customer" | "restaurant") {
  const prefix = role === "customer" ? "E2E_CUSTOMER" : "E2E_RESTAURANT";
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`]?.trim();
  if (!email || !password) return null;
  return { email, password };
}
