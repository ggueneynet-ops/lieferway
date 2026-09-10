import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { parseHours, WEEKDAYS, type Weekday } from "@/lib/hours";

export const dynamic = "force-dynamic";

export default async function RestaurantHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  const q = await searchParams;
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rpHours}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }
  const hours = parseHours(restaurant.hoursJson);
  const labels: Record<Weekday, string> = {
    1: t.weekday1,
    2: t.weekday2,
    3: t.weekday3,
    4: t.weekday4,
    5: t.weekday5,
    6: t.weekday6,
    7: t.weekday7,
  };

  return (
    <RestaurantAppShell title={t.rpHours} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.rpHours}</h1>
      {q.ok ? <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm text-[#111827]">{t.save}</p> : null}
      <form action="/restaurant/hours/save" method="post" className="space-y-2 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        {WEEKDAYS.map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-2 border-b border-[#F3F4F6] py-2 last:border-0">
            <p className="w-24 text-sm font-medium">{labels[d]}</p>
            <label className="flex items-center gap-1.5 text-sm text-[#6B7280]">
              <input type="checkbox" name={`closed-${d}`} defaultChecked={hours[d].closed} />
              {t.rpClosedDay}
            </label>
            <input
              type="time"
              name={`open-${d}`}
              defaultValue={hours[d].open}
              className="h-10 rounded-lg border border-[#E5E7EB] px-2 text-sm"
            />
            <span className="text-[#9CA3AF]">–</span>
            <input
              type="time"
              name={`close-${d}`}
              defaultValue={hours[d].close}
              className="h-10 rounded-lg border border-[#E5E7EB] px-2 text-sm"
            />
          </div>
        ))}
        <button type="submit" className="mt-2 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white">
          {t.rpSaveHours}
        </button>
      </form>
    </RestaurantAppShell>
  );
}
