DO $$
DECLARE
  books_over_limit BIGINT;
  books_with_conflicting_covers BIGINT;
BEGIN
  SELECT COUNT(*) INTO books_over_limit
  FROM (
    SELECT "book_id"
    FROM "BookImage"
    GROUP BY "book_id"
    HAVING COUNT(*) > 3
  ) AS over_limit;

  SELECT COUNT(*) INTO books_with_conflicting_covers
  FROM (
    SELECT "book_id"
    FROM "BookImage"
    GROUP BY "book_id"
    HAVING COUNT(*) FILTER (WHERE "isCover") > 1
  ) AS conflicting_covers;

  IF books_over_limit > 0 OR books_with_conflicting_covers > 0 THEN
    RAISE EXCEPTION
      'BookImage preflight failed: % books have more than 3 images; % books have multiple covers. Audit and resolve explicitly before retrying.',
      books_over_limit,
      books_with_conflicting_covers;
  END IF;
END $$;

ALTER TABLE "BookImage" ADD COLUMN "sortOrder" INTEGER;

WITH ranked_images AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "book_id"
      ORDER BY "isCover" DESC, "createdAt" ASC, "id" ASC
    ) - 1 AS position
  FROM "BookImage"
)
UPDATE "BookImage" AS image
SET "sortOrder" = ranked_images.position
FROM ranked_images
WHERE image."id" = ranked_images."id";

UPDATE "BookImage"
SET "isCover" = ("sortOrder" = 0);

ALTER TABLE "BookImage" ALTER COLUMN "sortOrder" SET NOT NULL;
ALTER TABLE "BookImage" ALTER COLUMN "url" DROP NOT NULL;

CREATE UNIQUE INDEX "BookImage_book_id_sortOrder_key"
  ON "BookImage"("book_id", "sortOrder");
CREATE UNIQUE INDEX "BookImage_one_cover_per_book_key"
  ON "BookImage"("book_id")
  WHERE "isCover" = TRUE;

CREATE TABLE "StorageCleanupJob" (
  "id" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorageCleanupJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageCleanupJob_storageKey_key"
  ON "StorageCleanupJob"("storageKey");
CREATE INDEX "StorageCleanupJob_nextAttemptAt_idx"
  ON "StorageCleanupJob"("nextAttemptAt");
