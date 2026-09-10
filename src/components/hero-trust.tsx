import { Bike, Percent, Store } from "lucide-react";
import { interpolate } from "@/lib/i18n";

export function HeroTrust({
  openCount,
  openLabel,
  directLabel,
  provisionLabel,
}: {
  openCount: number;
  openLabel: string;
  directLabel: string;
  provisionLabel: string;
}) {
  const items = [
    { icon: Store, label: interpolate(openLabel, { count: String(openCount) }) },
    { icon: Bike, label: directLabel },
    { icon: Percent, label: provisionLabel },
  ];
  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-[#111827] shadow-[0_1px_3px_rgba(17,24,39,0.06)] ring-1 ring-[#E5E7EB]"
        >
          <item.icon className="size-3.5 text-[#E91E63]" strokeWidth={2} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
