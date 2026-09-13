-- Central transactional email idempotency log
CREATE TABLE IF NOT EXISTS "EmailSendLog" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailSendLog_eventKey_key" ON "EmailSendLog"("eventKey");
CREATE INDEX IF NOT EXISTS "EmailSendLog_eventType_createdAt_idx" ON "EmailSendLog"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailSendLog_toEmail_createdAt_idx" ON "EmailSendLog"("toEmail", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailSendLog_status_updatedAt_idx" ON "EmailSendLog"("status", "updatedAt");
