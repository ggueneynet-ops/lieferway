import { defineConfig, devices } from "@playwright/test";

/**
 * Release-gate browser suite. There is no local webServer on purpose: every run
 * targets an already-deployed URL (Vercel Preview in the PR gate, production in
 * the post-deploy smoke) so we test the same artifact that ships.
 *
 * BASE_URL / PREVIEW_URL selects the target. See docs/qa/release-gate.md.
 */
const baseURL = (
  process.env.BASE_URL ??
  process.env.PREVIEW_URL ??
  "http://127.0.0.1:43123"
).replace(/\/$/, "");

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "qa/playwright-artifacts",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [
        ["list"],
        ["github"],
        ["html", { outputFolder: "qa/playwright-report", open: "never" }],
      ]
    : [["list"], ["html", { outputFolder: "qa/playwright-report", open: "never" }]],
  use: {
    baseURL,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "smoke",
      testMatch: /.*\.smoke\.spec\.ts/,
    },
    {
      name: "journey",
      testMatch: /.*\.journey\.spec\.ts/,
    },
  ],
});
