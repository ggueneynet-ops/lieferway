# Critical error alerts (ops)

Central helper: `src/lib/alerts.ts` → transactional event `critical_payment_or_webhook_error` → `EMAIL_OPS_TO` (fallback `MAIL_OPS_TO` / `info@lieferway.de`).

**No Stripe Live.** Idempotency via existing `EmailSendLog.eventKey`. Optional `AuditLog` row with action `CRITICAL_ALERT` (there is no separate AdminLog model).

## Alert kinds

| Kind | Wired from |
|------|------------|
| `stripe_webhook_failure` | `handleStripeEvent` catch (`src/lib/stripe-webhooks.ts`) |
| `payment_capture_failure` | `payment_intent.payment_failed`; PI create failure on `POST /api/orders`; cancel-PI failures in payment-lifecycle |
| `refund_failure` | `releaseOrderPayment` / expire failures (`PaymentReleaseLog` FAILED) |
| `order_creation_failure` | `POST /api/orders` create / unexpected path errors |
| `email_provider_failure` | `sendTransactionalEmail` after provider retries (skips recursion on critical alerts) |
| `printer_failure` | Server-side `GET …/bon` unexpected 500 (client printer offline is **not** detectable — TODO) |
| `database_error` | Catchable Prisma connection/timeout codes on order create |
| `public_ssr_failure` | `alertPublicSsrFailure({ route, error, digest })` — hook for public SSR crashes (homepage / `/[slug]`). **Not wired to a page yet**; the P0 public-SSR fix PR is expected to call it from its `catch`. |

## Privacy

`sanitizeAlertDetail` / `safeErrorMessage` redact `sk_*` / `pk_*` / `whsec_*`, Bearer tokens, password/apiKey/secret fields, and PAN-looking digit runs. Never put card numbers or passwords in `detail` or AuditLog metadata.

## Env

```bash
EMAIL_OPS_TO=info@lieferway.de   # already documented in transactional-email.md
```

No new migration. Uses `EmailSendLog` + `AuditLog`.

## TODOs / leftovers

- Browser Bondrucker offline / popup-blocked cannot be observed server-side; only toast today.
- No PagerDuty / Slack / Sentry hook yet — email + AuditLog only.
- Console provider in local/CI does not spam real mail; Resend required for real ops delivery.
