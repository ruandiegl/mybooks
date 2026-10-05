-- Read-only inventory. Review in a protected environment; do not log full URLs.
SELECT COUNT(*) AS users_total,
  COUNT(*) FILTER (WHERE "avatarUrl" IS NOT NULL) AS legacy_avatar_urls
FROM "User";
SELECT "id", CASE WHEN "avatarUrl" LIKE '%/avatars/%' THEN 'candidate_owned_r2' ELSE 'external' END AS avatar_kind
FROM "User" WHERE "avatarUrl" IS NOT NULL;
SELECT COUNT(*) FILTER (WHERE "url" IS NOT NULL AND "storageKey" IS NULL) AS legacy_book_urls
FROM "BookImage";
