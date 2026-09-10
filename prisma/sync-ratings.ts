import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncAllRestaurantRatings } from "../src/lib/reviews";

async function main() {
  await syncAllRestaurantRatings();
  const rows = await prisma.restaurant.findMany({
    select: { slug: true, rating: true, reviewCount: true, _count: { select: { reviews: true } } },
    orderBy: { slug: "asc" },
  });
  for (const r of rows) {
    console.log(`${r.slug}\trating=${r.rating}\tstored=${r.reviewCount}\treal=${r._count.reviews}`);
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
