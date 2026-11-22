-- Връщане на 0002_staff_gallery.sql. ВНИМАНИЕ: трие новите колони с данните им (кой е качил, състояние,
-- причина, «без лице», думите на специалиста, услугата, часа, пътя до оригинала, кой и кога е одобрил).
-- Старите колони и редове остават. Преди това върни кода, който чете новите колони.
-- Трие и редовете, които не са одобрени (чакащи и върнати): без колоната status старият код би ги
-- показал на сайта. Файловете в частното хранилище gallery-originals не се трият оттук.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'gallery_images' AND column_name = 'status') THEN
    DELETE FROM gallery_images WHERE status <> 'approved';
  END IF;
END $$;

DROP INDEX IF EXISTS gallery_images_uploaded_by_created_idx;
DROP INDEX IF EXISTS gallery_images_status_idx;

ALTER TABLE gallery_images
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS original_path,
  DROP COLUMN IF EXISTS booking_id,
  DROP COLUMN IF EXISTS service_item_id,
  DROP COLUMN IF EXISTS staff_note,
  DROP COLUMN IF EXISTS no_face_confirmed_at,
  DROP COLUMN IF EXISTS rejected_at,
  DROP COLUMN IF EXISTS reject_reason,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS uploaded_by;

COMMIT;
