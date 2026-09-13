-- Restaurant-only Gutscheine: scope coupons to restaurants, usage tracking, validation fields.
-- Platform/global coupons (restaurantId IS NULL) are deactivated; new coupons require a restaurant.

ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "restaurantId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "maxDiscountCents" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "validTo" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "maxTotalUses" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "usesPerCustomer" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'BOTH';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "funding" TEXT NOT NULL DEFAULT 'RESTAURANT';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill type from existing discount fields
UPDATE "Coupon"
SET "type" = CASE
  WHEN "discountCents" IS NOT NULL AND ("discountPercent" IS NULL OR "discountPercent" = 0) THEN 'FIXED'
  ELSE 'PERCENT'
END;

-- Deactivate legacy platform / global campaign codes
UPDATE "Coupon"
SET "isActive" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "restaurantId" IS NULL;

-- Drop global code uniqueness; codes are unique per restaurant
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_restaurantId_code_key" ON "Coupon"("restaurantId", "code");
CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_restaurantId_isActive_idx" ON "Coupon"("restaurantId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Coupon_restaurantId_fkey'
  ) THEN
    ALTER TABLE "Coupon"
      ADD CONSTRAINT "Coupon_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponUsage_orderId_key" ON "CouponUsage"("orderId");
CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_customerId_idx" ON "CouponUsage"("couponId", "customerId");
CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_status_idx" ON "CouponUsage"("couponId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CouponUsage_couponId_fkey'
  ) THEN
    ALTER TABLE "CouponUsage"
      ADD CONSTRAINT "CouponUsage_couponId_fkey"
      FOREIGN KEY ("couponId") REFERENCES "Coupon"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CouponUsage_orderId_fkey'
  ) THEN
    ALTER TABLE "CouponUsage"
      ADD CONSTRAINT "CouponUsage_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
