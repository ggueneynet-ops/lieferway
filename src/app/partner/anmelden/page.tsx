import { Logo } from "@/components/logo";
import { LocaleToggle } from "@/components/locale-toggle";
import { SiteFooter } from "@/components/site-footer";
import { getCopy } from "@/lib/get-locale";
import { CUISINES } from "@/lib/constants";
import { cuisineName } from "@/lib/i18n";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restaurant werden",
  description: "Listen Sie Ihr Restaurant bei Lieferway in Frankfurt. Anfrage senden – Zugang erst nach Freigabe.",
};

export const dynamic = "force-dynamic";

export default async function PartnerApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const q = await searchParams;
  const { t, locale } = await getCopy();

  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-border">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 sm:h-14">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <Link href="/login?next=/restaurant" className="text-sm font-medium text-ink hover:text-primary">
              {t.alreadyPartner}
            </Link>
            <LocaleToggle />
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-white px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{t.becomePartner}</p>
          <h1 className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {t.partnerHeroTitle}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base">{t.partnerHeroLead}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[t.partnerPitchCommission, t.partnerPitchNoContract, t.partnerPitchSelfDelivery].map((pitch) => (
              <p
                key={pitch}
                className="inline-flex rounded-full bg-[#FFF5F8] px-3 py-1 text-[12px] font-semibold text-[#C2185B]"
              >
                {pitch}
              </p>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">{t.partnerPitchLine}</p>
          <p className="mt-4 rounded-2xl border border-[#E8E8EC] bg-white px-4 py-3 text-[15px] font-semibold leading-snug text-[#0F172A]">
            {t.partnerPrinterBenefit}
          </p>
          <p className="mt-5 text-sm text-text-secondary">
            {t.partnerStep1} · {t.partnerStep2} · {t.partnerStep3}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {[
              { value: t.partnerStatCommission, label: t.partnerStatCommissionLabel },
              { value: t.partnerStatSetup, label: t.partnerStatSetupLabel },
              { value: t.partnerStatPayout, label: t.partnerStatPayoutLabel },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[20px] border border-[#E5E7EB] bg-[#FAFAFA] px-6 py-8 sm:px-8 sm:py-10">
                <p
                  className={`font-display font-semibold tracking-tight text-ink ${
                    stat.value.length > 10 ? "text-3xl leading-tight sm:text-4xl" : "text-4xl sm:text-5xl"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-3 text-sm text-text-secondary sm:text-base">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-5 lg:py-10">
        <div className="space-y-4 lg:col-span-2">
          {[
            { title: t.partnerBenefit1Title, body: t.partnerBenefit1Body },
            { title: t.partnerBenefit2Title, body: t.partnerBenefit2Body },
            { title: t.partnerBenefit3Title, body: t.partnerBenefit3Body },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-bg-muted/60 p-4">
              <h2 className="font-display text-base font-semibold text-ink">{b.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            {t.alreadyPartner}{" "}
            <Link href="/login?next=/restaurant" className="font-medium text-primary">
              {t.partnerLogin}
            </Link>
          </p>
        </div>

        <div className="lg:col-span-3">
          {q.ok === "1" ? (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-display text-xl font-semibold text-ink">{t.partnerApplyThanks}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.partnerApplyThanksHint}</p>
              <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">
                {t.toMarketplace}
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold text-ink">{t.partnerFormTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.partnerFormLead}</p>
              {q.error === "duplicate" ? (
                <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t.partnerApplyDuplicate}</p>
              ) : q.error ? (
                <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{q.error}</p>
              ) : null}
              <form action="/partner/apply" method="post" className="mt-5 space-y-3">
                <div>
                  <label htmlFor="businessName" className="text-sm font-medium">
                    {t.businessName}
                  </label>
                  <input
                    id="businessName"
                    name="businessName"
                    required
                    minLength={2}
                    className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                    placeholder="z. B. Café Main"
                  />
                </div>
                <div>
                  <label htmlFor="desiredSlug" className="text-sm font-medium">
                    {t.partnerDesiredSlug}
                  </label>
                  <div className="mt-1 flex items-center gap-0 overflow-hidden rounded-xl border border-border bg-background">
                    <span className="shrink-0 border-r border-border px-3 text-sm text-muted-foreground">lieferway.de/</span>
                    <input
                      id="desiredSlug"
                      name="desiredSlug"
                      minLength={2}
                      className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base"
                      placeholder="cafe-main"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.partnerDesiredSlugHint}</p>
                </div>
                <div>
                  <label htmlFor="cuisine" className="text-sm font-medium">
                    {t.cuisine}
                  </label>
                  <select
                    id="cuisine"
                    name="cuisine"
                    className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                    defaultValue={CUISINES[0]}
                  >
                    {CUISINES.map((c) => (
                      <option key={c} value={c}>
                        {cuisineName(locale, c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="street" className="text-sm font-medium">
                    {t.streetAddress}
                  </label>
                  <input
                    id="street"
                    name="street"
                    required
                    minLength={3}
                    className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="postalCode" className="text-sm font-medium">
                      {t.postal}
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      required
                      inputMode="numeric"
                      maxLength={5}
                      className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base tracking-wide"
                      placeholder={t.plzPlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="text-sm font-medium">
                      {t.city}
                    </label>
                    <input
                      id="city"
                      name="city"
                      defaultValue="Frankfurt am Main"
                      className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contactName" className="text-sm font-medium">
                    {t.contactName}
                  </label>
                  <input
                    id="contactName"
                    name="contactName"
                    required
                    minLength={2}
                    className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="text-sm font-medium">
                      {t.email}
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="text-sm font-medium">
                      {t.phoneNumber}
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                      placeholder="+49 69 …"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="website" className="text-sm font-medium">
                    {t.website}
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    inputMode="url"
                    className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                    placeholder="https://"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="text-sm font-medium">
                    {t.partnerMessage}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="h-14 w-full rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary-pressed"
                >
                  {t.partnerApplySubmit}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
