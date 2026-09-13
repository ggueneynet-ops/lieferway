import { prisma } from "./prisma";
import {
  WAYPOINTS_COMPLETED_STATUS,
  WAYPOINTS_REVERSAL_STATUSES,
  campaignLedgerKey,
  DEFAULT_POINTS_PER_EURO,
  formatLedgerTitle,
  isCampaignWindowOpen,
  isWayPointsParticipating,
  ledgerUniqueKey,
  parseFundedBy,
  parseRewardType,
  previewEarnPoints,
  rewardDiscountCents,
  splitWayPointsFunding,
  type WayPointsCampaignType,
  type WayPointsFundedBy,
  type WayPointsLedgerType,
} from "./waypoints";

function isUniqueViolation(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("Unique") || msg.includes("unique") || msg.includes("UNIQUE");
}

export async function getWayPointsSettings() {
  const row = await prisma.wayPointsSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", pointsPerEuro: DEFAULT_POINTS_PER_EURO },
  });
  return { pointsPerEuro: Math.max(1, row.pointsPerEuro) };
}

export async function setPointsPerEuro(pointsPerEuro: number) {
  const value = Math.max(1, Math.min(1000, Math.round(pointsPerEuro)));
  return prisma.wayPointsSettings.upsert({
    where: { id: "default" },
    update: { pointsPerEuro: value },
    create: { id: "default", pointsPerEuro: value },
  });
}

type LedgerWrite = {
  userId: string;
  delta: number;
  type: WayPointsLedgerType;
  uniqueKey: string;
  title: string;
  orderId?: string | null;
  rewardId?: string | null;
  campaignId?: string | null;
  restaurantId?: string | null;
};

export async function appendLedger(entry: LedgerWrite) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: entry.userId },
        select: { wayPointsBalance: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      const next = user.wayPointsBalance + entry.delta;
      if (next < 0) throw new Error("INSUFFICIENT_POINTS");
      const row = await tx.wayPointsLedger.create({
        data: {
          userId: entry.userId,
          delta: entry.delta,
          balanceAfter: next,
          type: entry.type,
          uniqueKey: entry.uniqueKey,
          title: entry.title,
          orderId: entry.orderId ?? null,
          rewardId: entry.rewardId ?? null,
          campaignId: entry.campaignId ?? null,
          restaurantId: entry.restaurantId ?? null,
        },
      });
      await tx.user.update({
        where: { id: entry.userId },
        data: { wayPointsBalance: next },
      });
      return { created: true as const, row, balance: next };
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const existing = await prisma.wayPointsLedger.findUnique({
        where: { uniqueKey: entry.uniqueKey },
      });
      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
        select: { wayPointsBalance: true },
      });
      return {
        created: false as const,
        row: existing,
        balance: user?.wayPointsBalance ?? 0,
      };
    }
    throw e;
  }
}

async function activeCampaigns(now: Date, restaurantId?: string | null) {
  const rows = await prisma.wayPointsCampaign.findMany({
    where: {
      isActive: true,
      OR: [{ restaurantId: null }, restaurantId ? { restaurantId } : { restaurantId: null }],
    },
  });
  return rows.filter((c) => isCampaignWindowOpen(now, c.validFrom, c.validUntil));
}

export async function bestEarnMultiplier(restaurantId: string, now = new Date()) {
  const campaigns = await activeCampaigns(now, restaurantId);
  let max = 1;
  for (const c of campaigns) {
    if (c.type === "MULTIPLIER" && c.multiplier && c.multiplier > max) max = c.multiplier;
  }
  return max;
}

export type RewardQuote = {
  rewardId: string;
  title: string;
  pointsCost: number;
  discountCents: number;
  fundedBy: WayPointsFundedBy;
  restaurantShareCents: number;
  lieferwayShareCents: number;
  type: string;
};

