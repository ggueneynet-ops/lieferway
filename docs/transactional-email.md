# Lieferway transactional email

Central service: `src/lib/email/`. **Do not** send customer/partner mail from React components or ad-hoc `fetch` calls.

## Transactional vs marketing

| | Transactional | Marketing |
| --- | --- | --- |
| Purpose | Account, order, payment, partner onboarding | Promos, newsletters, campaigns |
| Consent | **Not required** (contract / service message) | **Required** + unsubscribe |
| Code path | `sendTransactionalEmail` / `src/lib/email/events.ts` | **Not implemented** (stub / out of scope) |
| Log | `EmailSendLog` (unique `eventKey`) | N/A |

Marketing is intentionally **out of scope**. There is no marketing consent flag, unsubscribe endpoint, or campaign sender in this repo. When marketing is added later, it must be a **separate** module with double opt-in / unsubscribe — never reuse `EmailSendLog` event keys or transactional templates without a clear consent check.

## Provider (ENV only — never commit keys)

```bash
EMAIL_PROVIDER=resend|console   # optional; auto-detects if unset
RESEND_API_KEY=                 # preferred on Vercel
EMAIL_FROM="Lieferway <noreply@lieferway.de>"
EMAIL_REPLY_TO=info@lieferway.de
EMAIL_OPS_TO=info@lieferway.de  # critical payment/webhook alerts

# Legacy still supported when EMAIL_PROVIDER unset:
# SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_SECURE
# MAIL_WEBHOOK_URL
# MAIL_FROM (alias of EMAIL_FROM)
```

- Default: if `RESEND_API_KEY` is set → Resend; else SMTP; else webhook; else **console** log.
- Non-production without a key → **console** so builds/CI do not fail.
- From display name: **Lieferway**. Reply-To: **info@lieferway.de**.

## Idempotency

`EmailSendLog.eventKey` is unique. Duplicate Stripe webhooks / retries that hit the same key skip a second send (`status=SENT|SKIPPED`). Provider failures retry up to 3 times, then `FAILED` (can be retried later with a new attempt on the same row if status is FAILED).

## Events

See `EMAIL_EVENT_REGISTRY` in `src/lib/email/events.ts` for wired vs TODO.

Wired in this PR: `user_registered`, order lifecycle via `notifyCustomerOfOrderStatus`, `payment_failed`, `order_refunded`, `partner_application_received`, `partner_approved`, `critical_payment_or_webhook_error`.

TODO (templates + senders registered, no product flow yet): `email_verification`, `password_reset`, `restaurant_payout_summary`.

## Constraints

- No demo/test copy in production templates.
- Keep platform commission 8%, GF, legal pages; no checkout refactor.
- Do not touch Stripe Live keys.
