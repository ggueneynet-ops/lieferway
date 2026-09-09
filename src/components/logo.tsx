import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 28 : size === "lg" ? 44 : 34;
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        style={{ width: px, height: px }}
        aria-hidden
      >
        <svg viewBox="0 0 32 32" width={px * 0.62} height={px * 0.62} fill="none">
          <path
            d="M7 14c0-5 4-9 9-9s9 4 9 9c0 6.5-9 14-9 14S7 20.5 7 14Z"
            fill="currentColor"
            opacity="0.25"
          />
          <path
            d="M16 7.5c3.6 0 6.5 2.9 6.5 6.5 0 4.6-6.5 11.2-6.5 11.2S9.5 18.6 9.5 14c0-3.6 2.9-6.5 6.5-6.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="16" cy="14" r="2.4" fill="currentColor" />
        </svg>
      </span>
      <span className={cn(size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg")}>
        Lieferway
      </span>
    </Link>
  );
}
