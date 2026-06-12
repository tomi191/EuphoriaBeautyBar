ALTER TABLE service_items ADD COLUMN IF NOT EXISTS active_min integer NOT NULL DEFAULT 0;
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS processing_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS active_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS processing_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS allow_parallel boolean NOT NULL DEFAULT false;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (allow_parallel = false);
