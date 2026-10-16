-- Photo-only backfill for the 12 EXISTING demonstration books.
-- Does not create users/books, reset likes, replace uploaded photos, or touch R2.
-- Run after the book_image_order_cleanup migration, not the full demo seed in production.
BEGIN;

WITH seed_books AS (
  SELECT book."id", book."coverExternalUrl"
  FROM "Book" AS book
  WHERE book."id" IN (
    '30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000008',
    '30000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000010',
    '30000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000012'
  )
  AND book."coverExternalUrl" IS NOT NULL
  AND btrim(book."coverExternalUrl") <> ''
  AND NOT EXISTS (SELECT 1 FROM "BookImage" AS image WHERE image."book_id" = book."id")
  FOR UPDATE OF book
)
INSERT INTO "BookImage" ("id", "book_id", "url", "mimeType", "isCover", "sortOrder", "createdAt")
SELECT regexp_replace("id", '^30000000', '80000000'), "id", "coverExternalUrl", 'image/jpeg', true, 0, now()
FROM seed_books
ON CONFLICT DO NOTHING
RETURNING "book_id", "sortOrder", "isCover";

COMMIT;
