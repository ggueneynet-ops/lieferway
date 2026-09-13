# Browser / kitchen notifications

Shared status pipeline: **order status change → `notifyCustomerOfOrderStatus` → `CustomerNotice` (+ transactional email when mapped)** → customer in-app toast / optional Browser Notification.

Restaurant new-order alerts stay on the existing kitchen panel poll/SSE + gong. Browser Notification is an **extra** channel so background tabs are harder to miss.

## HTTPS requirement

Browsers only allow the [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) on a **secure context**:

- `https://…` (production: `https://app.lieferway.de`)
- or `http://localhost` / `http://127.0.0.1` for local dev

HTTP tunnels without TLS will show `browserNotifInsecure` and skip the permission prompt.

`next.config.ts` advertises `Permissions-Policy: notifications=(self)`.

## No service worker (by design)

This PR does **not** add a service worker or Web Push.

| Scenario | Covered? |
| --- | --- |
| Restaurant panel tab open (focused) | Gong + visual flash (existing) |
| Restaurant panel tab open (background) | Gong (if audio unlocked) + **Browser Notification** once per order id |
| Customer app open (background tab) | Toast when visible; **Browser Notification** when hidden |
| Browser fully closed / OS killed | **Not covered** — needs Web Push + SW later |

Keep any future SW minimal and separate from this module.

## Restaurant (kitchen)

- File: `src/components/restaurant-orders.tsx` + `src/lib/kitchen-gong.ts` + `src/lib/browser-notifications.ts`
- Existing repeating gong / mute / SSE+poll **unchanged**
- On first sight of a new `PLACED` order: `notifyKitchenNewOrder` with:
  - OS `tag = lw-kitchen-{orderId}` (collapse duplicates)
  - `localStorage` dedupe key `lw_kitchen_notified_orders`
- Soft permission banner (Activate / Later). Later → `lw_kitchen_notif_prompt=dismissed`. Request only on click.

## Customer status updates

Statuses (labels via `orderStatusLabel` / notice copy):

| Status | DE sense |
| --- | --- |
| `PLACED` | Bestellung eingegangen |
| `ACCEPTED` | Angenommen |
| `PREPARING` | In Zubereitung |
| `READY` | Abholbereit (pickup) / bereit zur Auslieferung |
| `OUT_FOR_DELIVERY` | Unterwegs |
| `DELIVERED` | Abgeschlossen |
| `CANCELLED` / `REJECTED` | Storniert / abgelehnt |
| `REFUNDED` | Erstattet (notice only; email via `sendOrderRefunded`) |

- Poller: `src/components/customer-notice-poller.tsx` → `/api/notices`
- Toast in-app; Browser Notification when permission granted (prefers hidden tab), deduped by notice id (`lw_customer_notified_notices`)
- Soft enable prompt after the first fresh notice (not on every page load)

## Shared with email

Do **not** send status mail from React. All customer status emails still go through `notifyCustomerOfOrderStatus` → `sendOrderStatusEmail` / `orderStatusToEvent` (see `docs/transactional-email.md`). Refunds: email in `applyRefundToOrder`, then `notifyCustomerOfOrderStatus(..., "REFUNDED")` for the in-app/browser notice.

## ENV / migrations

- No new ENV keys
- No Prisma migration (uses existing `CustomerNotice`)

## Tests

```bash
npm run test:browser-notifications
```
