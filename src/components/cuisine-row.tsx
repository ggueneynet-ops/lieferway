import Link from "next/link";
import { CUISINES } from "@/lib/constants";
import { cuisineName, type Locale } from "@/lib/i18n";
import { marketplaceHref } from "@/lib/marketplace";
import { CategoryIcon } from "@/components/category-icon";

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
    <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 py-1" data-category-row="svg">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2"
        >
          <span
            className={`flex size-[3.25rem] items-center justify-center rounded-2xl transition ${
              item.active
                ? "bg-[#E91E63] text-white shadow-[0_8px_18px_rgba(233,30,99,0.28)] ring-4 ring-[#FCE4EC]"
                : "bg-white text-[#0F172A] shadow-[0_1px_3px_rgba(17,24,39,0.06)] ring-1 ring-[#E5E7EB]"
            }`}
          >
            <CategoryIcon name={item.key} className="size-6" />
          </span>
          <span
            className={`text-center text-[11px] leading-tight ${
              item.active ? "font-semibold text-[#E91E63]" : "font-medium text-[#6B7280]"
            }`}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
