-- Additive: existing external avatar URLs and users remain unchanged.
ALTER TABLE "User" ADD COLUMN "avatarStorageKey" TEXT,
  ADD COLUMN "avatarVersion" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "User_avatarStorageKey_key" ON "User"("avatarStorageKey");
ALTER TABLE "User" ADD CONSTRAINT "User_avatarVersion_nonnegative" CHECK ("avatarVersion" >= 0);
CREATE TYPE "AvatarUploadStatus" AS ENUM ('PENDING','PROCESSING','COMMITTED','CANCELED','EXPIRED');
CREATE TABLE "AvatarUpload" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "protocolVersion" INTEGER NOT NULL, "expectedAvatarVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "status" "AvatarUploadStatus" NOT NULL DEFAULT 'PENDING',
  "processingStartedAt" TIMESTAMP(3), "resultVersion" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AvatarUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AvatarUpload_size_positive" CHECK ("size" > 0 AND "size" <= 8388608),
  CONSTRAINT "AvatarUpload_protocol_valid" CHECK ("protocolVersion" IN (1,2))
);
CREATE UNIQUE INDEX "AvatarUpload_storageKey_key" ON "AvatarUpload"("storageKey");
CREATE INDEX "AvatarUpload_userId_status_idx" ON "AvatarUpload"("userId","status");
CREATE INDEX "AvatarUpload_status_expiresAt_idx" ON "AvatarUpload"("status","expiresAt");
