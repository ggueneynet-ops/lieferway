"use client";

import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange?: (n: number) => void;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const icon = (
          <Star
            className={`size-6 ${filled ? "fill-[#E91E63] text-[#E91E63]" : "text-[#D1D5DB]"}`}
            strokeWidth={1.5}
          />
        );
        if (!onChange) {
          return (
            <span key={n} aria-hidden>
              {icon}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}`}
            onClick={() => onChange(n)}
            className="touch-manipulation rounded-md p-0.5"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
