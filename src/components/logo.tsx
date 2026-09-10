import Link from "next/link";
import { cn } from "@/lib/utils";

const PNG = "v=8";
const SVG = "v=5";

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
    <picture className="block h-full">
      <source type="image/svg+xml" srcSet={`/lieferway-header.svg?${SVG}`} />
      <img
        src={onDark ? `/logo-header-white.png?${PNG}` : `/logo-header.png?${PNG}`}
        srcSet={
          onDark
            ? undefined
            : `/logo-header-h64.png?${PNG} 286w, /logo-header-h96.png?${PNG} 430w, /logo-header-h128.png?${PNG} 573w`
        }
        sizes="(max-width: 640px) 148px, 176px"
        alt="Lieferway"
        draggable={false}
        className="block h-full w-auto max-w-none"
      />
    </picture>
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
