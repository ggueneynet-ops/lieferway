import Link from "next/link";
import { getCopy } from "@/lib/get-locale";

export async function PromoBand() {
  const { t } = await getCopy();
  return (
    <section className="lw-wrap pb-2 pt-2">
      <div className="relative overflow-hidden rounded-[24px] bg-[#111827] text-white shadow-[0_12px_32px_rgba(17,24,39,0.12)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 88% 50%, rgba(233,30,99,0.45), transparent 58%), linear-gradient(90deg, #111827 42%, rgba(17,24,39,0.55) 100%)",
          }}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/restaurants/green-bowl.jpg"
          alt=""
          className="absolute inset-y-0 right-0 hidden h-full w-[46%] object-cover opacity-70 sm:block"
        />
        <div className="relative max-w-xl px-5 py-7 sm:px-8 sm:py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCE4EC]">{t.promoTitle}</p>
          <p className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-[1.7rem]">
            {t.promoBody}
          </p>
          <Link
            href="#restaurants"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-[#E91E63] px-5 text-sm font-semibold text-white hover:bg-[#C2185B]"
          >
            {t.promoCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
