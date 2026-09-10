import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RestaurantPublicMenu } from "@/components/restaurant-public-menu";
import { loadPublicRestaurant } from "@/lib/public-restaurant";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await loadPublicRestaurant(slug);
  if (!restaurant) return { title: "Restaurant" };
  return {
    title: restaurant.name,
    description: restaurant.description,
  };
}

export default async function ShortRestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await loadPublicRestaurant(slug);
  if (!restaurant) notFound();
  return <RestaurantPublicMenu slug={restaurant.slug} />;
}
