import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { parsePreorderHours, parsePreorderWeekdays } from "@/lib/preorder";

export async function OPTIONS() {
  return options();
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      isActive: true,
      preorderEnabled: true,
      preorderMaxDaysAhead: true,
      preorderMinLeadMinutes: true,
      preorderWeekdaysJson: true,
      preorderHoursJson: true,
      preorderDelivery: true,
      preorderPickup: true,
      preorderMaxConcurrent: true,
    },
  });
  if (!restaurant || !restaurant.isActive) return fail("Restaurant nicht gefunden.", 404);
  return json({
    enabled: restaurant.preorderEnabled,
    settings: restaurant.preorderEnabled
      ? {
          maxDaysAhead: restaurant.preorderMaxDaysAhead,
          minLeadMinutes: restaurant.preorderMinLeadMinutes,
          weekdays: parsePreorderWeekdays(restaurant.preorderWeekdaysJson),
          hours: parsePreorderHours(restaurant.preorderHoursJson),
          delivery: restaurant.preorderDelivery,
          pickup: restaurant.preorderPickup,
          maxConcurrent: restaurant.preorderMaxConcurrent,
        }
      : null,
  });
}
