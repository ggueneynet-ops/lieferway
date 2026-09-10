"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { useI18n } from "@/components/locale-provider";

export function ReviewForm({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (![1, 2, 3, 4, 5].includes(rating)) {
      toast.error(t.starsRequired);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ orderId, rating, comment }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || t.reviewFailed);
        return;
      }
      toast.success(t.reviewSaved);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.reviewFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
      <h2 className="font-display font-semibold tracking-tight">{t.leaveReview}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{t.yourRating}</p>
      <div className="mt-2">
        <StarRating value={rating} onChange={setRating} label={t.yourRating} />
      </div>
      <label className="mt-4 block text-sm font-medium" htmlFor={`review-${orderId}`}>
        {t.reviewComment}
      </label>
      <Textarea
        id={`review-${orderId}`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={800}
        placeholder={t.reviewCommentPlaceholder}
        className="mt-1 min-h-24 bg-white"
      />
      <Button type="button" className="mt-4 h-11 w-full touch-manipulation" disabled={busy} onClick={submit}>
        {t.submitReview}
      </Button>
    </div>
  );
}
