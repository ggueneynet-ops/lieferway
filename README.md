# Lieferway

Germany-focused food delivery for Frankfurt am Main. Customers pay the **platform**. **The restaurant delivers the order itself** (no courier marketplace). Restaurants keep food minus commission (default **8%**). Delivery fee stays with Lieferway. Weekly restaurant payouts on **Monday**.

Web: Next.js App Router · TypeScript · Tailwind · shadcn/ui  
Mobile: Expo (React Native) against the same API  
Data: Prisma + PostgreSQL (Neon / Vercel Postgres in production; Docker Postgres locally)

## Demo logins

Password for all accounts: `lieferway`

| Role | E-Mail | Public? |
| --- | --- | --- |
| Customer | `kunde@lieferway.de` | Yes |
| Customer (TR locale) | `muster@lieferway.de` | Yes |
| Restaurant (Anadolu Grill) | `restaurant@lieferway.de` | Partner login in footer |
| Admin | `admin@lieferway.de` | Hidden `/admin` only |
| Courier (legacy) | `kurier@lieferway.de` | Hidden `/courier` — not a marketplace |

Coupons: platform demo codes removed (restaurant Gutschein + WayPoints; no stack in v1). Launch Week: selected restaurants (`pasta-e-basta`, `mainhattan-burger`, `green-bowl`) show **0 € Liefergebühr**.

WayPoints (optional loyalty): restaurant **Mehr → WayPoints** (default off). Earn rate is admin-configurable (default 1 € = 10 WP), credited on **DELIVERED**. Commission stays **8 %**. See [docs/waypoints.md](docs/waypoints.md).

## Run locally

Postgres is required (SQLite is gone).

```bash
docker compose up -d    # local Postgres on :5432
cp .env.example .env
# set DATABASE_URL="postgresql://lieferway:lieferway@127.0.0.1:5432/lieferway"
npm install
npm run setup          # prisma generate + migrate deploy + seed
npm run dev            # http://127.0.0.1:43123
```

Or point `DATABASE_URL` at a Neon/Vercel Postgres URL instead of Docker. Format: `postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require`.

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

## Production (Vercel)

Target origin: **https://app.lieferway.de**. Framework defaults — no `vercel.json`. Prisma provider is **postgresql**.

Set `DATABASE_URL` to a hosted Postgres URL (Neon or Vercel Postgres):

