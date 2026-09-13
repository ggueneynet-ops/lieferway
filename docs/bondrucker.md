# Bondrucker / Lieferbon (80 mm)

Restaurant kitchen + Bestellungen use a **browser print** Lieferbon (`window.print()`), not a direct ESC/POS socket. Optional hardware is marketed as a one-time **99 €** 80 mm Bondrucker (partner signup copy + AGB §11.7). Purchase is optional — not required to use Lieferway.

## Flow (already on main)

1. Order is **persisted in Postgres** first (checkout / payment lifecycle). Print never owns order storage.
2. Kitchen board (`restaurant-orders`) and **Bestellungen** (`/restaurant/orders`) show **Lieferbon drucken** / **Erneut drucken**.
3. Client fetches `GET /api/restaurant/orders/[id]/bon` → UTF-8 HTML (`Content-Type: text/html; charset=utf-8`).
4. Popup writes HTML and calls `print()`, or falls back to `/restaurant/bon/[id]` (iframe + print).

## Offline / failed printer

| Failure | Order data | Panel | Reprint |
| --- | --- | --- | --- |
| Printer offline / paper out | Kept in DB | Visible on Heute + Bestellungen | **Erneut drucken** / same API |
| Popup blocked | Kept | Visible | Opens `/restaurant/bon/[id]` |
| Fetch 4xx/5xx | Kept | Visible | Toast + offline hint; retry button |

**Orders are never deleted or hidden because print failed.** Print is best-effort UX only.

## Layout (80 mm)

Hardened in `src/lib/bon.ts`:

- `@page { size: 80mm auto }` ticket width ~74 mm
- `overflow-wrap` / `word-break` so long product names, notes, addresses do not clip
- Quantity + name; optional **Extras** line (`extras` field or `Name — extras` / `Name (extras)` parsing)
- Customer note, phone, address (delivery) or Abholung banner
- Delivery vs pickup banner, payment method, total, **Bestell-Nr.** (`shortCode`), Berlin timestamp
- UTF-8 meta + German-capable font stack (Arial / Noto / DejaVu) for **äöüß**

## Marketing copy (keep)

- i18n `partnerPrinterBenefit` — “Optionaler 80-mm-Bondrucker: 99 € einmalig…”
- Partner page `/partner/anmelden`
- AGB `docs/legal/agb.md` §11.7

## Verify locally

```bash
npm run test:bon
```

Generates fixture HTML with long names, extras, German chars, notes, address, phone, delivery/pickup, payment, total, order id, timestamp — and asserts charset + no Latin-1 mangling.

## Leftovers / not in this PR

- No separate `OrderItem.extras` column yet (menu extras product feature). Long names / parenthetical extras / notes cover kitchen today.
- No ESC/POS raw driver or cloud print queue — browser dialog only.
- No Stripe Live / payment changes.
