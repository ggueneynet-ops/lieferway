# Customer checkout edge cases

Server-side enforcement lives in `POST /api/orders` + `src/lib/checkout-guards.ts`.
UI: `CheckoutClient` (submit lock + sessionStorage idempotency key).

| Case | Status |
|------|--------|
| Restaurant closed (`isOpen=false`, no preorder slot) | Enforced |
| Restaurant inactive | Enforced |
| Switch restaurant clears prior cart items | Already OK (`CartProvider.add`) |
| Double-click / refresh duplicate order | Idempotency key (`Order.idempotencyKey`) + UI `submittingRef` |
| Wrong / incomplete address | Clear `INVALID_ADDRESS` / `INVALID_PLZ` |
| Minimum order | Enforced |
| Delivery radius / service area | Enforced on DELIVERY |
| Delivery fee | Server `listedDeliveryFeeCents`; optional client snapshot → `FEE_CHANGED` |
| Item unavailable / ausverkauft | Enforced |
| Price changed vs cart | `expectedPriceCents` → `PRICE_CHANGED` (409) |
| Payment failed | Webhook sets `paymentStatus=FAILED`, keeps `PENDING_PAYMENT` for retry |
| Stale cart | Price/fee/item checks |
| Commission default 8% | Unchanged (`DEFAULT_COMMISSION_PERCENT`) |
| Legal pages | Unchanged |

## Migration

`20260913230000_order_idempotency_key` adds nullable unique `Order.idempotencyKey`.

## Env

No new env vars. Stripe **Test Mode** only (existing). No Stripe Live.

## Test

```bash
npx tsx scripts/test-checkout-guards.ts
```
