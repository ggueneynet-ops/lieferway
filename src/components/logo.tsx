import Link from "next/link";
import { cn } from "@/lib/utils";

const ASSET = "v=27";

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
      src={onDark ? `/Lieferway-header-white.png?${ASSET}` : `/Lieferway-header-h128.png?${ASSET}`}
      srcSet={
        onDark
          ? undefined
          : `/Lieferway-header-h64.png?${ASSET} 245w, /Lieferway-header-h96.png?${ASSET} 368w, /Lieferway-header-h128.png?${ASSET} 491w, /Lieferway-header-h256.png?${ASSET} 981w`
      }
      sizes="(max-width: 640px) 148px, 176px"
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
