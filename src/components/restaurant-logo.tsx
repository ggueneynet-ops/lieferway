import { restaurantInitials, restaurantLogo } from "@/lib/media";
import { cn } from "@/lib/utils";

export function RestaurantLogo({
  name,
  logoUrl,
  slug,
  size = 40,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  slug?: string;
  size?: number;
  className?: string;
}) {
  const src = restaurantLogo(logoUrl, slug);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-[10px] bg-white object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] bg-primary font-display font-bold text-primary-foreground shadow-sm",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.36) }}
      aria-hidden
    >
      {restaurantInitials(name)}
    </span>
  );
}
