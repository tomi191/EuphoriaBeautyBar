-- Връщане на 0005_goal_counters.sql. Първо махни ролята: node scripts/goal-reader-role.mjs drop …
-- ВНИМАНИЕ: трие натисканията на «Обади се» и Viber. Ако трябват, извади копие:
--   \copy call_clicks TO 'call_clicks-<дата>.csv' CSV HEADER
BEGIN;

DROP VIEW IF EXISTS goal_stats.call_clicks_daily;
DROP VIEW IF EXISTS goal_stats.bookings_weekly;
DROP SCHEMA IF EXISTS goal_stats;
DROP TABLE IF EXISTS call_clicks;

COMMIT;
