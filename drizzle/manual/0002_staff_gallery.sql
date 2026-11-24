-- №8 В1а: снимки от приложението за екипа (специалистът качва, Снежана одобрява).
-- Само добавяне на нови колони и индекси в gallery_images: старите колони и редове не се пипат.
-- Старите редове получават status = 'approved' (стойността по подразбиране) и празни нови колони:
-- те са снимки на салона и остават на сайта както досега. Пуска се веднъж, повторно не чупи нищо.
-- Връщане: 0002_staff_gallery.down.sql.
BEGIN;

ALTER TABLE gallery_images
  -- Кой специалист я е качил (null = качена от администрацията или стара снимка).
  ADD COLUMN IF NOT EXISTS uploaded_by text REFERENCES resources(id) ON DELETE SET NULL,
  -- pending = чака одобрение (не е публична); approved = на сайта; rejected = върната или махната от сайта.
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Причината от Снежана, която специалистът вижда до върнатата снимка (до 80 знака).
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  -- Кога специалистът е потвърдил «На снимката не се вижда лице».
  ADD COLUMN IF NOT EXISTS no_face_confirmed_at timestamptz,
  -- Думите на специалиста за описанието (до 60 знака); описанието (alt) се сглобява от тях при одобрението.
  ADD COLUMN IF NOT EXISTS staff_note text,
  ADD COLUMN IF NOT EXISTS service_item_id text REFERENCES service_items(id) ON DELETE SET NULL,
  -- От кой час е снимката (по желание).
  ADD COLUMN IF NOT EXISTS booking_id text REFERENCES bookings(id) ON DELETE SET NULL,
  -- Пътят до оригинала без знак в частното хранилище gallery-originals (не се отваря по адрес без вход).
  ADD COLUMN IF NOT EXISTS original_path text,
  ADD COLUMN IF NOT EXISTS approved_by text REFERENCES "user"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  -- Кога е качена (празно при старите редове).
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

CREATE INDEX IF NOT EXISTS gallery_images_status_idx ON gallery_images (status);
CREATE INDEX IF NOT EXISTS gallery_images_uploaded_by_created_idx ON gallery_images (uploaded_by, created_at);

COMMIT;
