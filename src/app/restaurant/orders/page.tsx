import Link from "next/link";
import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { formatBerlinDateTime } from "@/lib/datetime";
import { addDaysYmd, berlinYmd, startOfBerlinDay } from "@/lib/restaurant-reports";
import { PrintBonButton } from "@/components/print-bon-button";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const ACCEPTED = new Set(["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]);

function parseYmd(value?: string) {
  return value && YMD.test(value) ? value : null;
}

function parseView(value?: string) {
  if (value === "accepted" || value === "rejected") return value;
  return "all" as const;
}

function inRange(createdAt: Date, from: Date | null, toExclusive: Date | null) {
  const t = createdAt.getTime();
  if (from && t < from.getTime()) return false;
  if (toExclusive && t >= toExclusive.getTime()) return false;
  return true;
}

function hrefFor(opts: { from?: string | null; to?: string | null; all?: boolean; view: string }) {
  const sp = new URLSearchParams();
  if (opts.all) sp.set("date", "all");
  else {
    if (opts.from) sp.set("from", opts.from);
    if (opts.to) sp.set("to", opts.to);
  }
  if (opts.view !== "all") sp.set("view", opts.view);
  const q = sp.toString();
  return q ? `/restaurant/orders?${q}` : "/restaurant/orders";
}

export default async function RestaurantOrdersHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; from?: string; to?: string; view?: string }>;
}) {
  const { restaurant } = await requireOwnedRestaurant();
  const { t, locale } = await getCopy();
  const q = await searchParams;
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.ordersCount}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  const today = berlinYmd();
  const yesterday = addDaysYmd(today, -1);
  const last7 = addDaysYmd(today, -6);
  const view = parseView(q.view);
  const allTime = q.date === "all";
  const fromYmd = allTime ? null : parseYmd(q.from) ?? parseYmd(q.date) ?? today;
  const toYmd = allTime ? null : parseYmd(q.to) ?? fromYmd;
  const from = fromYmd ? startOfBerlinDay(fromYmd) : null;
  const toExclusive = toYmd ? startOfBerlinDay(addDaysYmd(toYmd, 1)) : null;

  const rows = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, status: { not: "PENDING_PAYMENT" } },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { select: { name: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const dated = rows.filter((o) => inRange(o.createdAt, from, toExclusive));
  const orders = dated.filter((o) => {
    if (view === "accepted") return ACCEPTED.has(o.status);
    if (view === "rejected") return o.status === "REJECTED";
    return true;
  });
  const acceptedN = dated.filter((o) => ACCEPTED.has(o.status)).length;
  const rejectedN = dated.filter((o) => o.status === "REJECTED").length;

  const chips = [
    { href: hrefFor({ from: today, to: today, view }), id: "today", label: t.periodToday },
    { href: hrefFor({ from: yesterday, to: yesterday, view }), id: "yesterday", label: t.periodYesterday },
    { href: hrefFor({ from: last7, to: today, view }), id: "7d", label: t.period7d },
    { href: hrefFor({ all: true, view }), id: "all", label: t.periodAll },
  ];
  const selectedChip =
    allTime ? "all" : fromYmd === today && toYmd === today ? "today" : fromYmd === yesterday && toYmd === yesterday ? "yesterday" : fromYmd === last7 && toYmd === today ? "7d" : "";

  const views = [
    { id: "all" as const, label: t.filterAllStatuses },
    { id: "accepted" as const, label: `${t.filterAccepted} (${acceptedN})` },
    { id: "rejected" as const, label: `${t.filterRejected} (${rejectedN})` },
  ];

  return (
    <RestaurantAppShell title={t.ordersCount} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-1 text-lg font-semibold">{t.ordersCount}</h1>
      <p className="mb-3 text-sm text-[#6B7280]">{t.ordersHistoryHint}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className={`h-10 rounded-full px-3 text-sm font-medium leading-10 ${
              selectedChip === c.id ? "bg-primary text-white" : "border border-[#E5E7EB] bg-white text-[#111827]"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <form className="mb-3 grid grid-cols-2 gap-2" action="/restaurant/orders" method="get">
        {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
        <label className="grid gap-1 text-sm">
          {t.periodFrom}
          <input
            type="date"
            name="from"
            required
            defaultValue={fromYmd ?? today}
            className="h-12 w-full rounded-lg border border-[#E5E7EB] bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t.periodTo}
          <input
            type="date"
            name="to"
            required
            defaultValue={toYmd ?? today}
            className="h-12 w-full rounded-lg border border-[#E5E7EB] bg-white px-3"
          />
        </label>
        <button type="submit" className="col-span-2 h-12 rounded-xl bg-primary text-sm font-semibold text-white">
          {t.periodApply}
        </button>
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        {views.map((v) => (
          <Link
            key={v.id}
            href={hrefFor({ from: fromYmd, to: toYmd, all: allTime, view: v.id })}
            className={`h-9 rounded-full px-3 text-sm font-medium leading-9 ${
              view === v.id ? "bg-[#111827] text-white" : "border border-[#E5E7EB] bg-white text-[#111827]"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-[#6B7280]">{t.noOrdersInPeriod}</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{o.shortCode}</p>
                <StatusBadge status={o.status} locale={locale} fulfillmentType={o.fulfillmentType} />
              </div>
              <p className="mt-1 text-sm text-[#6B7280]">
                {formatBerlinDateTime(o.createdAt, locale)} · {o.customer.name}
                {o.fulfillmentType === "PICKUP" ? ` · ${t.fulfillmentPickup}` : ""}
              </p>
              <ul className="mt-2 text-sm text-[#111827]">
                {o.items.map((i) => (
                  <li key={`${o.id}-${i.name}-${i.quantity}`}>
                    {i.quantity}× {i.name}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-sm font-medium">{formatEUR(o.foodSubtotalCents, locale)}</p>
              <div className="mt-3">
                <PrintBonButton orderId={o.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </RestaurantAppShell>
  );
}
