import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CookingPot, Fish, Flame, Leaf, Pizza, Sandwich, Soup, UtensilsCrossed, Wheat } from "lucide-react";
import { CUISINES } from "@/lib/constants";
import { cuisineName, type Locale } from "@/lib/i18n";
import { marketplaceHref } from "@/lib/marketplace";

const ICONS: Record<string, LucideIcon> = {
  all: UtensilsCrossed,
  Türkisch: Flame,
  Italienisch: CookingPot,
  Burger: Sandwich,
  Sushi: Fish,
  Deutsch: Wheat,
  Vietnamesisch: Soup,
  Gesund: Leaf,
  Pizza: Pizza,
};

export function CuisineRow({
  locale,
  plz,
  q,
  cuisine,
  km,
  allLabel,
}: {
  locale: Locale;
  plz?: string | null;
  q?: string;
  cuisine?: string;
  km?: number | null;
  allLabel: string;
}) {
  const items = [
    { key: "all" as const, href: marketplaceHref({ plz, q, km }), label: allLabel, active: !cuisine },
    ...CUISINES.map((c) => ({
      key: c,
      href: marketplaceHref({ plz, q, cuisine: c, km }),
      label: cuisineName(locale, c),
      active: cuisine === c,
    })),
  ];

  return (
    <div className="no-scrollbar flex gap-5 overflow-x-auto py-2">
      {items.map((item) => {
        const Icon = ICONS[item.key] ?? UtensilsCrossed;
        return (
          <Link key={item.key} href={item.href} className="flex w-16 shrink-0 flex-col items-center gap-2">
            <span
              className={`flex size-11 items-center justify-center rounded-full border ${
                item.active ? "border-primary text-primary" : "border-border text-ink"
              }`}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
            </span>
            <span
              className={`text-center text-[11px] leading-tight ${
                item.active ? "font-semibold text-primary" : "text-text-secondary"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
