# Lieferway feature inventory (freeze — refreshed 2026-09-14)

Feature development frozen. Status: **OK** | **BUG** | **NOT TESTED**.  
Severity when BUG: **P0** (blocks core money/ops) · **P1** (broken important path) · **P2** (polish / edge).

Evidence: production probes + browser checks on 2026-09-13 / 2026-09-14 (Anadolu Grill / `restaurant@lieferway.de`), prior E2E sandbox PR #27 (scripts only), and live user reports.  
Verification from here on runs through the QA/Release Gate — see [docs/qa/release-gate.md](../qa/release-gate.md).

## Open digests

The Next.js global error page shows a digest; that number is the search key in
Vercel Runtime Logs (`docs/production-stability.md`).

| Digest | Route | Status | Sev | Note |
|--------|-------|--------|-----|------|
| `422460235` | public restaurant page (`/restaurants/[slug]` / `/[slug]`) | **open** | **P0** | SSR throws → `global-error.tsx`. Blocks the whole customer order flow |
| `64732` (not a digest) | homepage marketplace | **open** | **P1** | PLZ `64732` Bad König — the first demo chip and `DEFAULT_DEMO_PLZ` — returns an empty marketplace; seeded coverage is Frankfurt only |
| `2046534492` | intermittent, deploy-burst related | watch | — | Documented in `docs/production-stability.md`; not reproduced since #28/#30 |

## Critical customer order flow

| # | Feature | Status | Sev | Notes |
|---|---------|--------|-----|-------|
| 1 | Homepage marketplace + PLZ/GPS | BUG | **P1** | Renders and hardened (#28/#30), but PLZ `64732` lists nothing — see digest table. Other PLZ (e.g. `60594`) list fine |
| 2 | Language picker / header switcher | OK | — | #29 live; flags present |
| 3 | Search `/suchen` | NOT TESTED | — | In the release-gate smoke as a render-only check |
| 4 | Restaurant public page `/restaurants/[slug]` + `/r/[slug]` | BUG | **P0** | SSR failure, digest `422460235`. `RestaurantPublicMenu` loads categories + items + reviews + offers in one nested `include` — same shape that broke the Speisekarte list before #37 |
| 5 | Cart add / update / sticky bar | NOT TESTED | — | Blocked by #4 in the browser |
| 6 | Checkout address / fulfillment | NOT TESTED | — | Edge harden #23 |
| 7 | Checkout pay (Stripe Test) | NOT TESTED | — | Manual A–F still required; Live NO-GO |
| 8 | Order placed → customer orders UI | NOT TESTED | — | |
| 9 | Restaurant accept / prep / deliver | NOT TESTED | — | Kitchen board after #31/#32; scaffolded in `e2e/order.journey.spec.ts` |
| 10 | Customer completion / notices | NOT TESTED | — | #20 |

## Auth & account

| Feature | Status | Sev | Notes |
|---------|--------|-----|-------|
| Login email/password (demo) | OK | — | Browser login works |
| Register | NOT TESTED | — | |
| Password reset | NOT TESTED | — | Tokens #24 |
| Google login | NOT TESTED | — | |
| Account page / phone / favorites | NOT TESTED | — | |
| Logout | OK | — | Seen on Speisekarte header |

## Restaurant panel

| Feature | Status | Sev | Notes |
|---------|--------|-----|-------|
| Panel home `/restaurant` (kitchen) | OK | — | #31/#32; no longer global-error for demo login |
| Speisekarte **list** | OK | — | Fixed in **#37** (list via raw SQL). Saved dishes are visible again |
| Speisekarte **create** | OK | — | Persists and appears in the list after #37 |
| Speisekarte price / availability toggle | NOT TESTED | — | Login-kick fixed #33 |
| Speisekarte **category delete** | BUG | **P2** | Deleting a category does not clear it from the list view; polish/edge, no money impact |
| Hours save | NOT TESTED | — | Login-kick fixed #33 |
| Delivery / radius save | NOT TESTED | — | #33 |
| Settings / logo | NOT TESTED | — | #33 |
| Orders history | NOT TESTED | — | |
| Finance / Abrechnung | NOT TESTED | — | #25 |
| Reviews | NOT TESTED | — | |
| Bondrucker / Bon | NOT TESTED | — | #21 |
| Marketing: Gutscheine | NOT TESTED | — | Restaurant-funded only; no LOCAL8 |
| Marketing: WayPoints panel | NOT TESTED | — | |
| Marketing: Vorbestellung / Banner / Angebote | NOT TESTED | — | Extra field loads may fail if migration lag |

## Partner / onboarding

| Feature | Status | Sev | Notes |
|---------|--------|-----|-------|
| Partner form `/partner/anmelden` | BUG | **P1** | Submits; **no email** — prod likely `console` provider without `RESEND_API_KEY` |
| Partner approve → credentials mail | NOT TESTED | — | Depends on Resend ENV |
| City label on form | OK | — | Fixed `cityLabel` in #32 |

## Platform / admin / ops

| Feature | Status | Sev | Notes |
|---------|--------|-----|-------|
| Admin panel gaps + audit | NOT TESTED | — | #22 |
| Critical alerts email | NOT TESTED | — | Needs `EMAIL_OPS_TO` + Resend. `alertPublicSsrFailure` hook added for #4; **no caller yet** |
| Transactional email system | BUG | **P1** | Code live #19; **ENV missing** for real sends (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_OPS_TO`) |
| Expire-orders cron | NOT TESTED | — | Needs `CRON_SECRET` on Hobby |
| Security / rate limits | NOT TESTED | — | #24 |
| WayPoints earn/redeem (customer) | NOT TESTED | — | #14 |
| Legal pages Impressum/Datenschutz/AGB/Hilfe | OK | — | Verbatim; live; in the smoke |
| Courier board | NOT TESTED | — | Out of launch critical path |

## Payments

| Feature | Status | Sev | Notes |
|---------|--------|-----|-------|
| Stripe Test Connect / webhook | NOT TESTED | — | Manual A–F pending |
| Stripe Live | NOT TESTED | — | Explicitly blocked until A–F. No CI job may hold a Stripe key |
| Cancel / refund lifecycle | NOT TESTED | — | #17 |

## Fix order (freeze)

1. **P0** public restaurant page SSR (digest `422460235`) — customer flow is dead without it.
2. **P1** marketplace `64732` empty result.
3. **P1** email ENV in production (partner mail + ops alerts depend on it).
4. **P2** Speisekarte category delete.

## Stabilization rules (this freeze)

1. No new features.
2. Bugs only, small isolated PRs.
3. Every PR passes the release gate: `Lint`, `Typecheck`, `CI build`, `Preview smoke`
   (see [docs/qa/release-gate.md](../qa/release-gate.md)). After merge, the
   post-deploy production smoke must be green too.
4. No drive-by refactors of working code.
5. A fixed row moves to **OK** only with evidence: gate run, digest gone, or a
   named browser check.
