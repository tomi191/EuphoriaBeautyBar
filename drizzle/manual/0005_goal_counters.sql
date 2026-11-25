-- Решение 7 (24.11.2026): мерилата за целите П1 (записани часове по източник) и П3 (обаждания).
-- Само добавяне: нова таблица call_clicks, нова схема goal_stats с два изгледа само с бройки.
-- Старите таблици и редове не се пипат. Пуска се веднъж, повторно не чупи нищо.
-- Ролята само за четене (goal_reader) я прави scripts/goal-reader-role.mjs: паролата не стои във файл.
-- Връщане: 0005_goal_counters.down.sql.
BEGIN;

-- П3: брой натискания на «Обади се» (tel:) и Viber. Без бисквитки, без IP, без идентификатор на човека:
-- само ден (Europe/Sofia), страница, вид на връзката, място на копчето и брой.
CREATE TABLE IF NOT EXISTS call_clicks (
  day date NOT NULL,
  page text NOT NULL CHECK (char_length(page) BETWEEN 1 AND 120),
  -- tel и viber = номерът на салона; *-other = друг номер на сайта (например на специалист в промоция).
  kind text NOT NULL CHECK (kind IN ('tel', 'viber', 'tel-other', 'viber-other')),
  -- header, footer, call-bar, menu, bot, dialog, page
  spot text NOT NULL CHECK (spot ~ '^[a-z-]{1,20}$'),
  count integer NOT NULL DEFAULT 1 CHECK (count > 0),
  PRIMARY KEY (day, page, kind, spot)
);

ALTER TABLE call_clicks ENABLE ROW LEVEL SECURITY;

-- Изгледите за Капела: само бройки, без клиентски полета. Вървят с правата на собственика им
-- (security_invoker = false), затова ролята за четене вижда бройките, а не таблиците отдолу.
CREATE SCHEMA IF NOT EXISTS goal_stats;
REVOKE ALL ON SCHEMA goal_stats FROM PUBLIC;

-- П1: записани часове по седмица на записа (понеделник, Europe/Sofia) и по път.
-- site = от сайта (без вход); app = от приложението на екипа; phone = администрацията, записан като
-- обаждане; admin = администрацията, друг път; other = стари редове без автор. Пробите с адрес
-- @example.com не се броят.
CREATE OR REPLACE VIEW goal_stats.bookings_weekly WITH (security_invoker = false) AS
SELECT
  (date_trunc('week', b.created_at AT TIME ZONE 'Europe/Sofia'))::date AS week_start,
  CASE
    WHEN b.created_by IS NULL AND b.source = 'online' THEN 'site'
    WHEN u.role = 'staff' THEN 'app'
    WHEN u.id IS NOT NULL AND b.source = 'phone' THEN 'phone'
    WHEN u.id IS NOT NULL THEN 'admin'
    ELSE 'other'
  END AS channel,
  count(*)::int AS booked,
  (count(*) FILTER (WHERE b.status = 'cancelled'))::int AS cancelled
FROM public.bookings b
LEFT JOIN public."user" u ON u.id = b.created_by
LEFT JOIN public.clients c ON c.id = b.client_id
WHERE c.email IS NULL OR c.email NOT ILIKE '%@example.com'
GROUP BY 1, 2;

-- П3: натисканията по ден, страница и копче.
CREATE OR REPLACE VIEW goal_stats.call_clicks_daily WITH (security_invoker = false) AS
SELECT day, page, kind, spot, count FROM public.call_clicks;

REVOKE ALL ON goal_stats.bookings_weekly, goal_stats.call_clicks_daily FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON call_clicks, goal_stats.bookings_weekly, goal_stats.call_clicks_daily FROM anon';
    EXECUTE 'REVOKE ALL ON SCHEMA goal_stats FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON call_clicks, goal_stats.bookings_weekly, goal_stats.call_clicks_daily FROM authenticated';
    EXECUTE 'REVOKE ALL ON SCHEMA goal_stats FROM authenticated';
  END IF;
END $$;

COMMIT;
