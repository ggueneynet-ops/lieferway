import Link from "next/link";
import { CUISINE_ICONS, CUISINES } from "@/lib/constants";
import { cuisineName, type Locale } from "@/lib/i18n";
import { marketplaceHref } from "@/lib/marketplace";

export function CuisineRow({
  locale,
  plz,
  q,
  cuisine,
  allLabel,
}: {
  locale: Locale;
  plz?: string | null;
  q?: string;
  cuisine?: string;
  allLabel: string;
}) {
  const items = [
    { key: "all" as const, href: marketplaceHref({ plz, q }), label: allLabel, icon: CUISINE_ICONS.all, active: !cuisine },
    ...CUISINES.map((c) => ({
      key: c,
      href: marketplaceHref({ plz, q, cuisine: c }),
      label: cuisineName(locale, c),
      icon: CUISINE_ICONS[c],
      active: cuisine === c,
    })),
  ];

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-3">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5"
        >
          <span
            className={`flex size-14 items-center justify-center rounded-full text-2xl ${
              item.active ? "bg-primary-soft ring-2 ring-primary" : "bg-bg-muted"
            }`}
          >
            {item.icon}
          </span>
          <span className={`text-center text-[11px] leading-tight ${item.active ? "font-semibold text-primary" : "text-ink"}`}>
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
