-- Read-only audit to run against a backup or target database before applying
-- 20260930120000_book_image_order_cleanup. Resolve every returned book
-- explicitly; the migration aborts if any row is returned.
SELECT
  book."id" AS "bookId",
  book."title",
  book."user_id" AS "ownerId",
  COUNT(image."id") AS "imageCount",
  COUNT(*) FILTER (WHERE image."isCover") AS "coverCount",
  ARRAY_AGG(
    image."id"
    ORDER BY image."isCover" DESC, image."createdAt" ASC, image."id" ASC
  ) AS "imageIdsInBackfillOrder"
FROM "Book" AS book
JOIN "BookImage" AS image ON image."book_id" = book."id"
GROUP BY book."id", book."title", book."user_id"
HAVING COUNT(image."id") > 3
  OR COUNT(*) FILTER (WHERE image."isCover") > 1
ORDER BY book."id";