export function quoteRewardDiscount(opts: {
  reward: {
    id: string;
    title: string;
    pointsCost: number;
    type: string;
    percentOff: number | null;
    discountCents: number | null;
    freeMenuItemId: string | null;
    freeMenuItem?: { id: string; priceCents: number; name: string } | null;
    minOrderCents: number | null;
    validFrom: Date | null;
    validUntil: Date | null;
    usageLimit: number | null;
    usageCount: number;
    perCustomerLimit: number | null;
    isActive: boolean;
    fundedBy: string;
    restaurantShareBps: number;
    lieferwayShareBps: number;
  };
  foodSubtotalCents: number;
  cartMenuItemIds: string[];
  now?: Date;
}): { ok: true; quote: RewardQuote } | { ok: false; error: string } {
  const now = opts.now ?? new Date();
  const type = parseRewardType(opts.reward.type);
  if (!type) return { ok: false, error: "Prämie ungültig." };
  if (!opts.reward.isActive) return { ok: false, error: "Prämie ist nicht aktiv." };
  if (!isCampaignWindowOpen(now, opts.reward.validFrom, opts.reward.validUntil)) {
    return { ok: false, error: "Prämie gilt gerade nicht." };
  }
  if (opts.reward.minOrderCents && opts.foodSubtotalCents < opts.reward.minOrderCents) {
    return { ok: false, error: "Mindestbestellwert für diese Prämie nicht erreicht." };
  }
  if (opts.reward.usageLimit != null && opts.reward.usageCount >= opts.reward.usageLimit) {
    return { ok: false, error: "Prämie ist ausgeschöpft." };
  }
  const freeInCart = Boolean(
    opts.reward.freeMenuItemId && opts.cartMenuItemIds.includes(opts.reward.freeMenuItemId),
  );
  const discount = rewardDiscountCents({
    type,
    foodSubtotalCents: opts.foodSubtotalCents,
    percentOff: opts.reward.percentOff,
    discountCents: opts.reward.discountCents,
    freeItemPriceCents: opts.reward.freeMenuItem?.priceCents ?? null,
    freeItemInCart: type !== "FREE_ITEM" || freeInCart,
  });
  if (type === "FREE_ITEM" && !freeInCart) {
    return { ok: false, error: "Gratis-Produkt liegt nicht im Warenkorb." };
  }
  if (discount <= 0) return { ok: false, error: "Prämie ergibt keinen Rabatt." };
  const fundedBy = parseFundedBy(opts.reward.fundedBy);
  const split = splitWayPointsFunding({
    discountCents: discount,
    fundedBy,
    restaurantShareBps: opts.reward.restaurantShareBps,
    lieferwayShareBps: opts.reward.lieferwayShareBps,
  });
  return {
    ok: true,
    quote: {
      rewardId: opts.reward.id,
      title: opts.reward.title,
      pointsCost: opts.reward.pointsCost,
      discountCents: discount,
      fundedBy: split.fundedBy,
      restaurantShareCents: split.restaurantShareCents,
      lieferwayShareCents: split.lieferwayShareCents,
      type,
    },
  };
}

export async function loadRedeemableRewards(opts: {
  restaurantId: string;
  userId: string;
  foodSubtotalCents: number;
  cartMenuItemIds: string[];
}) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { wayPointsEnabled: true, wayPointsDisabledByAdmin: true },
  });
  if (!restaurant || !isWayPointsParticipating(restaurant)) return [];

  const [user, rewards] = await Promise.all([
    prisma.user.findUnique({
      where: { id: opts.userId },
      select: { wayPointsBalance: true },
    }),
    prisma.wayPointsReward.findMany({
      where: { restaurantId: opts.restaurantId, isActive: true },
      include: { freeMenuItem: { select: { id: true, name: true, priceCents: true } } },
      orderBy: { pointsCost: "asc" },
    }),
  ]);
  const balance = user?.wayPointsBalance ?? 0;
  const now = new Date();
  const out: (RewardQuote & { available: boolean; reason?: string })[] = [];
  for (const reward of rewards) {
    if (reward.perCustomerLimit && reward.perCustomerLimit > 0) {
      const used = await prisma.wayPointsRedemption.count({
        where: { userId: opts.userId, rewardId: reward.id, status: "APPLIED" },
      });
      if (used >= reward.perCustomerLimit) {
        continue;
      }
    }
    const quoted = quoteRewardDiscount({
      reward,
      foodSubtotalCents: opts.foodSubtotalCents,
      cartMenuItemIds: opts.cartMenuItemIds,
      now,
    });
    if (!quoted.ok) continue;
    const available = balance >= reward.pointsCost;
    out.push({
      ...quoted.quote,
      available,
      reason: available ? undefined : "Nicht genug WayPoints.",
    });
  }
  return out;
}

