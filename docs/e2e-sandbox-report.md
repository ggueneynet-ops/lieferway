# Lieferway E2E sandbox report (scenarios A–F)

**Date:** 2026-09-13 22:07 Europe/Berlin (PT)  
**Base:** `main` @ `d10d6fb` (after merged PR #26 — critical error alerts)  
**Mode:** Stripe **TEST only** — no Live keys used, switched, or proposed.  
**Method:** `gh` + zipball/`git clone` of `ggueneynet-ops/lieferway`; local `tsx` scripts with pure/fixture checks; optional public smoke curls (no € charges).

## Executive summary

| Scenario | Result | Automated | Live Stripe Test Dashboard / panel |
|----------|--------|-----------|------------------------------------|
| **A** Happy path → completed | **PASS (wiring + unit)** | Yes | **MANUAL_REQUIRED** for real PI + kitchen UI |
| **B** Reject → refund + WP/coupon + email | **PASS (wiring + unit)** | Yes | **MANUAL_REQUIRED** for Stripe refund + inbox |
| **C** Accept timeout → auto cancel/refund | **PASS (wiring + unit)** | Yes | **MANUAL_REQUIRED** for cron + real PI expire |
| **D** Payment fails → correct state | **PASS (wiring + unit)** | Yes | **MANUAL_REQUIRED** to decline a Test card |
| **E** Duplicate webhook | **PASS (wiring + unit)** | Partial (signature + claim code) | **MANUAL_REQUIRED** to replay webhook in Dashboard |
| **F** Admin manual refund | **PASS (wiring + unit)** | Yes | **MANUAL_REQUIRED** for Admin UI + Stripe refund |

**Stripe Live go/no-go:** **NO-GO** until MANUAL_REQUIRED items below are signed off in **Stripe Test** (and ops confirms expire cron is scheduled). Code gate `assertStripeKeySeparation()` still forbids `sk_live_` / `pk_live_`.

---

## 1. Script inventory → A–F map

| npm script / file | Primary scenarios | What it proves |
|-------------------|-------------------|----------------|
| `test:payment-lifecycle` | A, B, C, F | Payment status enum, cancel rules, accept timeout, refund idempotency keys, no auth-hold |
| `test:stripe` | A, B, D, E, F | Connect fees, refund slices, unpaid≠PAID, webhook signature verify (incl. same payload twice) |
| `test:waypoints` | A, B, F | Earn on `DELIVERED`, ledger idempotency, funding splits |
| `test:coupons` | B, F | Discount math + XOR; restore path covered via lifecycle/webhook wiring |
| `test:checkout` | A, D | Checkout guards + `payment_failed` keeps `PENDING_PAYMENT` |
| `test:email` | A–F | Transactional events wired (`order_*`, `payment_failed`, `order_refunded`, critical) |
| `test:admin-audit` | F | Admin cancel/refund APIs, distinct idempotency, AuditLog |
| `test:alerts` | D, E | Critical alert hooks on webhook/payment/refund failure; no Live keys |
| `test:authz` | safety | Live key rejection / key mixup |
| `test:settlement` | A, B, F | Refund zeros remaining; rejected/cancelled not payable |
| `test:browser-notifications` | A, B, F | Kitchen/customer notices; refund notice path |
| `test:e2e-sandbox` *(new)* | **A–F** | Static wiring map for full A–F + Live-key safety |

Supporting (not A–F core): `test:auth`, `test:bon`, `test:settlement` extras, restaurant feature pack.

---

## 2. Local automated run (this session)

All of the following exited **0** on commit `d10d6fb` (and the new coverage script on this PR branch):

```
test:payment-lifecycle  PASS
test:stripe             PASS
test:waypoints          PASS
test:coupons            PASS
test:checkout           PASS
test:alerts             PASS
test:email              PASS
test:admin-audit        PASS
test:authz              PASS
test:settlement         PASS
test:browser-notifications PASS
test:bon                PASS
test:auth               PASS
test:e2e-sandbox        PASS  (added in this PR)
```

No database Stripe Test PI was created. No Live keys were set.

---

## 3. Public smoke (app.lieferway.de) — no charges

| Route | HTTP |
|-------|------|
| `GET /api/health` | **200** `{"ok":true,"name":"Lieferway"}` |
| `GET /agb` | **200** |
| `GET /login` | **200** |
| `GET /` | **200** |

Publishable key is not embedded in public HTML (served after authenticated checkout/`/api/orders` / pay endpoints). Code still enforces **test-only** keys via `assertStripeKeySeparation()` in `src/lib/stripe.ts`.

**Do not** place real € charges against production for this report.

---

## 4. Scenario detail

### A) Order → restaurant accept → paid → preparing → out/ready → completed

| Layer | Status | Evidence |
|-------|--------|----------|
| Unit / wiring | **PASS** | Status flow in `PATCH /api/orders/[id]`; `handlePaymentIntentSucceeded` → `PLACED`+`PAID`; kitchen accept → `PREPARING`; ready/out/deliver; WayPoints credit on `DELIVERED`; email map `order_accepted`…`order_completed` |
| Real Stripe Test + panel | **MANUAL_REQUIRED** | Place Test-mode order, confirm PI, accept in restaurant UI, advance to `DELIVERED`, confirm WP ledger + emails |

### B) Order → restaurant reject → cancel/refund → WayPoints clawback + coupon restore → customer email

| Layer | Status | Evidence |
|-------|--------|----------|
| Unit / wiring | **PASS** | Reject → `REJECTED` + `releaseOrderPayment(restaurant_reject)` + `reverseCouponUsageForOrder` + `reverseWayPointsForOrder` + `notifyCustomerOfOrderStatus`; `order_rejected` email event |
| Real Stripe Test + inbox | **MANUAL_REQUIRED** | Paid Test order, reject, verify Stripe refund, coupon `REVERSED`, WP clawback, customer email |

### C) No restaurant response → timeout expire → auto cancel/refund → customer notify

| Layer | Status | Evidence |
|-------|--------|----------|
| Unit / wiring | **PASS** | `RESTAURANT_ACCEPT_TIMEOUT_MINUTES` (default 15); `/api/cron/expire-orders`; `expirePlacedOrder` → `REJECTED` + `restaurant_timeout` release + coupon/WP reverse + notify |
| Ops / Stripe Test | **MANUAL_REQUIRED** | Confirm `CRON_SECRET` caller every ≤5 min (Hobby has no Vercel cron); leave a paid `PLACED` order past timeout; verify refund + notify |

**Blocker note:** Without a reliable expire cron, timeout refunds will not run in production — required before Live.

### D) Payment fails → correct order/payment state + clear error

| Layer | Status | Evidence |
|-------|--------|----------|
| Unit / wiring | **PASS** | `handlePaymentIntentFailed` sets `paymentStatus: FAILED`, does **not** cancel order; `sendPaymentFailed` + critical alert; retry via pay route |
| Stripe Test card | **MANUAL_REQUIRED** | Use decline Test card (`4000000000000002` etc.); confirm UI error + `FAILED` + email |

### E) Duplicate webhook → nothing processed twice

| Layer | Status | Evidence |
|-------|--------|----------|
| Unit / wiring | **PASS** | `claimStripeEvent` unique `StripeEvent.id` → `{ duplicate: true }`; `StripeRefund.stripeRefundId` + `refund_seen`; `refundIdempotencyKey`; signature constructEvent twice OK |
| Stripe Dashboard | **MANUAL_REQUIRED** | Resend same event id from Test Dashboard; confirm single apply |

### F) Admin manual refund → Stripe + order + WayPoints + email consistent

| Layer | Status | Evidence |
|-------|--------|----------|
| Unit / wiring | **PASS** | `POST /api/admin/orders/[id]/refund` → `admin_refund` + AuditLog; `applyRefundToOrder` reverses WP/coupon + `sendOrderRefunded` + REFUNDED notice |
| Admin UI + Stripe | **MANUAL_REQUIRED** | Full/partial refund in Admin; verify Stripe, order payment status, WP, EmailSendLog |

---

## 5. Gaps closed in this PR

1. **`scripts/test-e2e-sandbox-coverage.ts`** + `npm run test:e2e-sandbox` — single A–F wiring checklist (no Live, no charges).
2. **This report** — honest PASS vs MANUAL_REQUIRED split.

Still **not** automated (by design without Stripe Test secrets / restaurant session):

- End-to-end PaymentIntent create → webhook → kitchen UI.
- Real duplicate webhook delivery from Stripe.
- Cron firing against a live stale `PLACED` row.
- Inbox delivery (provider may be console-only without mail keys).

---

## 6. Blockers for Stripe Live go/no-go

| # | Blocker | Severity |
|---|---------|----------|
| 1 | Complete MANUAL_REQUIRED A–F in **Stripe Test** Dashboard + restaurant/admin panels | **Hard** |
| 2 | Confirm expire cron (`CRON_SECRET` + scheduled `GET/POST /api/cron/expire-orders`) is actually running | **Hard** |
| 3 | Confirm transactional email provider is wired for production recipients (not console-only) | **Hard** |
| 4 | Keep `assertStripeKeySeparation` / no Live keys until 1–3 signed off | **Policy** |
| 5 | Document Test→Live Connect account migration / webhook endpoint secrets separately | Ops |

**Recommendation:** **NO-GO for Stripe Live** after this sandbox pass alone. Automated layer is green; human Test-mode E2E and cron/email ops remain.

---

## 7. How to re-run

```bash
npm ci
npx prisma generate
npm run test:payment-lifecycle
npm run test:stripe
npm run test:waypoints
npm run test:coupons
npm run test:checkout
npm run test:email
npm run test:admin-audit
npm run test:alerts
npm run test:authz
npm run test:e2e-sandbox
# optional smoke (no auth, no charge):
curl -fsS https://app.lieferway.de/api/health
```

Do **not** set `STRIPE_SECRET_KEY=sk_live_…` or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…`.
