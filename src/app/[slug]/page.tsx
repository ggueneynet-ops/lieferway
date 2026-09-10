import { notFound } from "next/navigation";
import { RestaurantPublicMenu } from "@/components/restaurant-public-menu";
import { RESERVED_SLUGS } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function ShortRestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  return <RestaurantPublicMenu slug={slug} />;
}
