# Stripe Connect (Test Mode)

Lieferway is a marketplace: the **guest pays Lieferway**, the **restaurant delivers**, and the restaurant keeps food minus commission (default **8 %**). Delivery fee stays with the platform.

Destination charges take the Stripe processing fee from the **platform** balance. `application_fee_amount` is therefore **not** only 8 % of food — it includes the estimated Stripe fee so Lieferway still nets ~5 % after Stripe.

This document is Test Mode only (`sk_test_`, `pk_test_`, `whsec_`). Do not put secret keys in the frontend or in git.

## Model

- **Express Connected Accounts** per restaurant
- **Destination charges**: `PaymentIntent` with `transfer_data.destination` + `application_fee_amount`
- **Payment Element** for card / Apple Pay / Google Pay
- **Cash** is unchanged (`PLACED` immediately, `CASH_ON_DELIVERY`) — no application fee

```
netCommission     = food × commission%          (default 8 %)
stripeFeeEstimate = STRIPE_FEE_FIXED_CENTS + round(amount × STRIPE_FEE_PERCENT_BPS / 10_000)
application_fee   = netCommission + stripeFeeEstimate + delivery − platformAbsorbedDiscount
# platformAbsorbedDiscount = coupons + Lieferway-funded WayPoints share (not restaurant-funded WP)
restaurant xfer   = amount − application_fee
platform net      = application_fee − actual Stripe fee  ≈ 8 % of food
```

Example: **100 €** food, 8 % target, Stripe ~1,5 % + 0,25 € → fee **1,75 €** → `application_fee` **6,75 €**. Platform pays 1,75 € to Stripe and nets **8 €**. Restaurant transfer **93,25 €**.

Fee estimate env (test-mode defaults = DE card pricing; treat as estimates):

```
STRIPE_FEE_PERCENT_BPS=150    # 1.5 %
STRIPE_FEE_FIXED_CENTS=25     # 0,25 €
```

After `payment_intent.succeeded` we store `stripeFeeActualCents` from the charge’s balance transaction. If actual ≠ estimate, `stripeFeeNote` records the variance — we do **not** silently rewrite the transfer.

## Environment

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_FEE_PERCENT_BPS=150
STRIPE_FEE_FIXED_CENTS=25
```

Webhook endpoint: `{NEXT_PUBLIC_APP_URL}/api/stripe/webhook`

Listen for (include **Connect** events):

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`
- `refund.updated`
- `charge.dispute.created` / `charge.dispute.closed`
- `payout.paid` / `payout.failed` / `payout.canceled`
- `account.updated`

Local CLI:

```bash
stripe listen --forward-to localhost:43123/api/stripe/webhook --forward-connect-to localhost:43123/api/stripe/webhook
```

## Order lifecycle (online)

1. `POST /api/orders` creates the order as **`PENDING_PAYMENT`**. Kitchen is **not** notified.
2. Server creates the destination PaymentIntent. Client confirms via Payment Element.
3. Webhook `payment_intent.succeeded` (idempotent via `StripeEvent.id`) sets `PLACED` + `PAID` and only then notifies the kitchen.
4. Failed / canceled payment never reaches the kitchen.

Cash skips steps 2–3.

## Restaurant onboarding

Restaurant **Einstellungen** → Stripe Connect → Express Account Link.

On create we set a **weekly Monday** payout schedule on the connected account:

```
settings.payouts.schedule = { interval: "weekly", weekly_anchor: "monday" }
```

Online checkout is rejected until `charges_enabled` and onboarding are complete.

## Refunds

Admin order detail can refund **full or partial**. Stripe refund uses `reverse_transfer` + `refund_application_fee`. Books:

- last slice takes remainders so commission / net / Stripe fee close
- `paymentStatus` becomes `PARTIALLY_REFUNDED` or `REFUNDED`

Duplicate webhook deliveries are ignored (`StripeEvent` unique id; existing `StripeRefund.stripeRefundId`).

## Disputes & payouts

- Dispute opened → `paymentStatus=DISPUTED`
- Dispute lost → treated as a full remaining refund in the ledger
- Connected `payout.paid` marks matching restaurant card orders `payoutStatus=PAID` and upserts the weekly `Payout` row

## Admin / restaurant UI

- Admin order: gross, commission, Stripe fee, restaurant net, payment status, payout status, refunds
- Restaurant Finanzen: payments, commissions, net, pending, paid, payout history

## Test cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

Never send `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the browser. Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is public.


## Accept timeout + cancel/refund

See [payment-lifecycle.md](./payment-lifecycle.md). Summary: **no manual capture**. On restaurant reject, customer cancel (allowed stages), or accept timeout, unpaid PaymentIntents are canceled and captured charges are refunded (`reverse_transfer` + `refund_application_fee`) with idempotency keys. Failed attempts are logged in `PaymentReleaseLog`.
