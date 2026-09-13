import { PrismaClient } from "@prisma/client";
import { LAUNCH_WEEK_RESTAURANT_SLUGS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  // Platform coupons removed — restaurant Gutscheine only.
  // Deactivate any leftover global campaign codes.
  await prisma.coupon.updateMany({
    where: { restaurantId: null, isActive: true },
    data: { isActive: false },
  });
  await prisma.coupon.updateMany({
    where: {
      code: { in: ["LOCAL5", "LOCAL8", "START5", "WILLKOMMEN10", "FRANKFURT", "HOSGELDIN"] },
    },
    data: { isActive: false },
  });

  await prisma.restaurant.updateMany({
    where: { slug: { in: [...LAUNCH_WEEK_RESTAURANT_SLUGS] } },
    data: { launchWeekFreeDelivery: true },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
