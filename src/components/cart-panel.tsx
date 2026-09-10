"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/money";

export function QtyStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#E5E7EB] bg-white">
      <button
        type="button"
        aria-label="−"
        className="flex size-9 items-center justify-center text-lg leading-none text-[#111827]"
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-label={label}>
        {value}
      </span>
      <button
        type="button"
        aria-label="+"
        className="flex size-9 items-center justify-center text-lg leading-none text-[#111827]"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

export function CartPanel({
  onCheckout,
  compact = false,
}: {
  onCheckout?: () => void;
  compact?: boolean;
}) {
  const { cart, setQty, foodSubtotal, clear } = useCart();
  const { t, locale } = useI18n();

  if (!cart) {
    return (
      <div className={compact ? "py-6 text-center" : "rounded-[20px] border border-[#E5E7EB] bg-white px-6 py-10 text-center"}>
        <p className="text-sm text-[#6B7280]">{t.emptyCart}</p>
        <Button asChild className="mt-4" onClick={onCheckout}>
          <Link href="/">{t.discoverRestaurants}</Link>
        </Button>
      </div>
    );
  }

  const belowMin = foodSubtotal < cart.minOrderCents;
  const total = foodSubtotal + cart.deliveryFeeCents;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-[#111827]">{cart.restaurantName}</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            {t.minOrder} {formatEUR(cart.minOrderCents, locale)}
          </p>
        </div>
        <p className="rounded-2xl border border-[#E8E8EC] bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#0F172A]">
          {cart.fulfillmentType === "PICKUP" ? t.pickupHint : `${t.restaurantDelivers} ${t.restaurantDeliversHint}`}
        </p>
        <p className="rounded-2xl border border-dashed border-[#F8BBD0] bg-white px-3.5 py-2.5 text-[12px] leading-relaxed text-[#6B7280]">
          {t.bagCouponHint}
        </p>
        <ul className="divide-y divide-[#F3F4F6]">
          {cart.items.map((item) => (
            <li key={item.menuItemId} className="flex items-center gap-3 py-3 first:pt-0">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-[#111827]">{item.name}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatEUR(item.priceCents * item.quantity, locale)}</p>
              </div>
              <QtyStepper
                value={item.quantity}
                onChange={(n) => setQty(item.menuItemId, n)}
                label={t.qty}
              />
            </li>
          ))}
        </ul>
        <div className="space-y-1.5 border-t border-[#E5E7EB] pt-4 text-sm">
          <p className="flex justify-between text-[#6B7280]">
            <span>{t.subtotal}</span>
            <span className="tabular-nums">{formatEUR(foodSubtotal, locale)}</span>
          </p>
          <p className="flex justify-between text-[#6B7280]">
            <span>{cart.fulfillmentType === "PICKUP" ? t.fulfillmentPickup : t.fee}</span>
            <span className="tabular-nums">{formatEUR(cart.deliveryFeeCents, locale)}</span>
          </p>
          <p className="flex justify-between text-base font-semibold text-[#111827]">
            <span>{t.total}</span>
            <span className="tabular-nums">{formatEUR(total, locale)}</span>
          </p>
          {belowMin ? (
            <p className="pt-1 text-[13px] text-destructive">
              {t.remainingMin.replace("{amount}", formatEUR(cart.minOrderCents - foodSubtotal, locale))}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-[#E5E7EB] pt-4">
        <Button variant="outline" className="h-12" onClick={clear}>
          {t.clearCart}
        </Button>
        {belowMin ? (
          <Button className="h-12 flex-1 text-base font-semibold" disabled>
            {t.checkout}
          </Button>
        ) : (
          <Button asChild className="h-12 flex-1 text-base font-semibold">
            <Link href="/checkout" onClick={onCheckout}>
              {t.checkout}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
