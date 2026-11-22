-- №8 Б1: обявата за място под наем (rental_positions).
-- Само добавяне: старите колони и редове остават; старите редове получават празни/NULL стойности
-- (status NULL = ред отпреди обявите, кодът чете active). Пуска се веднъж, повторно не чупи нищо.
-- Връщане: 0001_rental_listings.down.sql.
BEGIN;

ALTER TABLE rental_positions
  ADD COLUMN IF NOT EXISTS category_id text REFERENCES service_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('draft', 'published', 'filled', 'paused')),
  ADD COLUMN IF NOT EXISTS filled_by_resource_id text REFERENCES resources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS filled_at timestamptz,
  ADD COLUMN IF NOT EXISTS fb_post_id text,
  ADD COLUMN IF NOT EXISTS fb_posted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS rental_positions_slug_uq ON rental_positions (slug);
CREATE INDEX IF NOT EXISTS rental_positions_status_idx ON rental_positions (status);
CREATE INDEX IF NOT EXISTS rental_positions_filled_by_idx ON rental_positions (filled_by_resource_id);

COMMIT;
