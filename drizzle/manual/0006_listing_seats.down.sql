-- Връщане на 0006_listing_seats.sql. Губи се броят на местата и уточнението под наема
-- (обявите стават пак по едно място). Пуска се само след като кодът е върнат отпреди 0006:
-- новият код чете тези колони и без тях страниците с обяви падат.
BEGIN;

ALTER TABLE rental_positions
  DROP CONSTRAINT IF EXISTS rental_positions_rent_excludes_len,
  DROP CONSTRAINT IF EXISTS rental_positions_seats_range,
  DROP COLUMN IF EXISTS rent_excludes,
  DROP COLUMN IF EXISTS seats;

COMMIT;
