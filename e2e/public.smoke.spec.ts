import { expect, test } from "@playwright/test";
import {
  DEMO_SLUG,
  expectNoSsrErrorPage,
  gotoChecked,
  seedDeliveryLocation,
} from "./support/app";

/**
 * Read-only public smoke. Runs against a Vercel Preview in the PR gate and
 * against production after deploy — so it must never mutate data, never log in
 * as staff, and never touch Stripe (Test or Live).
 */
test.describe("public smoke", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await seedDeliveryLocation(context, baseURL!);
  });

  test("health endpoint answers ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(
      body,
      "health did not answer JSON — a protected Preview needs VERCEL_AUTOMATION_BYPASS_SECRET",
    ).toContain('"ok"');
    expect(JSON.parse(body)).toMatchObject({ ok: true });
  });

  test("homepage renders the marketplace", async ({ page }) => {
    await gotoChecked(page, "/");

    const section = page.locator("#restaurants");
    await expect(section).toBeVisible();

    const cards = section.locator('a[href^="/"]');
    const softBanner = page.getByRole("status");

    // A DB blip degrades to the soft banner by design (docs/production-stability.md).
    // Either state is a pass; a thrown SSR error is not.
    await expect
      .poll(async () => (await cards.count()) > 0 || (await softBanner.count()) > 0, {
        message: "neither restaurant cards nor the soft banner appeared",
      })
      .toBe(true);

    if ((await softBanner.count()) > 0) {
      test.info().annotations.push({
        type: "warning",
        description: `marketplace degraded to the soft banner: ${await softBanner.first().innerText()}`,
      });
    } else {
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });

  test("public restaurant page renders name and menu", async ({ page }) => {
    await gotoChecked(page, `/restaurants/${DEMO_SLUG}`);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main")).toContainText(/\d+\s*[–-]\s*\d+\s*Min\./);
    // At least one dish with an add button — an empty menu means the SSR include failed.
    await expect(page.getByRole("button", { name: "Hinzufügen" }).first()).toBeVisible();
  });

  test("vanity restaurant url renders the same page", async ({ page }) => {
    await gotoChecked(page, `/${DEMO_SLUG}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("search page renders", async ({ page }) => {
    await gotoChecked(page, "/suchen");
    await expect(page.locator("main")).toBeVisible();
  });

  test("login page renders the credential form", async ({ page }) => {
    await gotoChecked(page, "/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("legal pages render", async ({ page }) => {
    for (const path of ["/impressum", "/datenschutz", "/agb"]) {
      await gotoChecked(page, path);
      await expect(page.locator("main")).toBeVisible();
      await expectNoSsrErrorPage(page);
    }
  });
});