export async function previewCheckoutReward(opts: {
  userId: string;
  restaurantId: string;
  rewardId: string;
  foodSubtotalCents: number;
  couponDiscountCents: number;
  cartMenuItemIds: string[];
}) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { wayPointsEnabled: true, wayPointsDisabledByAdmin: true },
  });
  if (!restaurant || !isWayPointsParticipating(restaurant)) {
    return { ok: false as const, error: "Dieses Restaurant nimmt nicht am WayPoints-Programm teil." };
  }
  const reward = await prisma.wayPointsReward.findFirst({
    where: { id: opts.rewardId, restaurantId: opts.restaurantId },
    include: { freeMenuItem: { select: { id: true, name: true, priceCents: true } } },
  });
  if (!reward) return { ok: false as const, error: "Prämie nicht gefunden." };
  if (reward.perCustomerLimit && reward.perCustomerLimit > 0) {
    const used = await prisma.wayPointsRedemption.count({
      where: { userId: opts.userId, rewardId: reward.id, status: "APPLIED" },
    });
    if (used >= reward.perCustomerLimit) {
      return { ok: false as const, error: "Limit pro Kunde erreicht." };
    }
  }
  const quoted = quoteRewardDiscount({
    reward,
    foodSubtotalCents: opts.foodSubtotalCents,
    cartMenuItemIds: opts.cartMenuItemIds,
  });
  if (!quoted.ok) return { ok: false as const, error: quoted.error };
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { wayPointsBalance: true },
  });
  if (!user || user.wayPointsBalance < reward.pointsCost) {
    return { ok: false as const, error: "Nicht genug WayPoints." };
  }
  const cappedWp = Math.min(
    quoted.quote.discountCents,
    Math.max(0, opts.foodSubtotalCents - opts.couponDiscountCents),
  );
  const split = splitWayPointsFunding({
    discountCents: cappedWp,
    fundedBy: quoted.quote.fundedBy,
    restaurantShareBps: reward.restaurantShareBps,
    lieferwayShareBps: reward.lieferwayShareBps,
  });
  return {
    ok: true as const,
    quote: {
      ...quoted.quote,
      discountCents: cappedWp,
      restaurantShareCents: split.restaurantShareCents,
      lieferwayShareCents: split.lieferwayShareCents,
    },
  };
}

