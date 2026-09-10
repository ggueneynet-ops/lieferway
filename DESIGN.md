# Lieferway design system

Tokens live in `src/app/globals.css` as CSS variables. Customer UI is a premium German food-delivery marketplace. Restaurant / courier / admin are denser dashboards.

**Do not copy** Yemeksepeti, Lieferando, or any third-party logos, wordmarks, or illustrated icon sets. The product name stays **Lieferway**.

## Logo

**Locked by owner/designer.** Premium pink map-pin with a white fork (`#E91E63`). Wordmark: **Liefer** navy `#0F172A` / ink `#0F172A` + **way** pink. No scooter, no cloche. **Not** Lieferando orange. **Not** bordo.

- Header / login / footer: `public/Lieferway-header-h64.png`, `h96`, `h128`, `h256` (`Lieferway-header.svg`, `Lieferway-header-from-owner.png`) — pin + wordmark, **no slogan**. Cache-bust `?v=17`.
- Splash: `public/Lieferway-splash-lockup.png` / `OWNER-LOCKUP-FINAL.png` / `Lieferway-lockup.png` — pin + wordmark + slogan **DEIN ESSEN. DEIN VIERTEL. DEIN WEG.**
- App icon / favicon: `public/icon-pin-fork.svg` (also `favicon.svg`), `favicon-32.png`, `favicon-64.png`, `app-icon-1024.png`.
- Source: `lieferway/brand-premium/logo/` (owner lock). Scooter lockup is retired. No serif, no bordo.

## Color tokens

Premium **pink accent only** (`#E91E63`). Mix: ~70–75% white/light, 15–20% dark/neutral structure, 10–15% pink. Pink is for CTAs, active tabs/filters, key icons, small accents, and price/action emphasis — never large pink hero fills or playful pink slabs.

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#E91E63` | Logo pin, CTAs, selected pills, links, badges, small icons |
| `--color-primary-pressed` | `#C2185B` | Button hover / press |
| `--color-primary-soft` | `#FFF5F8` | Tiny section wash only |
| `--color-secondary` | `#0F172A` | Ink (headings, body) |
| `--color-bg` | `#FFFFFF` | Customer canvas |
| `--color-bg-muted` | `#F7F7F8` | Dashboard canvas, chips |
| `--color-surface` | `#FFFFFF` | Cards, header, sidebar |
| `--color-border` | `#E8E8EC` | Hairlines |
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
- Hierarchy: bold modern sans, generous spacing.

## Radius & elevation

Customer cards **12–16px** (`rounded-xl` 12 / `rounded-2xl` 16). Soft shadows. Inputs and buttons 10–12. Dashboards stay tighter (8–12).

## Surfaces

**Customer (marketplace)**  
White canvas, dense food-app layout: sticky location/PLZ bar, cuisine pill rail, restaurant cards, sticky cart. Pink only on CTAs, active filters, ratings, location pin.

**Restaurant panel**  
`--color-bg-muted` page, white table/cards, compact type. **Primary only on CTAs**. Nav, filters, and toggles stay outline / ghost / ink.

**Courier / admin**  
Same dashboard density as restaurant.

## UI language

Default **DE**. Header `DE | EN | TR`. Currency EUR (`de-DE` / `en-GB` / `tr-TR`).

## Voice

Short, Frankfurt-local. Restaurant self-delivery (not a courier marketplace). 5% food commission. Default PLZ 60311. No lorem. No fake ratings. No customer-facing Demo stamps. Demo is honest: Stripe mocked.
