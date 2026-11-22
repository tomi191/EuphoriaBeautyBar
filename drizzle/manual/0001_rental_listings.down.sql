-- Връщане на 0001_rental_listings.sql. ВНИМАНИЕ: трие данните на обявите в новите колони
-- (категория, услуги, адрес, снимка, предимства, бележка, състояние, заета от, Facebook, наем).
-- Старите колони и редове остават. Преди това върни кода, който чете новите колони.
BEGIN;

DROP INDEX IF EXISTS rental_positions_filled_by_idx;
DROP INDEX IF EXISTS rental_positions_status_idx;
DROP INDEX IF EXISTS rental_positions_slug_uq;

ALTER TABLE rental_positions
  DROP COLUMN IF EXISTS rent_public,
  DROP COLUMN IF EXISTS rent_text,
  DROP COLUMN IF EXISTS fb_posted_at,
  DROP COLUMN IF EXISTS fb_post_id,
  DROP COLUMN IF EXISTS filled_at,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS filled_by_resource_id,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS admin_note,
  DROP COLUMN IF EXISTS benefits,
  DROP COLUMN IF EXISTS image,
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS service_ids,
  DROP COLUMN IF EXISTS category_id;

COMMIT;
