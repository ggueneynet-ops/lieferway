import Link from "next/link";
import { getCopy } from "@/lib/get-locale";

export async function LaunchWeekBanner() {
  const { t } = await getCopy();
  return (
    <Link
      href="#restaurants"
      className="group relative block overflow-hidden rounded-[1.35rem] shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/restaurants/pasta-e-basta.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-[#0F172A]/35 to-[#0F172A]/10"
        aria-hidden
      />
      <div className="relative flex min-h-[6.25rem] flex-col justify-end px-4 py-3.5 sm:min-h-[7rem] sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">START5</p>
        <p className="mt-0.5 font-display text-[1.05rem] font-semibold leading-snug tracking-tight text-white">
          {t.launchWeekBannerTitle.replace(/^START5:\s*/i, "")}
        </p>
        <p className="mt-0.5 max-w-[18rem] text-[12px] leading-snug text-white/80">{t.launchWeekBannerSub}</p>
      </div>
    </Link>
  );
}
