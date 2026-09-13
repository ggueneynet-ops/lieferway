import Link from "next/link";

export function WayPointsBanner({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle: string;
  cta: string;
}) {
  return (
    <Link
      href="/waypoints"
      className="group relative block overflow-hidden rounded-[1.35rem] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] ring-1 ring-[#EEEFF2]"
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#fff7fa_48%,#fce4ec_100%)]"
        aria-hidden
      />
      <div className="relative flex min-h-[6.5rem] items-center justify-between gap-3 px-4 py-4 sm:min-h-[7.25rem] sm:px-5">
        <div className="min-w-0">
          <p className="font-display text-[1.15rem] font-semibold leading-snug tracking-tight text-[#0F172A] sm:text-[1.25rem]">
            {title}
          </p>
          <p className="mt-1 max-w-[22rem] text-[13px] leading-snug text-[#64748B]">{subtitle}</p>
          <p className="mt-2.5 text-[13px] font-semibold text-[#E91E63]">
            {cta} <span aria-hidden>→</span>
          </p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-[1.35rem] shadow-[0_8px_18px_rgba(233,30,99,0.12)] ring-1 ring-[#F8BBD0]/70 sm:size-14">
          ✦
        </span>
      </div>
    </Link>
  );
}
