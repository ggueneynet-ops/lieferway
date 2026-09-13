import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Scalars needed by most restaurant panel pages.
 * Intentionally omits feature-pack / WayPoints columns (preorder*, banner*, wayPoints*)
 * so a lagging production migration cannot blank /restaurant via full-row SELECT.
 * Pages that need those fields must load them separately by restaurant id.
 */
export const ownedRestaurantSelect = {
  id: true,
  name: true,
  slug: true,
  isOpen: true,
  isActive: true,
  cuisine: true,
  address: true,
  city: true,
  postalCode: true,
  description: true,
  imageUrl: true,
  logoUrl: true,
  rating: true,
  reviewCount: true,
  deliveryFeeCents: true,
  minOrderCents: true,
  etaMin: true,
  etaMax: true,
  maxDeliveryKm: true,
  commissionPercent: true,
  pickupAllowed: true,
  launchWeekFreeDelivery: true,
  hoursJson: true,
  stripeAccountId: true,
  stripeOnboardingComplete: true,
  stripeChargesEnabled: true,
  stripePayoutsEnabled: true,
  stripeDetailsSubmitted: true,
} as const;

export type OwnedRestaurant = {
  id: string;
  name: string;
  slug: string;
  isOpen: boolean;
  isActive: boolean;
  cuisine: string;
  address: string;
  city: string;
  postalCode: string;
  description: string;
  imageUrl: string;
  logoUrl: string | null;
  rating: number;
  reviewCount: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  etaMin: number;
  etaMax: number;
  maxDeliveryKm: number | null;
  commissionPercent: number;
  pickupAllowed: boolean;
  launchWeekFreeDelivery: boolean;
  hoursJson: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
};

export async function requireOwnedRestaurant(): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  restaurant: OwnedRestaurant | null;
}> {
  const session = await getSession();
  if (!session) redirect("/login?next=/restaurant");
  if (session.role !== "RESTAURANT" && session.role !== "ADMIN") redirect("/");
  const restaurant =
    session.role === "ADMIN"
      ? await prisma.restaurant.findFirst({
          where: { slug: "anadolu-grill" },
          select: ownedRestaurantSelect,
        })
      : await prisma.restaurant.findUnique({
          where: { ownerId: session.id },
          select: ownedRestaurantSelect,
        });
  if (!restaurant) {
    return { session, restaurant: null };
  }
  return { session, restaurant };
}
