-- Payment cancel/refund lifecycle: accept timeout clock + failed-refund audit log.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "placedAt" TIMESTAMP(3);

-- Backfill: cash / already-placed orders approximate placedAt from createdAt or updatedAt.
UPDATE "Order"
SET "placedAt" = COALESCE("placedAt", "createdAt")
WHERE "status" NOT IN ('PENDING_PAYMENT')
  AND "placedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "PaymentReleaseLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "amountCents" INTEGER,
    "stripeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReleaseLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentReleaseLog_orderId_createdAt_idx" ON "PaymentReleaseLog"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentReleaseLog_status_createdAt_idx" ON "PaymentReleaseLog"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PaymentReleaseLog" ADD CONSTRAINT "PaymentReleaseLog_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
