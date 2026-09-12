-- Destination-charge fee split: estimate + actual + transfer
ALTER TABLE "Order" ADD COLUMN     "stripeFeeEstimatedCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN     "stripeFeeActualCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN     "platformNetCommissionCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN     "restaurantTransferCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN     "stripeFeeNote" TEXT;

UPDATE "Order"
SET
  "platformNetCommissionCents" = "commissionCents",
  "stripeFeeEstimatedCents" = "stripeFeeCents",
  "restaurantTransferCents" = CASE
    WHEN "applicationFeeCents" > 0 THEN GREATEST(0, "totalCents" - "applicationFeeCents")
    ELSE "restaurantPayoutCents"
  END
WHERE "platformNetCommissionCents" = 0;
