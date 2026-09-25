-- CreateEnum
CREATE TYPE "PremiumOfferCohort" AS ENUM ('EXISTING', 'NEW');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "premiumOfferCohort" "PremiumOfferCohort",
  ADD COLUMN "premiumOfferPromptedAt" TIMESTAMP(3),
  ADD COLUMN "premiumTrialEndsAt" TIMESTAMP(3),
  ADD COLUMN "premiumTrialStartedAt" TIMESTAMP(3),
  ALTER COLUMN "updatedAt" DROP DEFAULT;

UPDATE "User"
SET "premiumOfferCohort" = 'EXISTING'
WHERE "premiumOfferCohort" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "premiumOfferCohort" SET DEFAULT 'NEW',
  ALTER COLUMN "premiumOfferCohort" SET NOT NULL;

-- CreateTable
CREATE TABLE "LikeDailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetBookId" TEXT NOT NULL,
    "quotaDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LikeDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LikeDailyUsage_userId_quotaDate_idx" ON "LikeDailyUsage"("userId", "quotaDate");

-- CreateIndex
CREATE UNIQUE INDEX "LikeDailyUsage_userId_targetBookId_quotaDate_key" ON "LikeDailyUsage"("userId", "targetBookId", "quotaDate");

-- AddForeignKey
ALTER TABLE "LikeDailyUsage" ADD CONSTRAINT "LikeDailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
