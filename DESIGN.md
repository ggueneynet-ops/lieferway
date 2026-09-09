# Lieferway design system

Locked (Logo A default). Tokens live in `src/app/globals.css` as CSS variables. Customer UI is a premium German food app. Restaurant / courier / admin are denser dashboards.

## Logo A (default)

**L + route arrow + shopping bag.**

- Icon: orange squircle `#FF6A00`, bold **L**, delivery route arrow, shopping bag.
- Wordmark: **Lieferway** in Plus Jakarta Sans, ink `#0F172A`.
- Placeholder implementation: `src/components/logo.tsx`, `public/logo-a.svg`, `public/favicon.svg`.
- Swap the SVG when the final asset lands — keep the same 40×40 viewBox and header slot.

Do not use the old map-pin mark.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#FF6A00` | Logo fill, primary CTAs, selected chips |
| `--color-primary-pressed` | `#E55F00` | Button hover / press |
| `--color-primary-soft` | `#FFF0E6` | Soft fills, hero wash, selected rows |
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
White canvas, generous space, photo cards, primary on search/cart/checkout. Hero wash `--color-primary-soft` → white.

**Restaurant panel**  
`--color-bg-muted` page, white table/cards, compact type. **Primary only on CTAs** (Annehmen, Zubereitung, Bereit). Nav, filters, and toggles stay outline / ghost / ink.

**Courier / admin**  
Same dashboard density as restaurant.

## UI language

Default **DE**. Header `DE | TR` toggle. Currency EUR (`de-DE` / `tr-TR`).

## Voice

Short, Frankfurt-local. No lorem. Demo is honest: Stripe mocked, GPS is a map stub.
