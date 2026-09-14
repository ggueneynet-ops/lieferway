# QA / Release Gate

Nothing merges into `main` during the freeze unless the gate is green. The gate
is deliberately boring: it checks the same four things every time, and it checks
them against the artifact that actually ships (the PR's Vercel Preview).

**Stripe TEST only. No Live.** No workflow in this repo is allowed to hold a
Stripe secret, and the production smoke is GET-only by construction.

## Workflows

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/pr-gate.yml` | `pull_request` → `main`, `workflow_dispatch` | `Lint`, `Typecheck`, `CI build`, `Preview smoke` |
| `.github/workflows/post-deploy-smoke.yml` | successful Production `deployment_status`, `workflow_dispatch` | GET probe + public Playwright smoke against `app.lieferway.de` |

### Jobs in the PR gate

| Job | Command | Notes |
| --- | --- | --- |
| `Lint` | `npm run lint:gate` | ESLint regression gate (see below) |
| `Typecheck` | `npm run typecheck` | `next typegen && tsc --noEmit` — typegen is required, `PageProps`/`LayoutProps` are generated |
| `CI build` | `npm run build` against a throwaway Postgres service | runs `prisma migrate deploy` + seed, so a broken migration fails here instead of during a production deploy |
| `Preview smoke` | resolve Preview URL → `npm run qa:probe` → `npm run e2e:smoke` | read-only public checks in a real browser |

## Required checks (branch protection)

Settings → Branches → branch protection rule for `main`:

- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

Required check names (they must match the job `name:` values exactly):

```
Lint
Typecheck
CI build
Preview smoke
```

`Post-deploy production smoke` is **not** a required check — it runs after the
merge, and a red run means "roll back / hotfix", not "cannot merge".

## Secrets and variables

Nothing below is required for `Lint`, `Typecheck` or `CI build`. They matter only
for the smoke jobs.

| Name | Kind | Required | Purpose |
| --- | --- | --- | --- |
| `GITHUB_TOKEN` | automatic | — | reads the Vercel Preview deployment for the PR head SHA (`deployments: read`) |
| `VERCEL_TOKEN` | secret | optional | fallback Preview lookup via the Vercel REST API |
| `VERCEL_PROJECT_ID` | secret | optional | required with `VERCEL_TOKEN` |
| `VERCEL_TEAM_ID` | secret | optional | only for team-scoped Vercel projects |
| `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD` | secret | optional | demo customer for the opt-in order journey |
| `E2E_RESTAURANT_EMAIL` / `E2E_RESTAURANT_PASSWORD` | secret | optional | demo restaurant for the accept step |
| `PRODUCTION_URL` | variable | optional | defaults to `https://app.lieferway.de` |
| `QA_SMOKE_SLUG` | variable | optional | public restaurant probed by the smoke; defaults to `anadolu-grill` |

Preview URL resolution order (`scripts/qa/resolve-preview-url.mjs`):

1. `PREVIEW_URL` / `--url` (the `workflow_dispatch` input)
2. GitHub Deployments API for the PR head SHA — works with the automatic
   `GITHUB_TOKEN` as long as the Vercel GitHub integration is connected
3. Vercel REST API with `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`

If no Preview appears within 15 minutes the job fails: an unverified build is
not a passing gate.

## The lint gate

`npx eslint` currently reports 29 errors that the `eslint-config-next@16`
upgrade introduced (`react-hooks/set-state-in-effect`, `react-hooks/refs`,
`prefer-const`, …). Fixing them means editing working runtime code, which the
freeze forbids, so `npm run lint:gate` compares the report against
`qa/lint-baseline.json` (errors per file per rule) and fails only on
**regressions**. Warnings are counted, never gated.

```bash
npm run lint          # raw ESLint output, full detail
npm run lint:gate     # CI gate — fails on new errors only
npm run lint:baseline # refresh the baseline after a cleanup PR
```

The baseline is debt, not policy: every cleanup PR should shrink it, and the gate
prints the entries that are now clean so they can be locked in.

## Running the gate locally

```bash
npm ci
npm run lint:gate
npm run typecheck

# smoke any deployed URL (GET only)
npm run qa:probe -- --base-url=https://app.lieferway.de

# browser smoke
npm run e2e:install
BASE_URL=https://app.lieferway.de npm run e2e:smoke
```

Order journey (needs demo credentials and a **seeded, disposable** database — it
signs in and, in the accept step, mutates one order):

```bash
BASE_URL=http://127.0.0.1:43123 \
E2E_CUSTOMER_EMAIL=kunde@lieferway.de     E2E_CUSTOMER_PASSWORD=lieferway \
E2E_RESTAURANT_EMAIL=restaurant@lieferway.de E2E_RESTAURANT_PASSWORD=lieferway \
npm run e2e:journey
```

The journey covers homepage → restaurant → cart → **checkout start** →
restaurant accept. It stops before submitting payment on purpose; card entry and
Stripe capture stay manual (`docs/e2e-sandbox-report.md`, A–F).

HTML report: `qa/playwright-report` (`npm run e2e:report`), also uploaded as a
workflow artifact for 14 days.

## What the smoke asserts

`e2e/public.smoke.spec.ts`, all read-only:

- `/api/health` returns `{ ok: true }`
- homepage renders the `#restaurants` section with cards — or the documented soft
  banner, which is the intended degraded state (`docs/production-stability.md`)
- `/restaurants/<slug>` and `/<slug>` render an `h1`, the ETA fact chip and at
  least one `Hinzufügen` button (an empty menu means the SSR include failed)
- `/suchen`, `/login`, `/impressum`, `/datenschutz`, `/agb` render
- no page falls through to `global-error.tsx`; when one does, the failure message
  carries the **digest** to search in Vercel Runtime Logs

The smoke seeds delivery-location cookies (`lw_plz` … `lw_geo_source=manual`)
because the marketplace only lists restaurants for an explicit location. It uses
`60594` Sachsenhausen — the demo restaurants deliver there, unlike the
`DEFAULT_DEMO_PLZ` `64732`.

## Adding a check

1. Add the npm script.
2. Add a job to `pr-gate.yml` with a stable `name:`.
3. Add that name to the required checks list above **and** in branch protection.

A check that is not in branch protection is decoration, not a gate.
