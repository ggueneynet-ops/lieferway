import { restaurantInitials } from "@/lib/media";
import { cn } from "@/lib/utils";

export function RestaurantLogo({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
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
