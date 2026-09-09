import Link from "next/link";
import { cn } from "@/lib/utils";

const MARK_RATIO = 260 / 188;

export function LogoMark({
  size = 34,
  onBrand = false,
  className,
}: {
  size?: number;
  onBrand?: boolean;
  className?: string;
}) {
  return (
    // Brand mark is a static SVG in /public — not a remote photo.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onBrand ? "/logo-mark-white.svg" : "/logo-mark.svg"}
      alt=""
      width={Math.round(size * MARK_RATIO)}
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
  const px = size === "sm" ? 26 : size === "lg" ? 42 : 32;
  const word = (
    <>
      <LogoMark size={px} onBrand={onDark} />
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

  const classes = cn("inline-flex items-center gap-1.5 sm:gap-2", className);

  if (!href) {
    return <span className={classes}>{word}</span>;
  }

  return (
    <Link href={href} className={classes} aria-label="Lieferway">
      {word}
    </Link>
  );
}
