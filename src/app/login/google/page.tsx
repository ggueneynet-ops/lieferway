import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getCopy } from "@/lib/get-locale";
import { googleConfigured, safeNext } from "@/lib/google-oauth";
import { interpolate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function GoogleDemoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const q = await searchParams;
  const next = safeNext(q.next);
  const { t } = await getCopy();

  if (googleConfigured()) {
    redirect(`/api/auth/google?next=${encodeURIComponent(next)}`);
  }
  const originHint =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://127.0.0.1:43123";
  const callbackHint = `${originHint}/api/auth/google/callback`;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">{t.googleDemoTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {interpolate(t.googleDemoHint, { callback: callbackHint })}
      </p>
      {q.error === "gmail" ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t.googleGmailOnly}</p>
      ) : null}
      <form action="/api/auth/google/dev" method="post" className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Gmail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue="lieferway.kunde@gmail.com"
            className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
          />
        </div>
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            {t.name}
          </label>
          <input
            id="name"
            name="name"
            defaultValue="Google Kunde"
            className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
          />
        </div>
        <button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary-pressed"
        >
          {t.googleDemoContinue}
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary">
          {t.login}
        </Link>
      </p>
    </div>
  );
}
