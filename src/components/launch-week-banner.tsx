import Link from "next/link";
import { getCopy } from "@/lib/get-locale";

export async function LaunchWeekBanner() {
  const { t } = await getCopy();
  return (
    <section className="mt-6 w-full max-w-xl">
      <Link
        href="#restaurants"
        className="group relative block overflow-hidden rounded-[22px] bg-[#F7EBEF] shadow-[0_12px_32px_rgba(183,46,87,0.12)] ring-1 ring-[#E8C5D0] transition hover:shadow-[0_16px_40px_rgba(183,46,87,0.18)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lieferway-promo-banner.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#FFF7FA]/95 via-[#FFF7FA]/82 to-transparent sm:via-[#FFF7FA]/70"
          aria-hidden
        />
        <div className="relative max-w-[18.5rem] px-5 py-5 sm:max-w-[20rem] sm:px-6 sm:py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#922546]">{t.launchWeekBadge}</p>
          <h2 className="mt-1.5 font-display text-[1.15rem] font-semibold leading-snug tracking-tight text-[#111827] sm:text-[1.28rem]">
            {t.launchWeekBannerTitle}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#4B5563]">{t.launchWeekBannerSub}</p>
          <span className="mt-3 inline-flex h-9 items-center rounded-full bg-[#B72E57] px-4 text-[12px] font-semibold text-white group-hover:bg-[#922546]">
            {t.promoCta}
          </span>
        </div>
      </Link>
    </section>
  );
}
