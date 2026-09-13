import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCopy } from "@/lib/get-locale";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerWayPointsPage } from "@/lib/waypoints-service";
import { formatEUR } from "@/lib/money";
import { interpolate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function WayPointsPage() {
  const { t, locale } = await getCopy();
  const session = await getSession();
  const data =
    session && (session.role === "CUSTOMER" || session.role === "ADMIN")
      ? await customerWayPointsPage(session.id)
      : null;
  const restaurants =
    data?.restaurants ??
    (await prisma.restaurant.findMany({
      where: { isActive: true, wayPointsEnabled: true, wayPointsDisabledByAdmin: false },
      select: { id: true, slug: true, name: true, cuisine: true, city: true, postalCode: true },
      orderBy: { name: "asc" },
    }));

  const balance = data?.balance ?? 0;
  const target = data?.progress.target ?? 1500;
  const remaining = data?.progress.remaining ?? Math.max(0, (target ?? 0) - balance);
  const pct = target ? Math.min(100, Math.round((balance / target) * 100)) : 0;

  return (
    <>
      <SiteHeader />
      <main className="lw-wrap flex-1 pb-10 pt-4">
        <section className="relative overflow-hidden rounded-[1.5rem] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.07)] ring-1 ring-[#EEEFF2] sm:p-6">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#ffffff_0%,#fff7fa_55%,#fce4ec_100%)]" aria-hidden />
          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C2185B]">WayPoints</p>
            <p className="mt-2 font-display text-[2.4rem] font-semibold tabular-nums leading-none tracking-tight text-[#0F172A]">
              {balance}
            </p>
            <p className="mt-1 text-sm text-[#64748B]">{t.wpCurrentPoints}</p>
            {target ? (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-[#F8BBD0]/70">
                  <div className="h-full rounded-full bg-[#E91E63]" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  {balance}/{target}
                  {remaining > 0 ? ` · ${interpolate(t.wpStillNeed, { n: String(remaining) })}` : ` · ${t.wpRewardReady}`}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-[#64748B]">{t.wpNoRewardsYet}</p>
            )}
            {!session ? (
              <Link href="/login?next=/waypoints" className="mt-4 inline-flex text-sm font-semibold text-[#E91E63]">
                {t.login}
              </Link>
            ) : null}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[15px] font-semibold text-[#0F172A]">{t.wpNextBenefit}</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            {target
              ? interpolate(t.wpNextBenefitHint, { n: String(target) })
              : t.wpNoRewardsYet}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-[15px] font-semibold text-[#0F172A]">{t.wpAvailableRewards}</h2>
          <ul className="mt-2 space-y-2">
            {(data?.rewards ?? []).length === 0 ? (
              <li className="rounded-2xl border border-[#E8E8EC] bg-white p-4 text-sm text-[#64748B]">{t.wpNoRewardsYet}</li>
            ) : (
              (data?.rewards ?? []).map((reward) => (
                <li key={reward.id} className="rounded-2xl border border-[#E8E8EC] bg-white p-4">
                  <p className="font-medium text-[#0F172A]">{reward.title}</p>
                  <p className="text-[13px] text-[#64748B]">
                    {reward.restaurant.name} · {reward.pointsCost} WP
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-[15px] font-semibold text-[#0F172A]">{t.wpHistory}</h2>
          <ul className="mt-2 divide-y overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white">
            {(data?.ledger ?? []).length === 0 ? (
              <li className="p-4 text-sm text-[#64748B]">{t.wpNoHistory}</li>
            ) : (
              (data?.ledger ?? []).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-[#0F172A]">{row.title}</p>
                    <p className="text-[12px] text-[#64748B]">
                      {new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale === "tr" ? "tr-TR" : "de-DE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(row.createdAt))}
                    </p>
                  </div>
                  <span className={`tabular-nums font-semibold ${row.delta >= 0 ? "text-[#16A34A]" : "text-[#0F172A]"}`}>
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-[15px] font-semibold text-[#0F172A]">{t.wpRestaurants}</h2>
          <ul className="mt-2 space-y-2">
            {restaurants.length === 0 ? (
              <li className="rounded-2xl border border-[#E8E8EC] bg-white p-4 text-sm text-[#64748B]">{t.wpNoRestaurants}</li>
            ) : (
              restaurants.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/${r.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-[#E8E8EC] bg-white px-4 py-3"
                  >
                    <span>
                      <span className="block font-medium text-[#0F172A]">{r.name}</span>
                      <span className="block text-[12px] text-[#64748B]">
                        {"cuisine" in r ? String((r as { cuisine?: string }).cuisine ?? "") : ""}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-[#C2185B]">✦ WayPoints</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-[15px] font-semibold text-[#0F172A]">{t.wpActiveVouchers}</h2>
          <ul className="mt-2 space-y-2">
            {(data?.vouchers ?? []).length === 0 ? (
              <li className="rounded-2xl border border-[#E8E8EC] bg-white p-4 text-sm text-[#64748B]">{t.wpNoVouchers}</li>
            ) : (
              (data?.vouchers ?? []).map((v) => (
                <li key={v.id} className="rounded-2xl border border-[#E8E8EC] bg-white p-4">
                  <p className="font-medium">{v.title}</p>
                  <p className="text-sm text-[#64748B]">{formatEUR(v.discountCents, locale)}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
      <SiteFooter compact />
    </>
  );
}
