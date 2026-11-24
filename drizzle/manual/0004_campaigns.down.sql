-- Връщане на 0004_campaigns.sql. ВНИМАНИЕ: трие промоциите с цялата им история (доказателството по
-- ЗЗП чл. 68л, ал. 2). Преди това извади копие:
--   \copy campaigns TO 'campaigns-<дата>.csv' CSV HEADER
--   \copy campaign_services TO 'campaign_services-<дата>.csv' CSV HEADER
-- и върни кода, който ги пише и чете. Часовете остават; махат се само трите нови колони в bookings.
BEGIN;

DROP INDEX IF EXISTS bookings_campaign_idx;
ALTER TABLE bookings
  DROP COLUMN IF EXISTS campaign_id,
  DROP COLUMN IF EXISTS regular_price_eur,
  DROP COLUMN IF EXISTS came_from;

DROP TABLE IF EXISTS campaign_carousels;
DROP TABLE IF EXISTS campaign_services;
DROP TABLE IF EXISTS campaigns;

COMMIT;
