import Link from "next/link";
import { getCopy } from "@/lib/get-locale";

export async function LaunchWeekBanner() {
  const { t } = await getCopy();
  return (
    <Link
      href="#restaurants"
      className="group relative block overflow-hidden rounded-[1.35rem] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/restaurants/pasta-e-basta.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/78 via-[#0F172A]/40 to-transparent" aria-hidden />
      <div className="relative flex min-h-[5.5rem] items-center justify-between gap-3 px-4 py-3 sm:min-h-[6rem] sm:px-5">
        <div className="min-w-0 max-w-[16rem]">
          <h2 className="font-display text-[0.98rem] font-semibold leading-snug tracking-tight text-white">
            {t.launchWeekBannerTitle}
          </h2>
          <p className="mt-0.5 truncate text-[12px] text-white/85">{t.launchWeekBannerSub}</p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#E91E63] px-3 text-[12px] font-semibold text-white group-hover:bg-[#C2185B]">
          {t.promoCta}
        </span>
      </div>
    </Link>
  );
}
