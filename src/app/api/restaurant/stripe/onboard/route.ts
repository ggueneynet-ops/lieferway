import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/public-origin";
import {
  canAcceptOnlinePayments,
  createAccountOnboardingLink,
  ensureExpressAccount,
  syncRestaurantStripeAccount,
} from "@/lib/stripe-connect";
import { isStripeConfigured } from "@/lib/stripe";

export async function OPTIONS() {
  return options();
}

async function ownedRestaurant(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.restaurant.findFirst({ where: { slug: "anadolu-grill" } });
  }
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}

export async function GET() {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const synced = restaurant.stripeAccountId
      ? await syncRestaurantStripeAccount(restaurant.id)
      : restaurant;
    const row = synced ?? restaurant;
    return json({
      configured: isStripeConfigured(),
      restaurant: {
        id: row.id,
        name: row.name,
        stripeAccountId: row.stripeAccountId,
        stripeOnboardingComplete: row.stripeOnboardingComplete,
        stripeChargesEnabled: row.stripeChargesEnabled,
        stripePayoutsEnabled: row.stripePayoutsEnabled,
        stripeDetailsSubmitted: row.stripeDetailsSubmitted,
        canAcceptOnline: canAcceptOnlinePayments(row),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function POST() {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    if (!isStripeConfigured()) return fail("Stripe Test Mode ist nicht konfiguriert.", 503);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const owner = await prisma.user.findUnique({
      where: { id: restaurant.ownerId },
      select: { email: true },
    });
    const accountId = await ensureExpressAccount({
      restaurantId: restaurant.id,
      email: owner?.email ?? "",
      name: restaurant.name,
    });
    const origin = await publicOrigin();
    const link = await createAccountOnboardingLink({
      accountId,
      refreshUrl: `${origin}/restaurant/settings?stripe=refresh`,
      returnUrl: `${origin}/restaurant/settings?stripe=return`,
    });
    return json({ url: link.url, accountId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    if (msg === "STRIPE_UNCONFIGURED") return fail("Stripe Test Mode ist nicht konfiguriert.", 503);
    console.error("stripe onboard", e);
    return fail("Stripe-Onboarding konnte nicht gestartet werden.", 500);
  }
}
