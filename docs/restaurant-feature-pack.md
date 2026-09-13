# Restaurant feature pack

Restaurant-scoped features (isolation: owner/admin panel only for own restaurant; favorites user-bound).

## Features

1. **Vorbestellung** — optional per restaurant (`preorderEnabled`). Panel: max days, min lead, weekdays/hours, delivery/pickup, optional max concurrent. Disabling stops **new** preorders only. Checkout date/time only when enabled. Closed restaurants can still accept valid scheduled preorders.
2. **Ausverkauft** — existing `MenuItem.isAvailable` + menu toggle; public add disabled; order create requires `isAvailable`; status labels Verfügbar|Ausverkauft; one-click re-enable (no delete).
3. **Favoriten** — heart on public restaurant page; `/account/favorites`; `FavoriteRestaurant` user-bound.
4. **Erneut bestellen** — order detail button; re-adds with **current** menu/prices; toast messages for removed/sold-out/price changes (never blind old prices).
5. **Link/QR** — existing `/{slug}` + PersonalOrderLink/QR; alias `/r/{slug}` redirects to `/{slug}`.
6. **Banner** — `bannerText` / active / optional dates on public page.
7. **Angebote** — `RestaurantOffer` restaurant-funded display promos (`funding=RESTAURANT` only). Not platform-financed. Checkout discounts remain via Gutscheine.

## Migration / env

- Migration: `prisma/migrations/20260913200000_restaurant_feature_pack`
- No new env vars. Stripe Live unchanged.

## APIs

- `GET/PATCH /api/restaurant/preorder`
- `GET/PATCH /api/restaurant/banner`
- `GET/POST/PATCH /api/restaurant/offers`
- `GET /api/restaurants/[slug]/preorder`
- `GET/POST/DELETE /api/favorites`
- `GET /api/orders/[id]/reorder`
- Existing QR: `GET /api/restaurants/[slug]/qr`

## Safety

- Does not change commission (8%), WayPoints, Gutscheine funding rules, Stripe Connect, or legal pages.
- Restaurant A cannot mutate B (ownerId scoping / admin demo restaurant only).
