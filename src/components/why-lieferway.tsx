import { Bike, MapPin, Percent } from "lucide-react";
import { getCopy } from "@/lib/get-locale";

export async function WhyLieferway() {
  const { t } = await getCopy();
  const cards = [
    { icon: MapPin, short: t.whyLocalShort, title: t.whyLocalTitle, body: t.whyLocalBody },
    { icon: Percent, short: t.whyFairShort, title: t.whyFairTitle, body: t.whyFairBody },
    { icon: Bike, short: t.whyDirectShort, title: t.whyDirectTitle, body: t.whyDirectBody },
  ];
  return (
    <section className="bg-[#FCE4EC]/45">
      <div className="lw-wrap py-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C2185B]">{t.whyLieferway}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex gap-3.5 rounded-[20px] border border-white/80 bg-white/90 p-3.5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] sm:flex-col sm:p-4"
            >
              <span className="flex size-[3.35rem] shrink-0 items-center justify-center rounded-[18px] bg-[#FCE4EC] text-[#E91E63] sm:size-16 sm:rounded-[20px]">
                <card.icon className="size-7 sm:size-8" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#E91E63]">{card.short}</p>
                <h2 className="mt-0.5 font-display text-[15px] font-semibold text-[#111827]">{card.title}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
