# Stripe Connect (Test Mode)

Lieferway is a marketplace: the **guest pays Lieferway**, the **restaurant delivers**, and the restaurant keeps food minus commission (default **5 %**). Delivery fee stays with the platform. Stripe processing fees are attributed to the **restaurant net**, so Lieferway keeps the full commission.

This document is Test Mode only (`sk_test_`, `pk_test_`, `whsec_`). Do not put secret keys in the frontend or in git.

## Model

- **Express Connected Accounts** per restaurant
- **Destination charges**: `PaymentIntent` with
  - `transfer_data.destination` = restaurant Express account
  - `application_fee_amount` = food × commission% **plus** delivery **minus** discount (platform share)
  - `on_behalf_of` = restaurant account so Stripe’s card fee hits restaurant net
- **Payment Element** for card / Apple Pay / Google Pay
- **Cash** is unchanged (`PLACED` immediately, `CASH_ON_DELIVERY`)

`application_fee_amount` is not only `food × %`. Delivery must stay with Lieferway and discounts are platform-funded, so:

```
application_fee = clamp(commission + deliveryFee - discount, 0, total - 1)
restaurant transfer ≈ total - application_fee
restaurant net     = food - commission - stripeFee
platform net       = application_fee  (full ~5 % commission + delivery − discount)
```

## Environment

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
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
