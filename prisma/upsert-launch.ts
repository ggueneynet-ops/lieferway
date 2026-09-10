import { PrismaClient } from "@prisma/client";
import { LAUNCH_WEEK_RESTAURANT_SLUGS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  await prisma.coupon.upsert({
    where: { code: "LOCAL5" },
    create: {
      code: "LOCAL5",
      description: "5 % auf Speisen — lokaler Tüten-Coupon",
      discountPercent: 5,
      isActive: true,
    },
    update: {
      description: "5 % auf Speisen — lokaler Tüten-Coupon",
      discountPercent: 5,
      discountCents: null,
      minSubtotalCents: null,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "START5" },
    create: {
      code: "START5",
      description: "5 € Startguthaben ab 20 € Speisen",
      discountCents: 500,
      minSubtotalCents: 2000,
      isActive: true,
    },
    update: {
      description: "5 € Startguthaben ab 20 € Speisen",
      discountPercent: null,
      discountCents: 500,
      minSubtotalCents: 2000,
      isActive: true,
    },
  });

  await prisma.coupon.updateMany({
    where: { code: "FRANKFURT" },
    data: { minSubtotalCents: 2000, description: "5 € Rabatt ab 20 € Speisen" },
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
