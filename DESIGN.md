# Lieferway design tokens

Professional, modern, trustworthy food-delivery UI. Orange primary, warm neutrals, German-first copy with a TR toggle.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| Brand orange | `#F05A00` | Logo mark, primary buttons, chips on |
| Brand dark | `#C44700` | Pressed / hover |
| Ink | `#2A1F18` | Headings |
| Muted | `#6B5A4E` | Meta, addresses |
| Canvas | `#FFF8F3` / `oklch(0.995 0.004 75)` | Page background |
| Card | `#FFFFFF` | Surfaces |
| Border | `oklch(0.91 0.015 70)` | Hairlines |
| Radius | `0.8rem` | Cards, inputs, buttons |

CSS variables live in `src/app/globals.css` (`--primary`, `--brand`, `--background`, …).

OKLCH primary: `oklch(0.67 0.21 45)` — maps to the brand orange for Tailwind `bg-primary`.

## Type

- **Inter** with `latin` + `latin-ext` (German umlauts, Turkish ş/ı/ğ/ü/ö/ç).
- Headings: semibold, tight tracking.
- Body: regular, muted for secondary.

## UI language

- Default **DE**. Persistent `DE | TR` toggle in the header (`lw_locale`).
- Restaurant names and menus stay authentic (Anadolu, Pide, Grüne Soße).
- Currency always EUR with `de-DE` or `tr-TR` formatting.

## Components

- shadcn/ui (Radix) primitives: Button, Input, Card, Badge, Dialog, Table.
- Restaurant cards: 16:9 photo, cuisine pill, rating, ETA, delivery fee, min order.
- Status colors: amber placed → orange preparing → blue out → green delivered.

## Voice

Short, concrete, Frankfurt-local. No lorem. No “Welcome to your app.”
Demo is honest: Stripe is mocked; GPS is a map stub.
