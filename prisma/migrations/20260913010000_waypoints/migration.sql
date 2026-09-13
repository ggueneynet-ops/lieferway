-- WayPoints loyalty: opt-in, ledger, rewards, campaigns, order financing fields

ALTER TABLE "User" ADD COLUMN "wayPointsBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Restaurant" ADD COLUMN "wayPointsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "wayPointsDisabledByAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order" ADD COLUMN "wayPointsRewardId" TEXT;
ALTER TABLE "Order" ADD COLUMN "wayPointsDiscountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "wayPointsFundedBy" TEXT;
ALTER TABLE "Order" ADD COLUMN "wayPointsRestaurantShareCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "wayPointsLieferwayShareCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "wayPointsEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "wayPointsRedeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "wayPointsEligible" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WayPointsSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pointsPerEuro" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WayPointsSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WayPointsReward" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "pointsCost" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "percentOff" INTEGER,
    "discountCents" INTEGER,
    "freeMenuItemId" TEXT,
    "minOrderCents" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "perCustomerLimit" INTEGER DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fundedBy" TEXT NOT NULL DEFAULT 'RESTAURANT',
    "restaurantShareBps" INTEGER NOT NULL DEFAULT 10000,
    "lieferwayShareBps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WayPointsReward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WayPointsCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION,
    "bonusPoints" INTEGER,
    "bonusDiscountCents" INTEGER,
    "fundedBy" TEXT NOT NULL DEFAULT 'LIEFERWAY',
    "restaurantId" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WayPointsCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WayPointsLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "uniqueKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderId" TEXT,
    "rewardId" TEXT,
    "campaignId" TEXT,
    "restaurantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WayPointsLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WayPointsRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "fundedBy" TEXT NOT NULL,
    "restaurantShareCents" INTEGER NOT NULL,
    "lieferwayShareCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WayPointsRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WayPointsVoucher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "fundedBy" TEXT NOT NULL DEFAULT 'LIEFERWAY',
    "expiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WayPointsVoucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WayPointsLedger_uniqueKey_key" ON "WayPointsLedger"("uniqueKey");
CREATE INDEX "WayPointsLedger_userId_createdAt_idx" ON "WayPointsLedger"("userId", "createdAt");
CREATE INDEX "WayPointsLedger_orderId_idx" ON "WayPointsLedger"("orderId");
CREATE INDEX "WayPointsLedger_type_idx" ON "WayPointsLedger"("type");

CREATE INDEX "WayPointsReward_restaurantId_isActive_idx" ON "WayPointsReward"("restaurantId", "isActive");
CREATE INDEX "WayPointsCampaign_isActive_type_idx" ON "WayPointsCampaign"("isActive", "type");

CREATE UNIQUE INDEX "WayPointsRedemption_orderId_key" ON "WayPointsRedemption"("orderId");
CREATE INDEX "WayPointsRedemption_userId_rewardId_idx" ON "WayPointsRedemption"("userId", "rewardId");
CREATE INDEX "WayPointsVoucher_userId_redeemedAt_idx" ON "WayPointsVoucher"("userId", "redeemedAt");

ALTER TABLE "WayPointsReward" ADD CONSTRAINT "WayPointsReward_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WayPointsReward" ADD CONSTRAINT "WayPointsReward_freeMenuItemId_fkey" FOREIGN KEY ("freeMenuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WayPointsCampaign" ADD CONSTRAINT "WayPointsCampaign_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WayPointsLedger" ADD CONSTRAINT "WayPointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WayPointsLedger" ADD CONSTRAINT "WayPointsLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WayPointsLedger" ADD CONSTRAINT "WayPointsLedger_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "WayPointsReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WayPointsLedger" ADD CONSTRAINT "WayPointsLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WayPointsCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WayPointsRedemption" ADD CONSTRAINT "WayPointsRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WayPointsRedemption" ADD CONSTRAINT "WayPointsRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WayPointsRedemption" ADD CONSTRAINT "WayPointsRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "WayPointsReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WayPointsVoucher" ADD CONSTRAINT "WayPointsVoucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WayPointsVoucher" ADD CONSTRAINT "WayPointsVoucher_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WayPointsVoucher" ADD CONSTRAINT "WayPointsVoucher_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WayPointsCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_wayPointsRewardId_fkey" FOREIGN KEY ("wayPointsRewardId") REFERENCES "WayPointsReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "WayPointsSettings" ("id", "pointsPerEuro", "updatedAt")
VALUES ('default', 10, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
