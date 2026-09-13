# Lieferway feature inventory (freeze 2026-09-13)

Feature development frozen. Status: **OK** | **BUG** | **NOT TESTED**.  
Severity when BUG: **P0** (blocks core money/ops) · **P1** (broken important path) · **P2** (polish / edge).

Evidence: production probes + browser checks on 2026-09-13 (Anadolu Grill / `restaurant@lieferway.de`), prior E2E sandbox PR #27 (scripts only), and live user reports.

## Critical customer order flow

| # | Feature | Status | Sev | Notes |
|---|---------|--------|-----|-------|
| 1 | Homepage marketplace + PLZ/GPS | OK | — | Hardened #28/#30; user recovered after outage |
| 2 | Language picker / header switcher | OK | — | #29 live; flags present |
| 3 | Search `/suchen` | NOT TESTED | — | |
| 4 | Restaurant public page `/restaurants/[slug]` + `/r/[slug]` | NOT TESTED | — | QR/share shipped #18 |
| 5 | Cart add / update / sticky bar | NOT TESTED | — | |
| 6 | Checkout address / fulfillment | NOT TESTED | — | Edge harden #23 |
| 7 | Checkout pay (Stripe Test) | NOT TESTED | — | Manual A–F still required; Live NO-GO |
| 8 | Order placed → customer orders UI | NOT TESTED | — | |
| 9 | Restaurant accept / prep / deliver | NOT TESTED | — | Kitchen board after #31/#32 |
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
| Speisekarte **list** | BUG | **P0** | Yellow `restaurantLoadError`; empty list; create still returns Gespeichert (#34/#35). Confirmed browser 2026-09-13 |
| Speisekarte **create** | BUG | **P0** | Persists (ok=1) but not visible while list query throws — same P0 |
| Speisekarte price/toggle/delete | NOT TESTED | — | Login-kick fixed #33 |
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
| Partner form `/partner/anmelden` | BUG | **P1** | Submits; **no email** — prod likely `console` without `RESEND_API_KEY` |
| Partner approve → credentials mail | NOT TESTED | — | Depends on Resend ENV |
| City label on form | OK | — | Fixed `cityLabel` in #32 |

## Platform / admin / ops

| Feature | Status | Sev | Notes |
|---------|--------|-----|-------|
| Admin panel gaps + audit | NOT TESTED | — | #22 |
| Critical alerts email | NOT TESTED | — | Needs `EMAIL_OPS_TO` + Resend |
| Transactional email system | BUG | **P1** | Code live #19; **ENV missing** for real sends |
| Expire-orders cron | NOT TESTED | — | Needs `CRON_SECRET` on Hobby |
| Security / rate limits | NOT TESTED | — | #24 |
| WayPoints earn/redeem (customer) | NOT TESTED | — | #14 |
| Legal pages Impressum/Datenschutz/AGB/Hilfe | OK | — | Verbatim; live |
| Courier board | NOT TESTED | — | Out of launch critical path |

## Payments

| Feature | Status | Sev | Notes |
|---------|--------|-----|-------|
| Stripe Test Connect / webhook | NOT TESTED | — | Manual A–F pending |
| Stripe Live | NOT TESTED | — | Explicitly blocked until A–F |
| Cancel / refund lifecycle | NOT TESTED | — | #17 |

## Stabilization rules (this freeze)

1. No new features.
2. Bugs only, small isolated PRs.
3. After each PR: lint, typecheck, production build, smoke.
4. No drive-by refactors of working code.
