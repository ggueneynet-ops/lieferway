import { Bike, Percent, Store } from "lucide-react";
import { getCopy } from "@/lib/get-locale";

export async function WhyLieferway() {
  const { t } = await getCopy();
  const cards = [
    { icon: Store, title: t.whyLocalTitle, body: t.whyLocalBody },
    { icon: Percent, title: t.whyFairTitle, body: t.whyFairBody },
    { icon: Bike, title: t.whyDirectTitle, body: t.whyDirectBody },
  ];
  return (
    <section className="bg-[#FCE4EC]/40">
      <div className="lw-wrap py-10 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C2185B]">{t.whyLieferway}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#FCE4EC] text-[#E91E63]">
                <card.icon className="size-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-3 font-display text-[15px] font-semibold text-[#111827]">{card.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
