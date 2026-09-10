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
    <div className="no-scrollbar flex gap-4 overflow-x-auto py-1 sm:gap-5">
      {items.map((item) => (
        <LinkCategory key={item.key} item={item} />
      ))}
    </div>
  );
}

function LinkCategory({
  item,
}: {
  item: { key: string; href: string; label: string; active: boolean };
}) {
  return (
    <Link href={item.href} className="flex w-[4.25rem] shrink-0 flex-col items-center gap-2">
      <span
        className={`flex size-12 items-center justify-center rounded-2xl ${
          item.active ? "bg-[#FCE4EC] text-[#E91E63]" : "bg-transparent text-[#0F172A]"
        }`}
      >
        <CategoryIcon name={item.key} className="size-6" />
      </span>
      <span
        className={`text-center text-[11px] leading-tight ${
          item.active ? "font-semibold text-[#E91E63]" : "text-[#0F172A]/70"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}
