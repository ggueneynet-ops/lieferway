import Link from "next/link";
import { CUISINES } from "@/lib/constants";
import { cuisineName, type Locale } from "@/lib/i18n";
import { marketplaceHref } from "@/lib/marketplace";
import { CategoryIcon } from "@/components/category-icon";
import { CUISINE_DISH_PHOTO } from "@/lib/media";

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
    { key: "all" as const, href: marketplaceHref({ plz, q, km }), label: allLabel, active: !cuisine, photo: null },
    ...CUISINES.map((c) => ({
      key: c,
      href: marketplaceHref({ plz, q, cuisine: c, km }),
      label: cuisineName(locale, c),
      active: cuisine === c,
      photo: CUISINE_DISH_PHOTO[c] ?? null,
    })),
  ];

  return (
    <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 py-1" data-category-row="circles">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          className="flex w-[4.35rem] shrink-0 flex-col items-center gap-1.5"
        >
          <span
            className={`relative flex size-[3.35rem] items-center justify-center overflow-hidden rounded-full ${
              item.active ? "ring-2 ring-[#E91E63] ring-offset-2" : "ring-1 ring-[#E8E8EC]"
            }`}
          >
            {item.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className={`flex size-full items-center justify-center ${
                  item.active ? "bg-[#E91E63] text-white" : "bg-[#F7F7F8] text-[#0F172A]"
                }`}
              >
                <CategoryIcon name={item.key} className="size-[22px]" />
              </span>
            )}
          </span>
          <span
            className={`w-full truncate text-center text-[11px] font-semibold ${
              item.active ? "text-[#E91E63]" : "text-[#0F172A]"
            }`}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
