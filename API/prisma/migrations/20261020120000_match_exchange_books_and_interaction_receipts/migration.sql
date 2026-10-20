-- Legacy matches have no recorded exchange books. Do not infer them from likes.
ALTER TABLE "Match"
ADD COLUMN "bookAId" TEXT,
ADD COLUMN "bookBId" TEXT;

CREATE TABLE "InteractionActionReceipt" (
    "clientActionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetBookId" TEXT NOT NULL,
    "action" "InteractionAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteractionActionReceipt_pkey" PRIMARY KEY ("clientActionId")
);

-- Preserve issued action IDs even when their mutable interaction changes later.
INSERT INTO "InteractionActionReceipt" ("clientActionId", "actorId", "targetBookId", "action", "createdAt")
SELECT "clientActionId", "actorId", "targetBookId", "action", "createdAt"
FROM "Interaction";

CREATE INDEX "Match_bookAId_idx" ON "Match"("bookAId");
CREATE INDEX "Match_bookBId_idx" ON "Match"("bookBId");
CREATE INDEX "InteractionActionReceipt_actorId_idx" ON "InteractionActionReceipt"("actorId");
CREATE INDEX "InteractionActionReceipt_targetBookId_idx" ON "InteractionActionReceipt"("targetBookId");

ALTER TABLE "Match" ADD CONSTRAINT "Match_bookAId_fkey" FOREIGN KEY ("bookAId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_bookBId_fkey" FOREIGN KEY ("bookBId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InteractionActionReceipt" ADD CONSTRAINT "InteractionActionReceipt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionActionReceipt" ADD CONSTRAINT "InteractionActionReceipt_targetBookId_fkey" FOREIGN KEY ("targetBookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
