-- Restaurant feature pack: Vorbestellung, Favoriten, Banner, Angebote; Order.scheduledFor

ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderMaxDaysAhead" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderMinLeadMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderWeekdaysJson" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderHoursJson" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderDelivery" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderPickup" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "preorderMaxConcurrent" INTEGER;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "bannerText" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "bannerActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "bannerStartsAt" TIMESTAMP(3);
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "bannerEndsAt" TIMESTAMP(3);

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Order_restaurantId_scheduledFor_idx" ON "Order"("restaurantId", "scheduledFor");

CREATE TABLE IF NOT EXISTS "FavoriteRestaurant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FavoriteRestaurant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FavoriteRestaurant_userId_restaurantId_key" ON "FavoriteRestaurant"("userId", "restaurantId");
CREATE INDEX IF NOT EXISTS "FavoriteRestaurant_userId_createdAt_idx" ON "FavoriteRestaurant"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FavoriteRestaurant_restaurantId_idx" ON "FavoriteRestaurant"("restaurantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FavoriteRestaurant_userId_fkey') THEN
    ALTER TABLE "FavoriteRestaurant"
      ADD CONSTRAINT "FavoriteRestaurant_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FavoriteRestaurant_restaurantId_fkey') THEN
    ALTER TABLE "FavoriteRestaurant"
      ADD CONSTRAINT "FavoriteRestaurant_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "RestaurantOffer" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "discountPercent" INTEGER,
    "discountCents" INTEGER,
    "minOrderCents" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT NOT NULL DEFAULT 'BOTH',
    "funding" TEXT NOT NULL DEFAULT 'RESTAURANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RestaurantOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RestaurantOffer_restaurantId_isActive_idx" ON "RestaurantOffer"("restaurantId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RestaurantOffer_restaurantId_fkey') THEN
    ALTER TABLE "RestaurantOffer"
      ADD CONSTRAINT "RestaurantOffer_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
