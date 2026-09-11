# Deploy Lieferway to Vercel (`app.lieferway.de`)

Customer UI, GPS, and PLZ logic stay as on `main` (v33). This file is deploy prep only.

There is no `vercel.json`. Next.js on Vercel uses framework defaults (`npm run build` → `prisma generate && next build`).

## (a) Readiness checklist

Do this in Vercel after Sign Up (this environment cannot create the project — no Vercel team/token):

1. Put the app in a Git host Vercel can import (GitHub / GitLab / Bitbucket). Then **Add New → Project → Import**.
2. Framework Preset: **Next.js**. Root directory: `/`. Build command: leave default (`prisma generate && next build` from `package.json`).
3. Set **Production** environment variables (see below). Do **not** leave `DATABASE_URL` as `file:./dev.db`.
4. Deploy. Confirm `https://<project>.vercel.app` loads.
5. **Settings → Domains** → add `app.lieferway.de`.
6. At the DNS host for `lieferway.de`, add a **CNAME** for `app` → `cname.vercel-dns.com` (Vercel shows the exact target if it differs).
7. Google OAuth (if used): add `https://app.lieferway.de/api/auth/google/callback` as an authorized redirect URI.
8. Point Expo / QR / partner links at `https://app.lieferway.de` via `NEXT_PUBLIC_APP_URL` and `EXPO_PUBLIC_API_URL`.

Local demo stays `npm run dev` on `http://127.0.0.1:43123`. Do not hardcode Cloudflare tunnel URLs in env examples.

## (b) DB / backend blocker

**Current database is local SQLite** (`prisma/schema.prisma` `provider = "sqlite"`, `.env.example` `DATABASE_URL="file:./dev.db"`).

| Piece | On Vercel today |
| --- | --- |
| Next.js App Router + API routes | Yes — serverless, as-is |
| Prisma Client (`postinstall` / `build` generate) | Yes, once `DATABASE_URL` is set at build |
| SQLite file DB | **No** — ephemeral disk, not shared between lambdas |
| Invoice PDFs (`data/invoices`) | Ephemeral — PDFs vanish after the instance recycles |
| Restaurant logo uploads (`public/uploads/logos`) | Same — uploads are not durable |
| Kitchen SSE (`/api/restaurant/orders/stream`) | Often flaky on serverless; the panel already has a poll fallback |

**Smallest production DB path (not implemented until asked):**

1. Create a Postgres database (Neon or Vercel Postgres).
2. Change Prisma `datasource.provider` from `"sqlite"` to `"postgresql"`.
3. Set `DATABASE_URL` (and usually `DIRECT_URL` for migrations) to the pooled/direct URLs.
4. Run `prisma migrate deploy` (or `db push` once) against that database, then seed if you want demo accounts.
5. Optionally store invoice PDFs and logos on object storage (Blob / S3) later — not required to boot the app.

Do not ship SQLite to `app.lieferway.de`. A deploy with `file:./dev.db` will look like it builds and then lose orders, sessions, and restaurants between requests.

## Environment variables

Required:

```
DATABASE_URL=           # Postgres in production; file:./dev.db is local only
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

## (d) DNS

Once the Vercel project exists and `app.lieferway.de` is added as a domain:

```
app.lieferway.de.  CNAME  cname.vercel-dns.com.
```

Use the target Vercel prints in **Domains** if it is not `cname.vercel-dns.com`.
