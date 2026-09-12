# Deploy Lieferway to Vercel (`app.lieferway.de`)

Customer UI, GPS, and PLZ logic stay as on `main` (v33). Prisma uses **PostgreSQL**.

There is no `vercel.json`. Next.js on Vercel uses framework defaults (`npm run build` → `prisma generate && next build`).

## DATABASE_URL (one line)

```
postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

| Source | What to paste |
| --- | --- |
| **Neon** | Dashboard → Connection string. Use the **direct** (non-`pooler`) host for `prisma migrate`. Example: `postgresql://USER:PASSWORD@ep-XXXX.REGION.aws.neon.tech/neondb?sslmode=require` |
| **Vercel Postgres** | Project → Storage → `.env.local` tab → `DATABASE_URL` |
| **Local** | `docker compose up -d` then `postgresql://lieferway:lieferway@127.0.0.1:5432/lieferway` |

Do not use `file:./dev.db`. After the first Postgres database exists, apply schema + optional demo rows **once**:

```bash
npx prisma migrate deploy
npx prisma db seed
```

(`npm run setup` runs both.) Later deploys only need `migrate deploy` when there are new migration folders. Seed is optional after the first time (it wipes and recreates demo accounts).

## (a) Readiness checklist

Do this in Vercel after Sign Up (this environment cannot create the project — no Vercel team/token):

1. Put the app in a Git host Vercel can import (GitHub / GitLab / Bitbucket). Then **Add New → Project → Import**.
2. Framework Preset: **Next.js**. Root directory: `/`. Build command: leave default (`prisma generate && next build` from `package.json`).
3. Create Neon or Vercel Postgres. Set **Production** env vars, including `DATABASE_URL` (format above).
4. From a machine with that `DATABASE_URL`: `npx prisma migrate deploy` then optionally `npx prisma db seed`.
5. Deploy. Confirm `https://<project>.vercel.app` loads.
6. **Settings → Domains** → add `app.lieferway.de`.
7. At the DNS host for `lieferway.de`, add a **CNAME** for `app` → `cname.vercel-dns.com` (Vercel shows the exact target if it differs).
8. Google OAuth (if used): add `https://app.lieferway.de/api/auth/google/callback` as an authorized redirect URI.
9. Point Expo / QR / partner links at `https://app.lieferway.de` via `NEXT_PUBLIC_APP_URL` and `EXPO_PUBLIC_API_URL`.

Local demo stays `npm run dev` on `http://127.0.0.1:43123`. Do not hardcode Cloudflare tunnel URLs in env examples.

## Backend on Vercel

| Piece | On Vercel |
| --- | --- |
| Next.js App Router + API routes | Yes |
| Prisma Client (`postinstall` / `build` generate) | Yes, with `DATABASE_URL` at runtime |
| PostgreSQL (Neon / Vercel Postgres) | Yes — required |
| Invoice PDFs (`data/invoices`) | **Ephemeral disk** — files vanish after the instance recycles. Follow-up: store PDFs in **Vercel Blob** (or S3) and save the URL in `Invoice.pdfPath`. Does not block the Prisma switch. |
| Restaurant logo uploads (`public/uploads/logos`) | Same ephemeral disk. Follow-up: **Vercel Blob**. Seed logos under `/public/media/logos` are fine (git). |
| Kitchen SSE (`/api/restaurant/orders/stream`) | Often flaky on serverless; the panel already has a poll fallback |

## Environment variables

Required:

```
DATABASE_URL=           # postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
AUTH_SECRET=            # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://app.lieferway.de
EXPO_PUBLIC_API_URL=https://app.lieferway.de
```

Optional mail (first match wins: Resend → SMTP → webhook → demo log):

```
MAIL_FROM=Lieferway <noreply@lieferway.de>
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
MAIL_WEBHOOK_URL=
```

Optional legal (invoice issuer; unset fields stay “Demo-Platzhalter”):

```
LIEFERWAY_LEGAL_NAME=
LIEFERWAY_ADDRESS=
LIEFERWAY_UST_ID=
```

Optional Google customer login:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Stripe Connect test mode (never expose the secret or webhook secret to the browser):

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Webhook URL: `https://app.lieferway.de/api/stripe/webhook` (also enable Connect events). Details: [stripe-connect.md](./stripe-connect.md).

## DNS

Once the Vercel project exists and `app.lieferway.de` is added as a domain:

```
app.lieferway.de.  CNAME  cname.vercel-dns.com.
```

Use the target Vercel prints in **Domains** if it is not `cname.vercel-dns.com`.
