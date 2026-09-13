# Admin panel gaps + AuditLog

Surgical fill of missing admin ops surfaces on top of existing `/admin` tools. **No Stripe Live.** Default commission remains **8%**. Restaurant isolation for non-admin roles is unchanged.

## Already present (verified)

| Tool | Location |
|------|----------|
| Orders list + detail | `/admin/orders`, `/admin/orders/[id]` |
| Status + payment status | order list/detail columns |
| Restaurant + customer | order detail links / fields |
| Manual refund | `AdminRefundForm` → `POST /api/admin/orders/[id]/refund` (#17) |
| Activate / deactivate | freeze/unfreeze → `isActive` on restaurant detail |
| Commission edit | `/admin/restaurants` form → `/admin/restaurants/commission` |
| Payout status | order detail + `/admin/payouts` |
| WayPoints adjustments | `/admin/waypoints` (#14) |

## Added in this PR

| Tool | Location |
|------|----------|
| Manual cancel | `AdminCancelForm` → `POST /api/admin/orders/[id]/cancel` (`admin_cancel` release) |
| Webhook / error log | `/admin/logs` — `PaymentReleaseLog` + `StripeEvent` |
| Email send log | `/admin/emails` — `EmailSendLog` (#19) |
| Audit log viewer | `/admin/audit` |
| AuditLog model | `prisma` + migration `20260913220000_admin_audit_log` |

## Audit writes

Privileged admin actions call `writeAuditLog` (`src/lib/audit.ts`):

- `ORDER_CANCEL`, `ORDER_REFUND`
- `RESTAURANT_FREEZE` / `RESTAURANT_UNFREEZE`
- `COMMISSION_UPDATE`
- `WAYPOINTS_ADJUST`

## Migration / env

- Migration only: `20260913220000_admin_audit_log` (creates `AuditLog`).
- **No new env vars.**

## Tests

```bash
npm run test:admin-audit
npm run test:payment-lifecycle
```
