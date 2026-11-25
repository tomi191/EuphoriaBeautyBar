-- №8 (решения от 25.11.2026 «Брой места» и «Наемите в обявите»): две нови колони в rental_positions
-- и came_from в rental_inquiries (откъде е дошло запитването, планът за подсилването, раздел 5).
-- Само добавяне. Старите редове получават 1 място и празно уточнение, т.е. изглеждат както досега.
-- Пуска се веднъж, повторно не чупи нищо. Връщане: 0006_listing_seats.down.sql.
BEGIN;

ALTER TABLE rental_positions
  -- Колко места са свободни по тази обява (1 до 5). «Заето» затваря по едно; при последното обявата става заета.
  ADD COLUMN IF NOT EXISTS seats integer NOT NULL DEFAULT 1,
  -- Какво не е включено в наема (публично, под сумата, до 80 знака): «без ток, вода и общи консумативи».
  ADD COLUMN IF NOT EXISTS rent_excludes text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_positions_seats_range') THEN
    ALTER TABLE rental_positions ADD CONSTRAINT rental_positions_seats_range CHECK (seats BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_positions_rent_excludes_len') THEN
    ALTER TABLE rental_positions
      ADD CONSTRAINT rental_positions_rent_excludes_len CHECK (rent_excludes IS NULL OR char_length(rent_excludes) <= 80);
  END IF;
END $$;

-- Откъде е дошло запитването (метката от адреса на обявата: utm_*, from), без бисквитки. Празно за старите.
ALTER TABLE rental_inquiries ADD COLUMN IF NOT EXISTS came_from text;

COMMIT;
