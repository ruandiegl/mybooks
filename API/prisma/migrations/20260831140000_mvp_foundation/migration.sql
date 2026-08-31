-- CreateEnum
CREATE TYPE "IsbnStatus" AS ENUM ('NONE', 'VALID');

-- CreateEnum
CREATE TYPE "BookAvailability" AS ENUM ('AVAILABLE', 'RESERVED', 'EXCHANGED');

-- CreateEnum
CREATE TYPE "InteractionAction" AS ENUM ('LIKE', 'PASS');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "clerkUserId" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "User"
SET "clerkUserId" = 'legacy:' || "id"
WHERE "clerkUserId" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "clerkUserId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Book"
ADD COLUMN "subtitle" TEXT,
ADD COLUMN "authors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "publisher" TEXT,
ADD COLUMN "synopsis" TEXT,
ADD COLUMN "year" INTEGER,
ADD COLUMN "pageCount" INTEGER,
ADD COLUMN "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "isbnStatus" "IsbnStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "isbnProvider" TEXT,
ADD COLUMN "isbnValidatedAt" TIMESTAMP(3),
ADD COLUMN "coverExternalUrl" TEXT,
ADD COLUMN "availability" "BookAvailability" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "BookImage"
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "size" INTEGER;

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetBookId" TEXT NOT NULL,
    "action" "InteractionAction" NOT NULL,
    "clientActionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMember" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("conversationId", "userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");
DROP INDEX IF EXISTS "Book_isbn_key";
CREATE INDEX "Book_isbn_idx" ON "Book"("isbn");
CREATE INDEX "Book_user_id_createdAt_idx" ON "Book"("user_id", "createdAt");
CREATE INDEX "Book_availability_createdAt_idx" ON "Book"("availability", "createdAt");
CREATE UNIQUE INDEX "BookImage_storageKey_key" ON "BookImage"("storageKey");
CREATE UNIQUE INDEX "Interaction_clientActionId_key" ON "Interaction"("clientActionId");
CREATE UNIQUE INDEX "Interaction_actorId_targetBookId_key" ON "Interaction"("actorId", "targetBookId");
CREATE INDEX "Interaction_targetBookId_action_idx" ON "Interaction"("targetBookId", "action");
CREATE UNIQUE INDEX "Match_userAId_userBId_key" ON "Match"("userAId", "userBId");
CREATE INDEX "Match_userAId_status_idx" ON "Match"("userAId", "status");
CREATE INDEX "Match_userBId_status_idx" ON "Match"("userBId", "status");
CREATE UNIQUE INDEX "Conversation_matchId_key" ON "Conversation"("matchId");
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");
CREATE UNIQUE INDEX "Message_senderId_clientMessageId_key" ON "Message"("senderId", "clientMessageId");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_targetBookId_fkey" FOREIGN KEY ("targetBookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
