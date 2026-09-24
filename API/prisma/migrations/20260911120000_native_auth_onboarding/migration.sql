-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "clerkUserId" DROP NOT NULL,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "cpfHash" TEXT,
  ADD COLUMN "cpfEncrypted" TEXT,
  ADD COLUMN "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "profileCompletedAt" TIMESTAMP(3),
  ADD COLUMN "booksOnboardingCompletedAt" TIMESTAMP(3),
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "passwordHash" = "passHash"
WHERE "passHash" IS NOT NULL;

ALTER TABLE "User"
  ADD CONSTRAINT "User_native_credentials_check"
    CHECK ("clerkUserId" IS NOT NULL OR ("email" IS NOT NULL AND "passwordHash" IS NOT NULL)),
  ADD CONSTRAINT "User_active_authentication_check"
    CHECK (NOT "isActive" OR ("email" IS NOT NULL AND "passwordHash" IS NOT NULL AND "emailVerifiedAt" IS NOT NULL));

-- CreateEnum
CREATE TYPE "AuthCodeType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AuthCodeType" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cpfHash_key" ON "User"("cpfHash");
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");
CREATE UNIQUE INDEX "AuthSession_replacedById_key" ON "AuthSession"("replacedById");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_familyId_idx" ON "AuthSession"("familyId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "AuthCode_userId_type_idx" ON "AuthCode"("userId", "type");
CREATE INDEX "AuthCode_expiresAt_idx" ON "AuthCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "AuthSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuthCode" ADD CONSTRAINT "AuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
