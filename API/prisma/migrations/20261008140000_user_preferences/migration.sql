CREATE TABLE "UserPreferences" (
    "userId" TEXT NOT NULL,
    "showLikesBadge" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
