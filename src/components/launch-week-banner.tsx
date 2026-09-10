import Link from "next/link";
import { getCopy } from "@/lib/get-locale";

export async function LaunchWeekBanner() {
  const { t } = await getCopy();
  return (
    <Link
      href="#restaurants"
      className="group relative block overflow-hidden rounded-[22px] bg-[#0F172A] shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/restaurants/pasta-e-basta.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/88 via-[#0F172A]/62 to-[#0F172A]/18"
        aria-hidden
      />
      <div className="relative min-h-[9.5rem] max-w-xl px-5 py-5 sm:min-h-[11rem] sm:px-7 sm:py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{t.launchWeekBadge}</p>
        <h2 className="mt-1.5 max-w-sm font-display text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:text-[1.55rem]">
          {t.launchWeekBannerTitle}
        </h2>
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-white/85 sm:text-[14px]">
          {t.launchWeekBannerSub}
        </p>
        <span className="mt-4 inline-flex h-9 items-center rounded-full bg-[#922A49] px-4 text-[12px] font-semibold text-white group-hover:bg-[#7A2340]">
          {t.promoCta}
        </span>
      </div>
    </Link>
  );
}
