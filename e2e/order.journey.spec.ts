import { expect, test } from "@playwright/test";
import {
  DEMO_SLUG,
  credentials,
  expectNoSsrErrorPage,
  gotoChecked,
  loginWith,
  seedDeliveryLocation,
} from "./support/app";

/**
 * Order-flow scaffold: homepage → restaurant → cart → checkout start →
 * restaurant accept.
 *
 * Deliberately stops *before* paying: the freeze has Stripe Live blocked and the
 * gate must not create charges. It therefore needs demo credentials and a
 * seeded database, and is not part of the production smoke.
 *
 *   E2E_CUSTOMER_EMAIL=kunde@lieferway.de   E2E_CUSTOMER_PASSWORD=…
 *   E2E_RESTAURANT_EMAIL=restaurant@lieferway.de E2E_RESTAURANT_PASSWORD=…
 */
const customer = credentials("customer");
const restaurant = credentials("restaurant");

test.describe("customer order journey", () => {
  test.skip(
    !customer,
    "set E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD to run the customer journey",
  );

  test.beforeEach(async ({ context, baseURL }) => {
    await seedDeliveryLocation(context, baseURL!);
  });

  test("homepage → restaurant → cart → checkout start", async ({ page }) => {
    await test.step("sign in as the demo customer", async () => {
      await loginWith(page, customer!.email, customer!.password);
    });

    const slug = await test.step("homepage lists restaurants", async () => {
      await gotoChecked(page, "/");
      const card = page.locator("#restaurants").locator(`a[href="/${DEMO_SLUG}"]`).first();
      const fallback = page.locator("#restaurants").locator('a[href^="/"]').first();
      const target = (await card.count()) > 0 ? card : fallback;
      await expect(target).toBeVisible();
      const href = await target.getAttribute("href");
      await target.click();
      return (href ?? `/${DEMO_SLUG}`).replace(/^\//, "");
    });

    const dish = await test.step("restaurant page shows the menu", async () => {
      await page.waitForURL(new RegExp(`/${slug}$`));
      await expectNoSsrErrorPage(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const addButton = page.getByRole("button", { name: "Hinzufügen" }).first();
      await expect(addButton).toBeVisible();
      const name = await addButton
        .locator("xpath=ancestor::*[self::li or self::article or self::div][1]")
        .innerText();
      await addButton.click();
      return name.split("\n")[0]?.trim() ?? "";
    });

    await test.step("cart holds the dish", async () => {
      await gotoChecked(page, "/cart");
      const cart = page.locator("main");
      await expect(cart).toBeVisible();
      if (dish) await expect(cart).toContainText(dish.slice(0, 24));
      await expect(cart.getByText("Speisen", { exact: true }).first()).toBeVisible();
      await expect(cart.getByRole("link", { name: "Zur Kasse" }).first()).toBeVisible();
    });

    await test.step("checkout starts (no payment submitted)", async () => {
      await page.locator("main").getByRole("link", { name: "Zur Kasse" }).first().click();
      await page.waitForURL(/\/checkout|\/account\/phone/);
      await expectNoSsrErrorPage(page);

      if (page.url().includes("/account/phone")) {
        test.info().annotations.push({
          type: "note",
          description: "checkout required phone capture first — demo user has no phone",
        });
        return;
      }

      // The place-order CTA must be reachable, but the gate never clicks it.
      await expect(page.getByRole("button", { name: /Bestellung aufgeben/i }).first()).toBeVisible();
    });
  });
});

test.describe("restaurant accept", () => {
  test.skip(
    !restaurant,
    "set E2E_RESTAURANT_EMAIL / E2E_RESTAURANT_PASSWORD to run the kitchen step",
  );

  test("kitchen board accepts a placed order", async ({ page }) => {
    await loginWith(page, restaurant!.email, restaurant!.password, "/restaurant");
    await gotoChecked(page, "/restaurant");

    const incoming = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Neue Bestellung" }) })
      .first();
    const kitchen = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "In der Küche" }) })
      .first();
    await expect(incoming).toBeVisible();

    const ticket = incoming.locator("article").first();
    if ((await ticket.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "no PLACED order on the kitchen board — accept step skipped",
      });
      test.skip(true, "no PLACED order available to accept");
      return;
    }

    const shortCode = (await ticket.innerText()).match(/\bLW-\d+\b/)?.[0];
    expect(shortCode, "could not read the order short code from the ticket").toBeTruthy();

    // Accept is two-step: the CTA swaps the card actions for the prep-time picker.
    await ticket.getByRole("button", { name: "Annehmen" }).click();
    await ticket.getByLabel("Manuell").first().fill("20");
    await ticket.getByRole("button", { name: "Annehmen" }).click();

    await expect(kitchen).toContainText(shortCode!, { timeout: 30_000 });
    await expect(incoming.getByText(shortCode!)).toHaveCount(0);
    await expectNoSsrErrorPage(page);
  });
});
