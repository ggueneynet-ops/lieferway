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
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5" data-category-row="pills">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition ${
            item.active
              ? "bg-[#B72E57] text-white shadow-[0_8px_18px_rgba(183,46,87,0.28)]"
              : "bg-white text-[#111827] ring-1 ring-[#E5E7EB] hover:ring-[#E8C5D0]"
          }`}
        >
          <CategoryIcon name={item.key} className="size-[18px]" />
          {item.label}
        </Link>
      ))}
    </div>
  );
}
