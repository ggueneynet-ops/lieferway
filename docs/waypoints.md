# WayPoints

Customer loyalty for participating restaurants. Default **off**. Commission (default **8 %**) is unchanged.

## Earn rate

Admin → **WayPoints** → **Punkte pro Euro**.

Default: **1 € Speisen = 10 WayPoints**. Not hardcoded — stored in `WayPointsSettings.pointsPerEuro`.

Points are credited only when the order reaches **`DELIVERED`** (delivered or handed off). Payment success alone does not credit. Kitchen `PENDING_PAYMENT` gating is unchanged.

The same order never double-credits (`WayPointsLedger.uniqueKey` = `EARN:{orderId}`).

Cancel / reject / full refund writes a reversing ledger row and restores redeemed points.

## Restaurant opt-in

Restaurant panel → **Mehr** → **WayPoints** (Marketing).

Switch: „Am WayPoints-Programm teilnehmen“  
Help: „Belohne deine Kunden für wiederkehrende Bestellungen und erhöhe die Kundenbindung.“

Admin can force-disable a restaurant. Off = normal checkout, no earn, no redeem, Stripe math as before.

## Checkout exclusivity (v1)

Restaurant Gutschein and WayPoints **do not stack**. Checkout and `/api/orders` accept only one.

## Who pays the discount

Reward field **Kosten trägt**: Restaurant (default) | Lieferway | Geteilt.

Geteilt stores restaurant + Lieferway shares (basis points on the reward, cents on the order).

Checkout example: basket 30 €, WP −3 €, guest pays 27 €.

Stripe destination charges still use:

```
application_fee = commission + stripeFeeEstimate + delivery − platformAbsorbedDiscount
```

`platformAbsorbedDiscount` = existing coupon + **Lieferway-funded** WayPoints share only. Restaurant-funded WayPoints reduce the charge amount (guest pays less) and therefore the restaurant transfer — they are **not** subtracted again from `application_fee`. That keeps PaymentIntent math and kitchen gating intact.

Settlement lines (admin order + restaurant finance): Warenwert, WayPoints Rabatt, finanziert durch, Lieferway Provision, Restaurant Auszahlung.

## Usage & restaurant budget

- Per-reward **usageLimit** and **perCustomerLimit** cap redemptions.
- Optional restaurant **WayPoints budget** (`wayPointsBudgetCents`): max restaurant-funded discount cents. Null = unlimited. Spent tracked in `wayPointsBudgetSpentCents`. Redeem blocked when restaurant share would exceed remaining budget.
- Customer balance never goes negative (`appendLedger` rejects `INSUFFICIENT_POINTS`).
- Ledger is the audit log (`WayPointsLedger` with `uniqueKey`, `delta`, `balanceAfter`, `type`).
- Admin can post **ADJUST** ledger entries (email + delta + reason).

## Demo

Password `lieferway`.

1. `restaurant@lieferway.de` → Mehr → WayPoints → enable → create a reward.
2. Marketplace: participating cards show **✦ WayPoints**. Homepage banner → `/waypoints`.
3. `kunde@lieferway.de` orders at that restaurant → kitchen marks **geliefert/abgeholt**.
4. `/waypoints` shows the credit. Redeem one reward at checkout (v1: max 1).
5. `admin@lieferway.de` → `/admin/waypoints` (rate, campaigns, force-disable) and order settlement.

## Campaigns (admin)

Examples: 2× points week, 500 bonus first order, 5 € Lieferway voucher. Can be Lieferway-funded.
