"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { useI18n } from "@/components/locale-provider";
import { interpolate } from "@/lib/i18n";
import { guestFirstName } from "@/lib/reviews";
import { formatBerlinDateTime } from "@/lib/datetime";

type Row = {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  createdAt: string;
  orderShortCode: string;
  customer: { name: string };
};

export function RestaurantReviewsPanel({
  reviews,
  rating,
  count,
}: {
  reviews: Row[];
  rating: number;
  count: number;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function sendReply(id: string) {
    const reply = (drafts[id] ?? "").trim();
    if (!reply) {
      toast.error(t.replyRequired);
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/reviews/${id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reply }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || t.replyFailed);
        return;
      }
      toast.success(t.replySaved);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.replyFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        {count > 0 ? (
          <>
            <p className="text-3xl font-semibold tabular-nums">{rating.toFixed(1)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              {interpolate(t.reviewCountLabel, { count: String(count) })}
            </p>
          </>
        ) : (
          <p className="text-sm text-[#6B7280]">{t.noReviewsYet}</p>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">{t.noReviewsYet}</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{guestFirstName(r.customer.name)}</p>
                <p className="text-xs text-[#6B7280]">{formatBerlinDateTime(r.createdAt, locale)}</p>
              </div>
              <div className="mt-1">
                <StarRating value={r.rating} />
              </div>
              {r.comment ? <p className="mt-2 text-sm leading-relaxed">{r.comment}</p> : null}
              <p className="mt-2 text-xs text-[#6B7280]">
                {interpolate(t.reviewFromOrder, { code: r.orderShortCode })}
              </p>
              {r.reply ? (
                <div className="mt-3 rounded-xl bg-[#FCE4EC] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C2185B]">
                    {t.restaurantReply}
                  </p>
                  <p className="mt-1 text-sm">{r.reply}</p>
                </div>
              ) : null}
              <label className="mt-3 block text-sm font-medium" htmlFor={`reply-${r.id}`}>
                {r.reply ? t.editReply : t.writeReply}
              </label>
              <Textarea
                id={`reply-${r.id}`}
                value={drafts[r.id] ?? r.reply ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                maxLength={800}
                className="mt-1 min-h-20 bg-white"
              />
              <Button
                type="button"
                className="mt-2 h-10 touch-manipulation"
                disabled={busy === r.id}
                onClick={() => sendReply(r.id)}
              >
                {t.sendReply}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
