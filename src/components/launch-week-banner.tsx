import Link from "next/link";
import { getCopy } from "@/lib/get-locale";

export async function LaunchWeekBanner() {
  const { t } = await getCopy();
  return (
    <Link
      href="#restaurants"
      className="group relative block overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/restaurants/pasta-e-basta.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/80 via-[#0F172A]/45 to-transparent" aria-hidden />
      <div className="relative flex min-h-[7.25rem] items-center px-4 py-4 sm:min-h-[7.75rem] sm:px-5">
        <div className="max-w-[16.5rem] sm:max-w-sm">
          <h2 className="font-display text-[1.05rem] font-semibold leading-snug tracking-tight text-white sm:text-[1.15rem]">
            {t.launchWeekBannerTitle}
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-white/85">{t.launchWeekBannerSub}</p>
          <span className="mt-2.5 inline-flex h-8 items-center rounded-full bg-[#E91E63] px-3.5 text-[12px] font-semibold text-white group-hover:bg-[#C2185B]">
            {t.promoCta}
          </span>
        </div>
      </div>
    </Link>
  );
}
