# Lieferway

Germany-focused food delivery for Frankfurt am Main. Customers pay the **platform**. **The restaurant delivers the order itself** (no courier marketplace). Restaurants keep food minus commission (default **5%**). Delivery fee stays with Lieferway. Weekly restaurant payouts on **Monday**.

Web: Next.js App Router · TypeScript · Tailwind · shadcn/ui  
Mobile: Expo (React Native) against the same API  
Data: Prisma + SQLite

## Demo logins

Password for all accounts: `lieferway`

| Role | E-Mail | Public? |
| --- | --- | --- |
| Customer | `kunde@lieferway.de` | Yes |
| Customer (TR locale) | `muster@lieferway.de` | Yes |
| Restaurant (Anadolu Grill) | `restaurant@lieferway.de` | Partner login in footer |
| Admin | `admin@lieferway.de` | Hidden `/admin` only |
| Courier (legacy) | `kurier@lieferway.de` | Hidden `/courier` — not a marketplace |

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
- Restaurant panel: live kitchen board (SSE + poll), accept/reject, status, **new-order bell** (repeats until Annehmen). **Bon drucken** on tickets. **Bestellungen** date filter (Heute / Gestern / Datum). Restaurant marks orders ready for **its own delivery**. **Lieferung**: editable Lieferzeit (min–max minutes on marketplace cards), Mindestbestellwert, Liefergebühr, radius.
- Admin: hidden URL `/admin` (not linked in the public footer). Restaurants, users, orders, Monday payout ledger.
- Auth with roles (JWT cookie + Bearer for mobile). Customers self-register at `/register` (**phone required**) or **Mit Google anmelden**. Restaurants **apply** at `/partner` / `/partner/anmelden`. Existing partners log in at `/login?next=/restaurant`.

Default UI language is **German**. Header switcher: **DE | EN | TR** (cookie + localStorage).

Marketplace layout follows common Turkish food-app patterns (location bar, cuisine rail, dense list, sticky cart) with a Yemeksepeti-like **pink** `#E91E63`. Logo is the locked pink scooter + cloche: header uses the single-piece lockup image only; splash uses vertical master A. Name stays **Lieferway**.

Restaurant and dish photos stay compact left thumbnails.

Restaurant cards and dishes use compact left thumbnails (not large hero photos).

**Standort:** Default **Lieferung nach** is Frankfurt **60311** (Innenstadt). Tap it → **Aktueller Standort** (GPS only on that tap, as Safari requires). Success fills street + PLZ + city and filters the list. If GPS is denied, type an address. IP approx is used only when GPS times out and the IP is in the Frankfurt area — never a random German zip like 49661.

## iPhone (Safari)

1. Open the **public HTTPS** Cloudflare URL (Safari only allows GPS in a secure context).
2. Tap **Lieferung nach**, then **Aktueller Standort**, and allow location. Street + PLZ should fill.
3. If Safari blocks GPS: type `60311` / a street, or we may offer an IP approximation **only** if it is in Frankfurt.
4. Try **3 km** vs **5 km** vs **10 km** on the Umkreis row. Pull to refresh if an old layout is cached.

Partner onboarding is apply-then-review (not self-serve panel signup):

1. Public form `/partner/anmelden` — business name, cuisine, street, PLZ, contact, email, phone, optional website.
2. Creates a **PartnerApplication** with status `PENDING`. No session, no restaurant row, no owner login.
3. Admin **Partneranfragen**: Approve (creates restaurant + owner, demo password `lieferway`, banner to pass on), mark contacted, or reject.
4. Customers still register at `/register`. Admin **Restaurants** can still add a venue directly.

Existing public footer: Restaurant werden · Über Lieferway · Hilfe · Datenschutz · Impressum. Admin is only `/admin` (unlisted). There is no public courier signup.

## Google sign-in (customers)

The **Mit Google anmelden** button is on `/login` and `/register` (not on partner login).

Without credentials the button opens a **demo stub** (`/login/google`) that creates a customer from a `@gmail.com` address. Restaurant / courier / admin emails cannot be used.

To enable real Google OAuth:

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client (Web application).
2. Authorized redirect URI: `{your origin}/api/auth/google/callback`  
   Example locally: `http://127.0.0.1:43123/api/auth/google/callback`  
   On a phone, also add the public HTTPS origin.
3. Put values in `.env` and restart:

```
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=....
NEXT_PUBLIC_APP_URL=https://your-origin.example
```

OAuth is wired into the existing JWT session (same cookie as email/password). We did not add a second auth library.

**Customer phone is mandatory.** Register requires a number (German format preferred, e.g. `+49 171 1234567`). After Google sign-in, if no phone is on file, Lieferway sends you to **Telefonnummer angeben** before you can order. Checkout (UI and `POST /api/orders`) refuses orders without a valid phone. Kitchen tickets and courier cards show the number for contact.

## Money rules

- Commission = `%` of **food subtotal** (not delivery). Default 5%, overridable per restaurant.
- Card/wallet: platform collects total; restaurant is owed `food − commission`.
- Cash: restaurant/courier collects; **commission is due to the platform** and listed separately on the weekly ledger.
- Delivery fee is never part of the restaurant food payout.

## Out of v1

Real GPS, production Stripe, PayPal, separate native iOS/Android codebases, store submission.
