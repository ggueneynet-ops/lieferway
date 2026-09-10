import { StarRating } from "@/components/star-rating";
import { guestFirstName } from "@/lib/reviews";
import { formatBerlinDateTime } from "@/lib/datetime";
import type { Locale } from "@/lib/i18n";

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  createdAt: Date | string;
  customer: { name: string };
};

export function ReviewList({
  reviews,
  locale,
  empty,
  replyLabel,
}: {
  reviews: PublicReview[];
  locale: Locale;
  empty: string;
  replyLabel: string;
}) {
  if (reviews.length === 0) {
    return <p className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-[#111827]">{guestFirstName(r.customer.name)}</p>
            <p className="text-xs text-[#6B7280]">
              {formatBerlinDateTime(
                typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
                locale,
              )}
            </p>
          </div>
          <div className="mt-1">
            <StarRating value={r.rating} />
          </div>
          {r.comment ? <p className="mt-2 text-sm leading-relaxed text-[#111827]">{r.comment}</p> : null}
          {r.reply ? (
            <div className="mt-3 rounded-xl bg-[#FFF5F8] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C2185B]">{replyLabel}</p>
              <p className="mt-1 text-sm text-[#111827]">{r.reply}</p>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
