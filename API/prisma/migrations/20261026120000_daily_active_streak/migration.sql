ALTER TABLE "User"
ADD COLUMN "lastActiveDay" DATE,
ADD COLUMN "currentActiveStreak" INTEGER;

CREATE INDEX "User_lastActiveDay_currentActiveStreak_idx"
ON "User"("lastActiveDay", "currentActiveStreak");
