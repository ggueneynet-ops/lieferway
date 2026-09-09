# Lieferway

Germany-focused food delivery for Frankfurt am Main. Customers pay the **platform**. Restaurants keep food minus commission (default **5%**). Delivery fee stays with Lieferway. Weekly restaurant payouts on **Monday**.

Web: Next.js App Router · TypeScript · Tailwind · shadcn/ui  
Mobile: Expo (React Native) against the same API  
Data: Prisma + SQLite

## Demo logins

Password for all accounts: `lieferway`

| Role | E-Mail |
| --- | --- |
| Customer | `kunde@lieferway.de` |
| Customer (TR locale) | `muster@lieferway.de` |
| Restaurant (Anadolu Grill) | `restaurant@lieferway.de` |
| Courier | `kurier@lieferway.de` |
| Admin | `admin@lieferway.de` |

Coupons: `WILLKOMMEN10`, `FRANKFURT`, `HOSGELDIN`.

## Run locally

```bash
cp .env.example .env
npm install
npm run setup          # prisma generate + db push + seed
npm run dev            # http://127.0.0.1:43123
```

### Expo customer app

```bash
cd mobile
npm install
# point at the web API
export EXPO_PUBLIC_API_URL=http://127.0.0.1:43123
npx expo start
```

On a physical device, use your machine LAN IP instead of `127.0.0.1`.  
`npx expo start --web` also works for a quick browser check.

## What is in v1

- Customer: browse seeded Frankfurt restaurants, menu, cart, checkout, live status
- Payments: Stripe **mock** (card / Apple Pay / Google Pay UI) + cash. Structure in `src/lib/payments.ts` for a real Stripe swap later
- Restaurant panel: menu CRUD, accept/reject, kitchen statuses
- Courier: claim READY jobs, out for delivery, delivered (map stub)
- Admin: restaurants (per-venue commission override), users, orders, courier assign, coupon stub, Monday payout ledger
- Auth with roles (JWT cookie + Bearer for mobile)

Default UI language is **German**. Header switcher: **DE | EN | TR** (cookie + localStorage).

Restaurant cards and dishes use local food photos (plus a small letter logo on each venue).

Admin **Restaurants** uses a short HTML form (no client JS). Submit creates an owner account (`lieferway`) and lists the venue on the marketplace.

## Money rules

- Commission = `%` of **food subtotal** (not delivery). Default 5%, overridable per restaurant.
- Card/wallet: platform collects total; restaurant is owed `food − commission`.
- Cash: restaurant/courier collects; **commission is due to the platform** and listed separately on the weekly ledger.
- Delivery fee is never part of the restaurant food payout.

## Out of v1

Real GPS, production Stripe, PayPal, separate native iOS/Android codebases, store submission.
