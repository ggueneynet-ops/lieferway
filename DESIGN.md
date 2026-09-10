# Lieferway design system

Tokens live in `src/app/globals.css` as CSS variables. Customer UI is a premium German food-delivery marketplace with a **Yemeksepeti-like pink/magenta vibe** (layout + color only). Restaurant / courier / admin are denser dashboards.

**Do not copy** Yemeksepeti (or any third-party) logos, wordmarks, or illustrated icon sets. The product name stays **Lieferway**.

## Logo

**Locked by owner/designer.** Magenta map-pin with a white fork (`#E91E63`). Wordmark: **Liefer** navy + **way** pink. No scooter, no cloche.

- Header / login / footer: `public/Lieferway-header-h64.png`, `Lieferway-header-h96.png`, `Lieferway-header-h128.png` (`Lieferway-header.svg`) — pin + wordmark, **no slogan**. Cache-bust `?v=14`.
- Splash / marketing: `public/Lieferway-lockup.png` / `Lieferway-lockup.svg` — pin + wordmark + slogan **DEIN ESSEN. DEIN VIERTEL. DEIN WEG.**
- App icon / favicon: `public/icon-pin-fork.svg` (also `favicon.svg`), `favicon-32.png`, `favicon-64.png`, `app-icon-1024.png`.
- Scooter lockup is retired. Do not serve or restore scooter assets.

## Color tokens

Yemeksepeti-like pink, not the old orange. Ink and surfaces stay navy / white.

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#E91E63` | Logo fill, CTAs, selected chips, route accent |
| `--color-primary-pressed` | `#C2185B` | Button hover / press |
| `--color-primary-soft` | `#FCE4EC` | Soft fills, selected rows, map stub |
| `--color-secondary` | `#0F172A` | Ink / navy (headings, wordmark) |
| `--color-bg` | `#FFFFFF` | Customer canvas |
| `--color-bg-muted` | `#F4F5F7` | Dashboard canvas, chips |
| `--color-surface` | `#FFFFFF` | Cards, header, sidebar |
| `--color-border` | `#E5E7EB` | Hairlines |
| `--color-text` | `#0F172A` | Body |
| `--color-text-secondary` | `#64748B` | Meta, addresses, hints |
| `--color-text-inverse` | `#FFFFFF` | On primary |
| `--color-success` | `#16A34A` | Delivered / paid |
| `--color-warning` | `#F59E0B` | Placed / pending |
| `--color-danger` | `#DC2626` | Reject / error |

shadcn maps: `--primary` ← primary, `--background` ← bg, `--foreground` ← text, `--muted` ← bg-muted, `--destructive` ← danger.

## Type

- **Inter** (`--font-inter`) — UI, forms, restaurant dashboard.
- **Plus Jakarta Sans** (`--font-jakarta`, `font-display`) — logo wordmark, customer display headings.
- Subsets: `latin` + `latin-ext` (DE umlauts, TR ş/ı/ğ/ü/ö/ç).

## Radius

Customer cards **12–16px** (`rounded-xl` 12 / `rounded-2xl` 16). Inputs and buttons 10–12. Dashboards stay tighter (8–12).

## Surfaces

**Customer (marketplace)**  
White canvas, dense food-app layout: sticky location/PLZ bar, cuisine icon rail, compact restaurant rows, sticky cart. Primary pink on CTAs, chips, ratings, location pin. Soft pink (`--color-primary-soft`) for selected cuisine and map stub.

**Restaurant panel**  
`--color-bg-muted` page, white table/cards, compact type. **Primary only on CTAs** (Annehmen, Zubereitung, Bereit). Nav, filters, and toggles stay outline / ghost / ink.

**Courier / admin**  
Same dashboard density as restaurant. Map stub wash uses `--color-primary-soft`.

## UI language

Default **DE**. Header `DE | EN | TR`. Currency EUR (`de-DE` / `en-GB` / `tr-TR`).

## Voice

Short, Frankfurt-local. No lorem. Demo is honest: Stripe mocked, GPS is a map stub.
