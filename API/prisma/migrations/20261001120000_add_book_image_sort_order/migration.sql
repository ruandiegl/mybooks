ALTER TABLE "BookImage"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ordered_images AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "book_id"
      ORDER BY "isCover" DESC, "createdAt" ASC, "id" ASC
    ) - 1 AS position
  FROM "BookImage"
)
UPDATE "BookImage" AS image
SET "sort_order" = ordered_images.position::INTEGER
FROM ordered_images
WHERE image."id" = ordered_images."id";

CREATE INDEX "BookImage_book_id_sort_order_idx"
ON "BookImage"("book_id", "sort_order");
