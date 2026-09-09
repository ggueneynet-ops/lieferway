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
- Restaurant panel: live kitchen board (SSE + poll), accept/reject, status, **new-order bell** (mute) and flash/badge. Admin creates venue + owner (`lieferway`) and shows credentials once.
- Courier: claim READY jobs, out for delivery, delivered (map stub)
- Admin: restaurants (per-venue commission override), users, orders, courier assign, coupon stub, Monday payout ledger
- Auth with roles (JWT cookie + Bearer for mobile). Customers self-register at `/register`. Restaurants **apply** at `/partner` / `/partner/anmelden` (pending request only — no login, no panel). Admin approves under **Partneranfragen**, then owner credentials are created (`lieferway`) and shown once. Existing partners log in at `/login?next=/restaurant`. Couriers/admin are still created by admin.

Default UI language is **German**. Header switcher: **DE | EN | TR** (cookie + localStorage).

Marketplace layout follows common Turkish food-app patterns (location bar, cuisine rail, dense list, sticky cart) with a Yemeksepeti-like **pink** `#E91E63`. Name and logo stay **Lieferway** — not a third-party clone.

Restaurant and dish photos stay compact left thumbnails.

Restaurant cards and dishes use compact left thumbnails (not large hero photos).

**PLZ / nearby:** On first visit the app asks for location (or uses IP if denied), reverse-geocodes to a German PLZ, and filters restaurants. Choice is saved in a cookie + localStorage. You can still type a PLZ or pick a chip. With a PLZ set, **Umkreis** chips (3 / 5 / 10 km or Stadt) keep only venues within that distance of the PLZ centre (or GPS). Restaurants can set their own max delivery radius. Demo chips: Innenstadt, Nordend, Bockenheim, Sachsenhausen, Bornheim, Höchst (outside most radii).

## iPhone (Safari)

1. Open the public HTTPS URL (Cloudflare tunnel) — required for location.
2. First visit: allow location (Safari) or we approximate via IP. Or tap **Lieferung nach**, type `60311` / pick a chip.
3. Switch to `60487` or `65929` to see the list change. Try **3 km** vs **5 km** vs **10 km** on the Umkreis row.
4. Pull to refresh if an old layout is cached.

Partner onboarding is apply-then-review (not self-serve panel signup):

1. Public form `/partner/anmelden` — business name, cuisine, street, PLZ, contact, email, phone, optional website.
2. Creates a **PartnerApplication** with status `PENDING`. No session, no restaurant row, no owner login.
3. Admin **Partneranfragen**: Approve (creates restaurant + owner, demo password `lieferway`, banner to pass on), mark contacted, or reject.
4. Customers still register at `/register`. Admin **Restaurants** can still add a venue directly.

Existing Partner-Login / Kurier / Admin links stay **login only**.

## Money rules

- Commission = `%` of **food subtotal** (not delivery). Default 5%, overridable per restaurant.
- Card/wallet: platform collects total; restaurant is owed `food − commission`.
- Cash: restaurant/courier collects; **commission is due to the platform** and listed separately on the weekly ledger.
- Delivery fee is never part of the restaurant food payout.

## Out of v1

Real GPS, production Stripe, PayPal, separate native iOS/Android codebases, store submission.
