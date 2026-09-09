import Link from "next/link";
import { cn } from "@/lib/utils";

const FULL_RATIO = 260 / 188;

/** Full scooter+cloche mark with speed lines — splash only. */
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
    <img
      src={onBrand ? "/logo-mark-white.svg" : "/logo-mark.svg"}
      alt=""
      width={Math.round(size * FULL_RATIO)}
      height={size}
      draggable={false}
      className={cn("shrink-0 object-contain object-left", className)}
    />
  );
}

/** Single-piece lockup (icon + wordmark). Never add a second “Lieferway” label beside it. */
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
  const img = (
    <img
      src={onDark ? "/logo-header-white.png" : "/logo-header-h96.png"}
      srcSet={
        onDark
          ? undefined
          : "/logo-header-h64.png 64w, /logo-header-h96.png 96w, /logo-header-h128.png 128w"
      }
      sizes="160px"
      alt="Lieferway"
      draggable={false}
      className="block h-full w-auto max-w-none"
    />
  );

  const classes = cn(
    "inline-flex shrink-0 items-center",
    size === "lg" ? "h-9 sm:h-10" : size === "sm" ? "h-7" : "h-8",
    className,
  );

  if (!href) {
    return <span className={classes}>{img}</span>;
  }

  return (
    <Link href={href} className={classes} aria-label="Lieferway">
      {img}
    </Link>
  );
}
