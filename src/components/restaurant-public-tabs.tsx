"use client";

import { useState } from "react";
import { useI18n } from "@/components/locale-provider";

type Tab = "menu" | "reviews" | "info";

export function RestaurantPublicTabs({
  menu,
  reviews,
  info,
}: {
  menu: React.ReactNode;
  reviews: React.ReactNode;
  info: React.ReactNode;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("menu");
  const tabs: { id: Tab; label: string }[] = [
    { id: "menu", label: t.tabMenu },
    { id: "reviews", label: t.tabReviews },
    { id: "info", label: t.tabInfo },
  ];

  return (
    <div className="mt-6">
      <div className="flex gap-1 rounded-full bg-[#F7F7F8] p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`h-10 flex-1 rounded-full text-[13px] font-semibold transition ${
              tab === item.id ? "bg-white text-[#922A49] shadow-sm" : "text-[#64748B]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "menu" ? menu : tab === "reviews" ? reviews : info}
      </div>
    </div>
  );
}