export async function redeemRewardForOrder(opts: {
  userId: string;
  orderId: string;
  restaurantId: string;
  rewardId: string;
  foodSubtotalCents: number;
  couponDiscountCents: number;
  cartMenuItemIds: string[];
}) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: { wayPointsEnabled: true, wayPointsDisabledByAdmin: true },
  });
  if (!restaurant || !isWayPointsParticipating(restaurant)) {
    return { ok: false as const, error: "Dieses Restaurant nimmt nicht an WayPoints teil." };
  }
  const reward = await prisma.wayPointsReward.findFirst({
    where: { id: opts.rewardId, restaurantId: opts.restaurantId },
    include: { freeMenuItem: { select: { id: true, name: true, priceCents: true } } },
  });
  if (!reward) return { ok: false as const, error: "Prämie nicht gefunden." };

  const quoted = quoteRewardDiscount({
    reward,
    foodSubtotalCents: opts.foodSubtotalCents,
    cartMenuItemIds: opts.cartMenuItemIds,
  });
  if (!quoted.ok) return { ok: false as const, error: quoted.error };

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { wayPointsBalance: true },
  });
  if (!user || user.wayPointsBalance < reward.pointsCost) {
    return { ok: false as const, error: "Nicht genug WayPoints." };
  }

  const cappedWp = Math.min(
    quoted.quote.discountCents,
    Math.max(0, opts.foodSubtotalCents - opts.couponDiscountCents),
  );
  const split = splitWayPointsFunding({
    discountCents: cappedWp,
    fundedBy: quoted.quote.fundedBy,
    restaurantShareBps: reward.restaurantShareBps,
    lieferwayShareBps: reward.lieferwayShareBps,
  });

  const ledger = await appendLedger({
    userId: opts.userId,
    delta: -reward.pointsCost,
    type: "REDEEM",
    uniqueKey: ledgerUniqueKey("REDEEM", opts.orderId),
    title: formatLedgerTitle({ type: "REDEEM", rewardTitle: reward.title }),
    orderId: opts.orderId,
    rewardId: reward.id,
    restaurantId: opts.restaurantId,
  });
  if (!ledger.created && ledger.row) {
    const existing = await prisma.wayPointsRedemption.findUnique({ where: { orderId: opts.orderId } });
    if (existing) {
      return {
        ok: true as const,
        quote: {
          ...quoted.quote,
          discountCents: existing.discountCents,
          restaurantShareCents: existing.restaurantShareCents,
          lieferwayShareCents: existing.lieferwayShareCents,
          fundedBy: parseFundedBy(existing.fundedBy),
        },
      };
    }
  }

  await prisma.$transaction([
    prisma.wayPointsRedemption.upsert({
      where: { orderId: opts.orderId },
      update: {},
      create: {
        userId: opts.userId,
        orderId: opts.orderId,
        rewardId: reward.id,
        pointsSpent: reward.pointsCost,
        discountCents: cappedWp,
        fundedBy: split.fundedBy,
        restaurantShareCents: split.restaurantShareCents,
        lieferwayShareCents: split.lieferwayShareCents,
        status: "APPLIED",
      },
    }),
    prisma.wayPointsReward.update({
      where: { id: reward.id },
      data: { usageCount: { increment: 1 } },
    }),
  ]);

  return {
    ok: true as const,
    quote: {
      ...quoted.quote,
      discountCents: cappedWp,
      restaurantShareCents: split.restaurantShareCents,
      lieferwayShareCents: split.lieferwayShareCents,
    },
  };
}

export async function creditEarnForCompletedOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          wayPointsEnabled: true,
          wayPointsDisabledByAdmin: true,
        },
      },
    },
  });
  if (!order) return { skipped: true as const, reason: "missing" };
  if (order.status !== WAYPOINTS_COMPLETED_STATUS) {
    return { skipped: true as const, reason: "not_completed" };
  }
  if (order.paymentStatus === "FAILED" || order.paymentStatus === "PENDING") {
    return { skipped: true as const, reason: "unpaid" };
  }
  if (!order.wayPointsEligible && !isWayPointsParticipating(order.restaurant)) {
    return { skipped: true as const, reason: "not_participating" };
  }
  if (!isWayPointsParticipating(order.restaurant) && !order.wayPointsEligible) {
    return { skipped: true as const, reason: "not_participating" };
  }
  if (!isWayPointsParticipating(order.restaurant)) {
    return { skipped: true as const, reason: "opted_out" };
  }

  const settings = await getWayPointsSettings();
  const multiplier = await bestEarnMultiplier(order.restaurantId);
  const points = previewEarnPoints({
    foodSubtotalCents: order.foodSubtotalCents,
    pointsPerEuro: settings.pointsPerEuro,
    multiplier,
  });
  if (points <= 0) return { skipped: true as const, reason: "zero" };

  const title = formatLedgerTitle({
    type: "EARN",
    restaurantName: order.restaurant.name,
    shortCode: order.shortCode,
  });
  const result = await appendLedger({
    userId: order.customerId,
    delta: points,
    type: "EARN",
    uniqueKey: ledgerUniqueKey("EARN", order.id),
    title,
    orderId: order.id,
    restaurantId: order.restaurantId,
  });

  if (result.created) {
    await prisma.order.update({
      where: { id: order.id },
      data: { wayPointsEarned: points },
    });
    await grantCompletionCampaigns(order);
  }
  return { skipped: false as const, points, created: result.created };
}

