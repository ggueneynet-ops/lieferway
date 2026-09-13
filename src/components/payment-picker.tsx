"use client";

import type { PaymentMethod } from "@/lib/constants";
import { formatEUR } from "@/lib/money";
import { useI18n } from "@/components/locale-provider";

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M16.37 12.64c-.03-2.14 1.75-3.17 1.83-3.22-1-1.46-2.56-1.66-3.11-1.68-1.32-.14-2.58.78-3.25.78-.67 0-1.71-.76-2.81-.74-1.45.02-2.78.84-3.52 2.14-1.51 2.61-.38 6.47 1.08 8.59.72 1.04 1.57 2.2 2.69 2.16 1.08-.04 1.49-.7 2.8-.7 1.3 0 1.68.7 2.81.67 1.17-.02 1.9-1.05 2.61-2.1.82-1.2 1.16-2.37 1.18-2.43-.03-.01-2.25-.86-2.28-3.47zM14.5 6.9c.59-.72.99-1.72.88-2.72-.85.03-1.88.57-2.49 1.28-.55.63-1.03 1.65-.9 2.62.95.07 1.93-.48 2.51-1.18z" />
    </svg>
  );
}

function GPayMark() {
  return (
    <span className="text-[15px] font-semibold tracking-tight">
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
      <span className="ml-1 text-[#3C4043]">Pay</span>
    </span>
  );
}

export function PaymentPicker({
  method,
  onMethod,
  totalCents,
  card,
  expiry,
  cvc,
  onCard,
  onExpiry,
  onCvc,
}: {
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  totalCents: number;
  card: string;
  expiry: string;
  cvc: string;
  onCard: (v: string) => void;
  onExpiry: (v: string) => void;
  onCvc: (v: string) => void;
}) {
  const { t, locale } = useI18n();
  const amount = formatEUR(totalCents, locale);

  return (
    <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">{t.payToPlatform}</h2>
          <p className="mt-1 text-sm text-[#6B7280]">{t.payHint}</p>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-[#9CA3AF]">{t.demoPaymentNote}</p>

      <div className="mt-5 grid gap-2.5">
        <button
          type="button"
          onClick={() => onMethod("APPLE_PAY")}
          className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-[15px] font-medium text-white ${
            method === "APPLE_PAY" ? "ring-2 ring-[#E91E63] ring-offset-2" : ""
          }`}
        >
          <AppleMark />
          {t.payWithApple}
        </button>
        <button
          type="button"
          onClick={() => onMethod("GOOGLE_PAY")}
          className={`flex h-12 items-center justify-center rounded-xl border border-[#DADCE0] bg-white ${
            method === "GOOGLE_PAY" ? "ring-2 ring-[#E91E63] ring-offset-2" : ""
          }`}
        >
          <GPayMark />
        </button>
        <button
          type="button"
          onClick={() => onMethod("CARD")}
          className={`flex h-12 items-center justify-between rounded-xl border px-4 text-left text-[15px] font-medium ${
            method === "CARD" ? "border-[#E91E63] bg-[#FCE4EC]" : "border-[#E5E7EB] bg-white"
          }`}
        >
          <span>{t.payWithCard}</span>
          <span className="text-sm font-normal text-[#6B7280]">{amount}</span>
        </button>
        <button
          type="button"
          onClick={() => onMethod("CASH")}
          className={`flex h-11 items-center justify-between rounded-xl px-4 text-left text-sm ${
            method === "CASH" ? "bg-[#FCE4EC] font-medium text-[#111827]" : "text-[#6B7280]"
          }`}
        >
          <span>{t.payCash}</span>
          <span className="text-xs">{t.payCashHint}</span>
        </button>
      </div>

    </section>
  );
}

export function payCtaLabel(
  method: PaymentMethod,
  t: { payWithApple: string; payWithGoogle: string; payWithCard: string; payNow: string; payCash: string },
) {
  if (method === "APPLE_PAY") return t.payWithApple;
  if (method === "GOOGLE_PAY") return t.payWithGoogle;
  if (method === "CARD") return t.payWithCard;
  if (method === "CASH") return t.payCash;
  return t.payNow;
}
