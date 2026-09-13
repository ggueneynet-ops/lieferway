# Security & authorization (Lieferway)

Surgical authz hardening. **Commission default stays 8%.** GF / legal pages unchanged. **No Stripe Live.**

## Roles

| Role | UI | Orders |
|------|----|--------|
| `CUSTOMER` | Marketplace, `/orders`, `/account`, `/checkout` | Own orders only |
| `RESTAURANT` | `/restaurant/*` | Own restaurant’s kitchen orders / bons only |
| `COURIER` | `/courier` | Assigned (API may list unassigned for claim) |
| `ADMIN` | `/admin/*` | All |

Partner **application** (`/partner/anmelden`, `POST /partner/apply`) is public by design. Partner **ops** use `/restaurant` after admin approval (role `RESTAURANT`).

## Route guards

### Edge middleware (`src/middleware.ts`)

Protected prefixes require a valid JWT session cookie **and** an allowed role:

- `/admin` → `ADMIN`
- `/restaurant` → `RESTAURANT` \| `ADMIN`
- `/courier` → `COURIER` \| `ADMIN`
- `/checkout` → `CUSTOMER` \| `ADMIN`
- `/orders`, `/account` → signed-in roles listed above

`/partner` and `/restaurants` remain public. API routes are **not** role-gated in middleware; each handler uses `requireSession` / ownership checks.

### Server panels

`PanelShell` and `requireOwnedRestaurant` re-check session + role (defense in depth).

### Order IDOR

| Surface | Rule |
|---------|------|
| `GET /api/orders/[id]` | `canViewOrder` (customer own / restaurant owner / courier assigned-or-unassigned / admin) |
| `/orders/[id]` page | `canAccessOrderDetailPage` (stricter: courier only if assigned) |
| `GET /api/orders/[id]/pay` | `canAccessOrderPayment` (customer owner or admin) — no payment secrets for other roles |
| `GET /api/orders/[id]/invoice` | Customer owner or admin |
| Restaurant bons / kitchen APIs | Resolve restaurant by `ownerId`; order must belong to that restaurant |

Helpers live in `src/lib/order-access.ts`.

## Auth abuse controls

In-memory rate limits (`src/lib/rate-limit.ts`) — best-effort per instance:

| Endpoint | Limit (default) |
|----------|-----------------|
| `POST /api/auth/login`, `POST /login/submit` | 10 / 15 min / IP |
| `POST /api/auth/register` | 5 / 15 min / IP |
| Password reset request/confirm | 5 / 15 min / IP |
| `POST /partner/apply` | 5 / hour / IP |

## Password reset

1. `POST /api/auth/password-reset/request` `{ email }` — always generic success (no enumeration).
2. Email link → `/login/reset?token=…` (raw token only in email URL).
3. `POST /api/auth/password-reset/confirm` `{ token, password }`.

Tokens (`PasswordResetToken`):

- Stored as **SHA-256 hash** only
- **1 hour** expiry
- **Single-use** (`usedAt`); prior unused tokens invalidated on new request

Migration: `prisma/migrations/20260913240000_password_reset_tokens`.

## Secrets & Stripe

- `NEXT_PUBLIC_*` only for publishable / public origin (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, mail keys — **server ENV only**.
- `assertStripeKeySeparation()` rejects `sk_live_` / `pk_live_` and secret/publishable mix-ups. **Test mode only.**

## Verify

```bash
npm run test:authz
npm run test:auth
npm run test:email
```

`scripts/test-route-guards.ts` statically lists middleware rules + critical ownership helpers.