async function grantCompletionCampaigns(order: {
  id: string;
  customerId: string;
  restaurantId: string;
  shortCode: string;
}) {
  const now = new Date();
  const campaigns = await activeCampaigns(now, order.restaurantId);
  const deliveredCount = await prisma.order.count({
    where: { customerId: order.customerId, status: WAYPOINTS_COMPLETED_STATUS },
  });
  const firstCompleted = deliveredCount <= 1;

  for (const campaign of campaigns) {
    const type = campaign.type as WayPointsCampaignType;
    if (type === "MULTIPLIER") continue;
    if ((campaign.firstOrderOnly || type === "FIRST_ORDER_BONUS") && !firstCompleted) continue;

    if (type === "FIRST_ORDER_BONUS" || type === "BONUS_POINTS") {
      const bonus = campaign.bonusPoints ?? 0;
      if (bonus <= 0) continue;
      await appendLedger({
        userId: order.customerId,
        delta: bonus,
        type: "BONUS",
        uniqueKey: campaignLedgerKey(campaign.id, order.customerId, order.id),
        title: campaign.title,
        orderId: order.id,
        campaignId: campaign.id,
        restaurantId: order.restaurantId,
      });
    }

    if (type === "BONUS_VOUCHER") {
      const cents = campaign.bonusDiscountCents ?? 0;
      if (cents <= 0) continue;
      const key = campaignLedgerKey(campaign.id, order.customerId, "voucher");
      const existing = await prisma.wayPointsVoucher.findFirst({
        where: { userId: order.customerId, campaignId: campaign.id },
      });
      if (existing) continue;
      await prisma.wayPointsVoucher.create({
        data: {
          userId: order.customerId,
          title: campaign.title,
          discountCents: cents,
          fundedBy: campaign.fundedBy || "LIEFERWAY",
          campaignId: campaign.id,
          expiresAt: campaign.validUntil,
        },
      });
      await appendLedger({
        userId: order.customerId,
        delta: 0,
        type: "BONUS",
        uniqueKey: key,
        title: campaign.title,
        orderId: order.id,
        campaignId: campaign.id,
        restaurantId: order.restaurantId,
      });
    }
  }
}

export async function reverseWayPointsForOrder(
  orderId: string,
  reason: "cancel" | "refund" | "reject" = "cancel",
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      restaurant: { select: { name: true } },
      wayPointsRedemption: true,
    },
  });
  if (!order) return { skipped: true as const, reason: "missing" };

  const earn = await prisma.wayPointsLedger.findUnique({
    where: { uniqueKey: ledgerUniqueKey("EARN", order.id) },
  });
  if (earn && earn.delta > 0) {
    await appendLedger({
      userId: order.customerId,
      delta: -earn.delta,
      type: "EARN_REVERSAL",
      uniqueKey: ledgerUniqueKey("EARN_REVERSAL", order.id),
      title: formatLedgerTitle({
        type: "EARN_REVERSAL",
        shortCode: order.shortCode,
        restaurantName: order.restaurant.name,
      }),
      orderId: order.id,
      restaurantId: order.restaurantId,
    });
  }

  const redeem = order.wayPointsRedemption;
  if (redeem && redeem.status === "APPLIED" && redeem.pointsSpent > 0) {
    const reversed = await appendLedger({
      userId: order.customerId,
      delta: redeem.pointsSpent,
      type: "REDEEM_REVERSAL",
      uniqueKey: ledgerUniqueKey("REDEEM_REVERSAL", order.id),
      title: formatLedgerTitle({
        type: "REDEEM_REVERSAL",
        shortCode: order.shortCode,
        rewardTitle: reason === "refund" ? "Bestellung erstattet" : undefined,
      }),
      orderId: order.id,
      rewardId: redeem.rewardId,
      restaurantId: order.restaurantId,
    });
    if (reversed.created) {
      await prisma.wayPointsRedemption.update({
        where: { id: redeem.id },
        data: { status: "REVERSED" },
      });
      await prisma.wayPointsReward.update({
        where: { id: redeem.rewardId },
        data: { usageCount: { decrement: 1 } },
      });
    }
  }

  return { skipped: false as const };
}

