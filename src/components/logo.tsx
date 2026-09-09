import Link from "next/link";
import { cn } from "@/lib/utils";

/** Placeholder Logo A: L + route arrow + shopping bag. Swap for final SVG later. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden
      className="shrink-0"
    >
      <rect width="40" height="40" rx="10" fill="var(--color-primary)" />
      <path
        d="M10 9.5v16.5h8"
        fill="none"
        stroke="var(--color-text-inverse)"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 11.5c4.2 1.2 8 4.4 9.2 9"
        fill="none"
        stroke="var(--color-text-inverse)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M26.6 18.2 31.2 20.4l-4.8 2" fill="var(--color-text-inverse)" />
      <path
        d="M15.2 20.2h12.4l-1.05 10.2H16.25L15.2 20.2Z"
        fill="none"
        stroke="var(--color-text-inverse)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M18.2 20.2v-1.6c0-1.9 6.2-1.9 6.2 0v1.6"
        fill="none"
        stroke="var(--color-text-inverse)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  size = "md",
  href = "/",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}) {
  const px = size === "sm" ? 28 : size === "lg" ? 44 : 34;
  const word = (
    <>
      <LogoMark size={px} />
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-ink",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg",
        )}
      >
        Lieferway
      </span>
    </>
  );

  if (!href) {
    return <span className={cn("inline-flex items-center gap-2", className)}>{word}</span>;
  }

  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Lieferway">
      {word}
    </Link>
  );
}
