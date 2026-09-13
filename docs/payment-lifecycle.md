# Payment cancel / refund lifecycle

## Architecture (no auth-hold)

Lieferway uses **capture-on-confirm** destination PaymentIntents (Stripe Connect):

1. `POST /api/orders` → `PENDING_PAYMENT` + PaymentIntent (automatic capture)
2. Customer confirms → webhook `payment_intent.succeeded` → `PLACED` + `PAID` + `placedAt`
3. Kitchen sees the order only after step 2

**Auth-hold** (`capture_method: manual` → capture on accept / cancel on reject) was evaluated and **not** adopted: it would change PI creation, kitchen visibility, and webhooks. Reject / cancel / timeout instead **refund** a captured charge (or **cancel** an unpaid PI).

## Payment status map

| Concept        | Enum                 |
|----------------|----------------------|
| pending        | `PENDING`            |
| authorized     | *(unused)*           |
| captured       | `PAID`               |
| failed         | `FAILED`             |
| refund_pending | `REFUND_PENDING`     |
| refunded       | `REFUNDED` / `PARTIALLY_REFUNDED` |

Order statuses stay: `PENDING_PAYMENT` → `PLACED` → kitchen flow / `REJECTED` / `CANCELLED`.

## Rules

1. **Restaurant reject** (`PATCH … action=reject` while `PLACED`) → `REJECTED` + full refund/cancel + WayPoints clawback + CouponUsage restore
2. **No accept within timeout** → cron `/api/cron/expire-orders` → `REJECTED` + same release + customer notice (email via existing notify stub)
3. **Customer cancel** only in `PENDING_PAYMENT` | `PLACED` → `CANCELLED` + release
4. **Admin refund** → `POST /api/admin/orders/[id]/refund` (idempotent Stripe key, `REFUND_PENDING` while in flight)
5. Full refund path always runs WayPoints + coupon reverse (webhook `applyRefundToOrder` + reject/cancel hooks)
6. Duplicate Stripe webhooks: `StripeEvent.id` + `StripeRefund.stripeRefundId` + refund idempotency keys
7. Failed refunds: `PaymentReleaseLog` (`status=FAILED`) + console.error; order stays `REFUND_PENDING` for retry
8. Payment + order stay consistent: terminal order statuses trigger release; unpaid → cancel PI; paid → refund

## Timeout

```
RESTAURANT_ACCEPT_TIMEOUT_MINUTES=15   # default
CRON_SECRET=…                          # Bearer for /api/cron/expire-orders
```

Vercel Hobby cannot run sub-daily crons (and adding `crons` in `vercel.json` failed preview deploys on this account).

Invoke expire yourself every 5 minutes:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_APP_URL/api/cron/expire-orders"
```

On Vercel Pro you may add to `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/expire-orders", "schedule": "*/5 * * * *" }] }
```

Clock uses `Order.placedAt` (fallback `createdAt`).