export async function syncWayPointsAfterStatusChange(orderId: string, status: string) {
  if (status === WAYPOINTS_COMPLETED_STATUS) {
    return creditEarnForCompletedOrder(orderId);
  }
  if ((WAYPOINTS_REVERSAL_STATUSES as readonly string[]).includes(status)) {
    return reverseWayPointsForOrder(orderId, status === "REJECTED" ? "reject" : "cancel");
  }
  return { skipped: true as const, reason: "noop" };
}

export async function customerWayPointsPage(userId: string) {
  const [user, settings, ledger, vouchers, participating, rewards] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { wayPointsBalance: true } }),
    getWayPointsSettings(),
    prisma.wayPointsLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.wayPointsVoucher.findMany({
      where: { userId, redeemedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.restaurant.findMany({
      where: { isActive: true, wayPointsEnabled: true, wayPointsDisabledByAdmin: false },
      select: {
        id: true,
        slug: true,
        name: true,
        cuisine: true,
        imageUrl: true,
        logoUrl: true,
        city: true,
        postalCode: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.wayPointsReward.findMany({
      where: {
        isActive: true,
        restaurant: { isActive: true, wayPointsEnabled: true, wayPointsDisabledByAdmin: false },
      },
      include: { restaurant: { select: { name: true, slug: true } } },
      orderBy: { pointsCost: "asc" },
      take: 24,
    }),
  ]);
  const balance = user?.wayPointsBalance ?? 0;
  const progress = nextProgress(balance, rewards.map((r) => r.pointsCost));
  return {
    balance,
    pointsPerEuro: settings.pointsPerEuro,
    progress,
    ledger,
    vouchers: vouchers.filter((v) => !v.expiresAt || v.expiresAt > new Date()),
    restaurants: participating,
    rewards,
  };
}

function nextProgress(balance: number, costs: number[]) {
  const sorted = [...new Set(costs.filter((c) => c > 0))].sort((a, b) => a - b);
  const next = sorted.find((c) => c > balance) ?? null;
  const target = next ?? sorted[0] ?? null;
  return {
    current: balance,
    target,
    remaining: target == null ? 0 : Math.max(0, target - balance),
  };
}

export async function adminWayPointsOverview() {
  const [settings, participating, locked, earned, redeemed, rewards, campaigns, funded] =
    await Promise.all([
      getWayPointsSettings(),
      prisma.restaurant.count({ where: { wayPointsEnabled: true, wayPointsDisabledByAdmin: false } }),
      prisma.restaurant.count({ where: { wayPointsDisabledByAdmin: true } }),
      prisma.wayPointsLedger.aggregate({ where: { type: "EARN" }, _sum: { delta: true } }),
      prisma.wayPointsLedger.aggregate({ where: { type: "REDEEM" }, _sum: { delta: true } }),
      prisma.wayPointsReward.count({ where: { isActive: true } }),
      prisma.wayPointsCampaign.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        where: { wayPointsDiscountCents: { gt: 0 } },
        _sum: {
          wayPointsDiscountCents: true,
          wayPointsRestaurantShareCents: true,
          wayPointsLieferwayShareCents: true,
        },
      }),
    ]);
  const restaurants = await prisma.restaurant.findMany({
    where: { OR: [{ wayPointsEnabled: true }, { wayPointsDisabledByAdmin: true }] },
    select: {
      id: true,
      name: true,
      slug: true,
      wayPointsEnabled: true,
      wayPointsDisabledByAdmin: true,
    },
    orderBy: { name: "asc" },
  });
  const campaignRows = await prisma.wayPointsCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return {
    settings,
    stats: {
      participating,
      locked,
      pointsEarned: earned._sum.delta ?? 0,
      pointsRedeemed: Math.abs(redeemed._sum.delta ?? 0),
      activeRewards: rewards,
      activeCampaigns: campaigns,
      restaurantFundedCents: funded._sum.wayPointsRestaurantShareCents ?? 0,
      lieferwayFundedCents: funded._sum.wayPointsLieferwayShareCents ?? 0,
      discountCents: funded._sum.wayPointsDiscountCents ?? 0,
    },
    restaurants,
    campaigns: campaignRows,
  };
}
