# Lieferway design system

Tokens live in `src/app/globals.css` as CSS variables. Customer UI is a premium German food-delivery marketplace. Restaurant / courier / admin are denser dashboards.

**Do not copy** Yemeksepeti, Lieferando, or any third-party logos, wordmarks, or illustrated icon sets. The product name stays **Lieferway**.

## Logo

**Locked by owner/designer.** Pink pin + white fork. Do not recreate or recolor logo rasters. Header has no slogan; splash uses **DEIN ESSEN. DEIN VIERTEL. DEIN WEG.** Cache-bust `?v=26`.

- Header / login / footer: `public/Lieferway-header-h64.png`, `h96`, `h128`, `h256` (`Lieferway-header.svg`, `Lieferway-header-from-owner.png`) — pin + wordmark, **no slogan**.
- Splash: `public/Lieferway-splash-lockup.png` / `OWNER-LOCKUP-FINAL.png` / `Lieferway-lockup.png`
- App icon / favicon: `public/icon-pin-fork.svg` (also `favicon.svg`), `favicon-32.png`, `favicon-64.png`.

## Color tokens

UI accent is **pink `#E91E63`**. White canvas, ink `#0F172A`. Soft pink `#FCE4EC` only for tiny accents. No bordo, no cream grounds. Logo rasters stay the locked pink pin+fork — do not recreate.

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#E91E63` | CTAs, selected pills, links, badges |
| `--color-primary-pressed` | `#C2185B` | Button hover / press |
| `--color-primary-soft` | `#FCE4EC` | Tiny washes only |
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
White canvas, compact phone-screen home (location chip, Lieferung/Abholung, search, campaign, categories, Umkreis slider, large food cards). Partner sales stay on `/partner/anmelden` only. Cache `?v=20`.

**Restaurant panel**  
`--color-bg-muted` page, white table/cards, compact type. **Primary only on CTAs**. Nav, filters, and toggles stay outline / ghost / ink.

**Courier / admin**  
Same dashboard density as restaurant.

## UI language

Default **DE**. Header `DE | EN | TR`. Currency EUR (`de-DE` / `en-GB` / `tr-TR`).

## Voice

Short, Frankfurt-local. Restaurant self-delivery (not a courier marketplace). 5% food commission. Default PLZ 60311. No lorem. No fake ratings. No customer-facing Demo stamps. Demo is honest: Stripe mocked.
