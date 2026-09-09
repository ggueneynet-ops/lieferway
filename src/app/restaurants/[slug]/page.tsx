import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MenuClient } from "@/components/menu-client";
import { Bike, Clock, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { name: "asc" } } },
      },
    },
  });
  if (!restaurant || !restaurant.isActive) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="relative h-52 w-full bg-muted sm:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurantPhoto(restaurant.imageUrl, restaurant.cuisine, restaurant.slug)}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-0 right-0 mx-auto max-w-6xl px-4 text-white">
            <p className="text-sm text-white/80">{restaurant.cuisine} · {restaurant.postalCode} {restaurant.city}</p>
            <h1 className="font-display text-3xl font-semibold">{restaurant.name}</h1>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="size-4 fill-primary text-primary" />
              {restaurant.rating.toFixed(1)} ({restaurant.reviewCount})
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" />
              {restaurant.etaMin}–{restaurant.etaMax} Min.
            </span>
            <span className="inline-flex items-center gap-1">
              <Bike className="size-4" />
              {formatEUR(restaurant.deliveryFeeCents)} Lieferung
            </span>
            <span>Min. {formatEUR(restaurant.minOrderCents)}</span>
            <span>{restaurant.address}</span>
            {!restaurant.isOpen && (
              <span className="font-medium text-destructive">Derzeit geschlossen</span>
            )}
          </div>
          <p className="mb-8 max-w-2xl text-muted-foreground">{restaurant.description}</p>
          <MenuClient restaurant={restaurant} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
