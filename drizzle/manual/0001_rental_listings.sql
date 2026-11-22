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
  ADD COLUMN IF NOT EXISTS fb_posted_at timestamptz,
  -- Наемът (визия №18): сумата на месец и ключът «показвай в обявата», изключен по подразбиране.
  ADD COLUMN IF NOT EXISTS rent_text text,
  ADD COLUMN IF NOT EXISTS rent_public boolean NOT NULL DEFAULT false,
  -- Свои редове в «Какво получаваш» (№8 Б3б): текстът на Снежана, до 60 знака на ред.
  ADD COLUMN IF NOT EXISTS custom_benefits jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS rental_positions_slug_uq ON rental_positions (slug);
CREATE INDEX IF NOT EXISTS rental_positions_status_idx ON rental_positions (status);
CREATE INDEX IF NOT EXISTS rental_positions_filled_by_idx ON rental_positions (filled_by_resource_id);

-- Запитванията от обявата (№8 Б2г): лични данни на кандидата, трият се сами след 6 месеца
-- (дневната задача sync-reviews). Само за администратора; никога в публичните четения.
CREATE TABLE IF NOT EXISTS rental_inquiries (
  id text PRIMARY KEY,
  position_id text NOT NULL REFERENCES rental_positions(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  specialty text,
  message text,
  consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  handled_at timestamptz,
  -- Ключ от формата: двойно натискане дава един ред.
  client_token text NOT NULL,
  -- Отпечатък на адреса на мрежата (sha256 със сол), само за ограничението на честотата.
  ip_hash text,
  -- Какво е станало с известията (Telegram): грешката остава тук и в лога.
  notify_log jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS rental_inquiries_client_token_uq ON rental_inquiries (client_token);
CREATE INDEX IF NOT EXISTS rental_inquiries_position_idx ON rental_inquiries (position_id);
CREATE INDEX IF NOT EXISTS rental_inquiries_created_idx ON rental_inquiries (created_at);
CREATE INDEX IF NOT EXISTS rental_inquiries_phone_created_idx ON rental_inquiries (phone, created_at);
CREATE INDEX IF NOT EXISTS rental_inquiries_ip_created_idx ON rental_inquiries (ip_hash, created_at);

-- Като другите таблици (gotchas, 15.10.2026): без достъп през публичния ключ на Supabase.
ALTER TABLE rental_inquiries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON rental_inquiries FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON rental_inquiries FROM authenticated';
  END IF;
END $$;

COMMIT;
