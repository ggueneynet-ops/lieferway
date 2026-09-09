import Link from "next/link";
import { cn } from "@/lib/utils";

const FULL_RATIO = 260 / 188;
const COMPACT_RATIO = 208 / 172;

export function LogoMark({
  size = 34,
  onBrand = false,
  compact = false,
  className,
}: {
  size?: number;
  onBrand?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const src = compact
    ? onBrand
      ? "/logo-mark-compact-white.svg"
      : "/logo-mark-compact.svg"
    : onBrand
      ? "/logo-mark-white.svg"
      : "/logo-mark.svg";
  const ratio = compact ? COMPACT_RATIO : FULL_RATIO;
  return (
    <img
      src={src}
      alt=""
      width={Math.round(size * ratio)}
      height={size}
      draggable={false}
      className={cn("shrink-0 object-contain object-left", className)}
    />
  );
}

export function Logo({
  className,
  size = "md",
  href = "/",
  onDark = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string | null;
  onDark?: boolean;
}) {
  const px = size === "sm" ? 28 : size === "lg" ? 44 : 34;
  const word = (
    <>
      <LogoMark size={px} onBrand={onDark} compact />
      <span
        className={cn(
          "font-display font-bold italic tracking-tight",
          onDark ? "text-white" : "text-primary",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-[15px] sm:text-base" : "text-lg",
        )}
      >
        Lieferway
      </span>
    </>
  );

  const classes = cn("inline-flex min-w-0 items-center gap-2.5 sm:gap-3", className);

  if (!href) {
    return <span className={classes}>{word}</span>;
  }

  return (
    <Link href={href} className={classes} aria-label="Lieferway">
      {word}
    </Link>
  );
}
