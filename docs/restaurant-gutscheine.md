# Restaurant-Gutscheine

- No Lieferway platform coupons. Each restaurant manages own codes under **Mehr → Gutscheine**.
- Funding: restaurant 100%. Commission = `commissionPercent` on **food after coupon**. Delivery fee separate (platform-owned).
- WayPoints XOR Gutschein in v1 (`ALLOW_COUPON_WAYPOINTS_STACK=true` to allow stacking later).
- Usage tracked in `CouponUsage`; cancel/full refund restores usage idempotently.
- Admin: list + deactivate only.

Migration: `20260913183000_restaurant_gutscheine`
