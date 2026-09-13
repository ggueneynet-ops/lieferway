import { redirect, notFound } from "next/navigation";
import { loadPublicRestaurant } from "@/lib/public-restaurant";

export const dynamic = "force-dynamic";

/** Shareable alias: /r/{slug} → /{slug} (matches PersonalOrderLink / QR). */
export default async function RestaurantShareAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await loadPublicRestaurant(slug);
  if (!restaurant) notFound();
  redirect(`/${restaurant.slug}`);
}
