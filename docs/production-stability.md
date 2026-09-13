# Production stability (app.lieferway.de)

Ops notes for avoiding intermittent Next.js global errors during deploys. **No Stripe Live.**

## Deploy soak (do not burst-merge)

- Prefer **one production deploy at a time**. After merging to `main`, wait for Vercel Production to finish and spot-check `https://app.lieferway.de` (home, login, a public restaurant page) before merging the next PR.
- Avoid merging many PRs in a short burst: each merge triggers a new build; overlapping deploys + cold starts make intermittent “This page couldn’t load / A server error occurred” (digest in Runtime Logs) more likely even when health probes often return 200.
- Prefer small, focused PRs (middleware/docs/UI polish separate from payment or schema work).

## Migrations run in build

`package.json` `build` is:

```bash
prisma generate && prisma migrate deploy && tsx scripts/seed-if-empty.ts && next build
```

So every Vercel production build applies pending Prisma migrations. A bad migration blocks the whole deploy (good — better than a half-migrated runtime). Keep migrations forward-only and tested locally against Postgres before merge.

## Finding digests in Runtime Logs

When a user reports the Next.js global error page with a **digest** (e.g. `ERROR 2046534492`):

1. Vercel → project for `app.lieferway.de` → **Logs** / **Runtime Logs**.
2. Filter by the time window of the report (Europe/Berlin) and search for the digest number or `digest`.
3. Correlate with **Deployments** around the same window (burst deploys, failed builds, migrate errors).
4. Edge auth failures are already handled in `src/lib/auth-edge.ts` (`verifySessionToken` returns `null` on JWT errors). Middleware itself is wrapped so unexpected throws call `NextResponse.next()` instead of crashing the edge.

## Homepage SSR resilience

`src/app/page.tsx` wraps `listMarketplaceRestaurants` in `try/catch`. On Prisma/Neon failure it logs the error and still renders the shell with an empty list + soft banner — it must **not** throw into the Next.js global error UI. US probes can still see 200 while DE users hit a DB blip; this keeps the homepage usable either way.

## Related hardening

| Piece | Behavior |
| --- | --- |
| `src/app/page.tsx` | `listMarketplaceRestaurants` failure → empty list + soft banner (no throw) |
| `src/middleware.ts` | Outer `try/catch` → `NextResponse.next()` (fallback redirect `/`) |
| `CustomerNoticePoller` | `/api/notices` **401** → silent return (no client crash) |
| `src/app/global-error.tsx` | Lieferway-branded recovery + reload (shows digest when present) |