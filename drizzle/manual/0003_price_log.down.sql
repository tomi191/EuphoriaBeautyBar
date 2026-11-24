-- Връщане на 0003_price_log.sql. ВНИМАНИЕ: трие дневника на цените с цялата му история (по ЗЗП чл. 65, ал. 2
-- това е доказателството за «предишната цена» при намаление). Преди това извади копие:
--   \copy price_log TO 'price_log-<дата>.csv' CSV HEADER
-- и върни кода, който пише и чете дневника. Цените в resource_services и service_items не се пипат.
BEGIN;

DROP TRIGGER IF EXISTS resource_services_price_log ON resource_services;
DROP TRIGGER IF EXISTS service_items_price_log ON service_items;
DROP TABLE IF EXISTS price_log; -- маха и тригерите price_log_no_change и price_log_no_truncate
DROP FUNCTION IF EXISTS price_log_capture();
DROP FUNCTION IF EXISTS price_log_append_only();

COMMIT;
