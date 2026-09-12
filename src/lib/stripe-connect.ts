import type Stripe from "stripe";
import { prisma } from "./prisma";
import { getStripe, isStripeConfigured } from "./stripe";
import { weeklyMondayPayoutSchedule } from "./payments";

export type RestaurantStripeFlags = {
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
};

export function canAcceptOnlinePayments(restaurant: RestaurantStripeFlags) {
  return Boolean(
    restaurant.stripeAccountId &&
      restaurant.stripeChargesEnabled &&
      restaurant.stripeOnboardingComplete,
  );
}

export async function applyWeeklyMondayPayouts(accountId: string) {
  const stripe = getStripe();
  await stripe.accounts.update(accountId, {
    settings: {
      payouts: {
        schedule: weeklyMondayPayoutSchedule(),
      },
    },
  });
}

export async function ensureExpressAccount(opts: {
  restaurantId: string;
  email: string;
  name: string;
  country?: string;
}) {
  if (!isStripeConfigured()) {
    throw new Error("STRIPE_UNCONFIGURED");
  }
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: {
      id: true,
      name: true,
      stripeAccountId: true,
      stripeOnboardingComplete: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
    },
  });
  if (!restaurant) throw new Error("Restaurant nicht gefunden.");

  const stripe = getStripe();
  let accountId = restaurant.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: opts.country ?? "DE",
      email: opts.email,
      business_profile: {
        name: opts.name || restaurant.name,
        product_description: "Essenslieferung über Lieferway",
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { restaurantId: restaurant.id },
      settings: {
        payouts: {
          schedule: weeklyMondayPayoutSchedule(),
        },
      },
    });
    accountId = account.id;
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { stripeAccountId: accountId },
    });
  } else {
    try {
      await applyWeeklyMondayPayouts(accountId);
    } catch {
      /* schedule may already be set */
    }
  }
  return accountId;
}

export async function createAccountOnboardingLink(opts: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  const stripe = getStripe();
  return stripe.accountLinks.create({
    account: opts.accountId,
    refresh_url: opts.refreshUrl,
    return_url: opts.returnUrl,
    type: "account_onboarding",
  });
}

export function flagsFromAccount(account: Stripe.Account): Omit<RestaurantStripeFlags, "stripeAccountId"> {
  const charges = Boolean(account.charges_enabled);
  const payouts = Boolean(account.payouts_enabled);
  const details = Boolean(account.details_submitted);
  return {
    stripeDetailsSubmitted: details,
    stripeChargesEnabled: charges,
    stripePayoutsEnabled: payouts,
    stripeOnboardingComplete: details && charges,
  };
}

export async function syncRestaurantStripeAccount(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  if (!restaurant) return null;
  if (!restaurant.stripeAccountId || !isStripeConfigured()) return restaurant;
  const account = await getStripe().accounts.retrieve(restaurant.stripeAccountId);
  const flags = flagsFromAccount(account);
  return prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      ...flags,
      stripeAccountId: account.id,
    },
  });
}

export async function syncRestaurantByStripeAccount(account: Stripe.Account) {
  const restaurantId = account.metadata?.restaurantId;
  const flags = flagsFromAccount(account);
  if (restaurantId) {
    const found = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (found) {
      return prisma.restaurant.update({
        where: { id: found.id },
        data: { ...flags, stripeAccountId: account.id },
      });
    }
  }
  const byAccount = await prisma.restaurant.findUnique({
    where: { stripeAccountId: account.id },
  });
  if (!byAccount) return null;
  return prisma.restaurant.update({
    where: { id: byAccount.id },
    data: flags,
  });
}