```
postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

After the first database is created, apply migrations and (optionally) demo seed **once**:

```bash
npx prisma migrate deploy
npx prisma db seed
```

`npx prisma db seed` **wipes** restaurants and orders. To restore demo logins (`restaurant@lieferway.de`, `admin@lieferway.de`, … / `lieferway`) on a live database without touching restaurants:

```bash
npm run db:ensure-demo-users
```

Invoice PDFs (`data/invoices`) and restaurant logo uploads (`public/uploads/logos`) still use local disk — they will not persist on Vercel. Follow-up is Vercel Blob; it does not block this Prisma switch.

Required env on Vercel:

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` |
| `AUTH_SECRET` | long random string (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://app.lieferway.de` |
| `EXPO_PUBLIC_API_URL` | `https://app.lieferway.de` |

Transactional email: see `docs/transactional-email.md`. Optional: `EMAIL_FROM` / `MAIL_FROM`, `RESEND_API_KEY` / `SMTP_*` / `MAIL_WEBHOOK_URL`, `LIEFERWAY_LEGAL_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Stripe Connect test mode (card / wallets): `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. Setup: [docs/stripe-connect.md](docs/stripe-connect.md).

Owner steps after Vercel Sign Up: Import this Git repo → Framework Preset **Next.js** → paste the env vars → Deploy. Then Project → Settings → Domains → add `app.lieferway.de`. DNS: **CNAME** `app` → `cname.vercel-dns.com`.

Full checklist: [docs/vercel.md](docs/vercel.md).

## What is in v1

- Customer: browse seeded Frankfurt restaurants, menu, cart, checkout, live status. **In-app toasts** + order page polling when logged in. **Email** on placed / accepted (with prep ETA) / rejected / out for delivery / delivered — Resend, SMTP, or webhook; otherwise a clear demo log. After checkout, a **PDF Rechnung** (Bestellbeleg) is generated, attached to the placed email, and downloadable on the order page. Inbox on **Konto**.
- Payments: Stripe Connect **test mode** (Express destination charges + Payment Element) + cash. See [docs/stripe-connect.md](docs/stripe-connect.md). Online orders stay `PENDING_PAYMENT` until `payment_intent.succeeded`.
- Restaurant panel: live kitchen board (SSE + poll), accept/reject, status. **Alarm** (short siren pulse) on new (PLACED) tickets repeats until none are new (Annehmen or Ablehnen or Stumm); first tap unlocks audio. Default on. **Lieferbon drucken** on Heute and Bestellungen opens an 80mm kitchen/courier slip (`window.print()`) with the **restaurant logo** at the top — not a legal invoice. **Bestellungen** date filter (Heute / Gestern / Datum, Angenommen + Abgelehnt). Restaurant marks orders ready for **its own delivery**. **Lieferung**: editable Lieferzeit (min–max minutes on marketplace cards), Mindestbestellwert, Liefergebühr, radius. **Finanzen**: monthly **Provisionsrechnung** (draft PDF).
- Admin: hidden URL `/admin` (not linked in the public footer). Restaurants, users, orders, Monday payout ledger, **Rechnungen** (commission drafts). E-Rechnung (ZUGFeRD/XRechnung) is stubbed as “coming”.
- Auth with roles (JWT cookie + Bearer for mobile). Customers self-register at `/register` (**phone required**) or **Mit Google anmelden**. Restaurants **apply** at `/partner` / `/partner/anmelden`. Existing partners log in at `/login?next=/restaurant`.

Default UI language is **German**. Header switcher: **DE | EN | TR** (cookie + localStorage).

Marketplace layout: compact address row, prominent search, food-photo category circles, **large hero restaurant cards**. UI accent is pink `#E91E63` on white. Logo rasters are the locked pink pin+fork. Cache `?v=34`. Partnership copy stays on `/partner/anmelden` only.

Customer home shows food photos, prices, Mindestbestellwert, Liefergebühr, and Lieferzeit. Partnership copy (8 % Provision, Auszahlung montags) is on `/partner/anmelden` only.

Marketplace restaurant cards use wide food photos plus name, cuisine, ETA, min order, delivery fee, rating or Neu, and badges (Beliebt, Restaurant liefert). Demo-Modus is a single info chip — not a stamp on every photo.

**Standort:** On marketplace load, GPS runs once (`getCurrentPosition`, no watch). A successful fix **overwrites** cookies and `localStorage` (`lw_plz`) with the GPS PLZ/city/lat/lng — leftover Frankfurt does not win. If permission is denied, the header chip is **Standort wählen** (location sheet opens); demo-seeded Frankfurt is cleared unless the user **explicitly** picked an address/PLZ (`lw_geo_source=manual`). Tapping **Aktueller Standort** always calls `getCurrentPosition` again (`maximumAge: 0`). Restaurant filters follow that same active location.

## iPhone (Safari)

1. Open the **public HTTPS** Cloudflare URL (Safari only allows GPS in a secure context).
2. Allow location when prompted, or tap the header chip → **Aktueller Standort**. A GPS fix overwrites any leftover Frankfurt cookie. The chip shows `{Stadt} · {PLZ}`.
3. If Safari blocks GPS, the chip is **Standort wählen** — type a PLZ or address. Tapping **Aktueller Standort** asks again (it does not remember a prior denial forever).
4. Try **3 km** vs **5 km** vs **10 km** on the Umkreis row. Pull to refresh if an old layout is cached (`?v=34`).

Partner onboarding is apply-then-review (not self-serve panel signup):

1. Public form `/partner/anmelden` — business name, cuisine, street, PLZ, contact, email, phone, optional website.
2. Creates a **PartnerApplication** with status `PENDING`. No session, no restaurant row, no owner login.
3. Admin **Partneranfragen**: Approve (creates restaurant + owner, demo password `lieferway`, banner to pass on), mark contacted, or reject.
4. Customers still register at `/register`. Admin **Restaurants** can still add a venue directly.

Restaurant vanity URLs: `/{slug}` (also `/restaurants/{slug}`). Example: `/anadolu-grill`. Collision suffix is `-frankfurt`. Partners copy the link and download a QR from **Einstellungen** / **Mehr**. Admin can edit the slug; partner apply can suggest one.

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

## Customer notifications

The restaurant **Annehmen** / **Ablehnen** path (and later Unterwegs / Geliefert) writes a `CustomerNotice` and emails the customer’s account address. The same hook powers optional **Browser Notifications** (see `docs/browser-notifications.md` — HTTPS required; no service worker).

Copy is **German by default**, using `user.locale` when set (`de` / `en` / `tr`).

Mail send order (first configured wins):

```
RESEND_API_KEY=re_...
# or
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
# or
MAIL_WEBHOOK_URL=https://example.com/mail-hook
MAIL_FROM=Lieferway <noreply@lieferway.de>
# Allowed alternative (verified sender): MAIL_FROM=Lieferway <info@lieferway.de>
```

Without those, the server logs `[lieferway mail demo] no RESEND_API_KEY/SMTP_HOST — not sent` and still stores the in-app notice.

**Customer phone is mandatory.** Register requires a number (German format preferred, e.g. `+49 171 1234567`). After Google sign-in, if no phone is on file, Lieferway sends you to **Telefonnummer angeben** before you can order. Checkout (UI and `POST /api/orders`) refuses orders without a valid phone. Kitchen tickets and courier cards show the number for contact.

## Money rules

- Commission = `%` of **food subtotal** (not delivery). Default 8%, overridable per restaurant.
- Card/wallet: platform collects total; restaurant is owed `food − commission`.
- Cash: restaurant/courier collects; **commission is due to the platform** and listed separately on the weekly ledger.
- Delivery fee is never part of the restaurant food payout.

## Out of v1

Real GPS, production Stripe, PayPal, separate native iOS/Android codebases, store submission.
