-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "stripeFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "applicationFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "restaurantNetCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformNetCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payoutStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "refundedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedCommissionCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedRestaurantNetCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedStripeFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disputeStatus" TEXT,
ADD COLUMN     "stripePayoutId" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "stripePayoutId" TEXT,
ADD COLUMN     "arrivalDate" TIMESTAMP(3),
ADD COLUMN     "failureMessage" TEXT;

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeRefund" (
    "id" TEXT NOT NULL,
    "stripeRefundId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "commissionReversalCents" INTEGER NOT NULL DEFAULT 0,
    "restaurantNetReversalCents" INTEGER NOT NULL DEFAULT 0,
    "stripeFeeReversalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_stripeAccountId_key" ON "Restaurant"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_stripeChargeId_idx" ON "Order"("stripeChargeId");

-- CreateIndex
CREATE INDEX "Order_status_paymentStatus_idx" ON "Order"("status", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripePayoutId_key" ON "Payout"("stripePayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeRefund_stripeRefundId_key" ON "StripeRefund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "StripeRefund_orderId_idx" ON "StripeRefund"("orderId");

-- AddForeignKey
ALTER TABLE "StripeRefund" ADD CONSTRAINT "StripeRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill restaurant net / platform share for existing orders
UPDATE "Order"
SET
  "applicationFeeCents" = GREATEST(0, "commissionCents" + "deliveryFeeCents" - "discountCents"),
  "restaurantNetCents" = GREATEST(0, "restaurantPayoutCents"),
  "platformNetCents" = GREATEST(0, "commissionCents" + "deliveryFeeCents" - "discountCents"),
  "payoutStatus" = CASE
    WHEN "paymentMethod" = 'CASH' THEN 'NONE'
    WHEN "paymentStatus" = 'PAID' THEN 'PENDING'
    ELSE 'UNPAID'
  END
WHERE "restaurantNetCents" = 0 AND "applicationFeeCents" = 0;
