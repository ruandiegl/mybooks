-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "pendingRegistrationExpiresAt" TIMESTAMP(3);

-- Existing inactive native accounts without verified e-mail are treated as
-- pending registrations and receive the same finite retry window.
UPDATE "User"
SET "pendingRegistrationExpiresAt" = "createdAt" + INTERVAL '24 hours'
WHERE "email" IS NOT NULL
  AND "passwordHash" IS NOT NULL
  AND "emailVerifiedAt" IS NULL
  AND "isActive" = false
  AND "pendingRegistrationExpiresAt" IS NULL;

-- CreateIndex
CREATE INDEX "User_pendingRegistrationExpiresAt_idx" ON "User"("pendingRegistrationExpiresAt");
