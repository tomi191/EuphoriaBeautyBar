-- №11 (решение 25): дневник на цените. Само добавяне: нова таблица, функция и тригери; старите таблици и
-- редове не се пипат. Всяка смяна на цена в resource_services (цената при специалист) и service_items (каталогът)
-- се записва сама от тригер, по който и път да дойде: приложението, администрацията, скрипт или ръчна заявка.
-- Кой и откъде: кодът ги подава с set_config('app.price_source' / 'app.price_actor', …, true) в същата транзакция;
-- без тях редът е с source = 'direct' (скрипт без име или ръчна заявка) и changed_by = ролята в базата.
-- При първото пускане всяка сегашна цена влиза с event = 'start': оттам историята е пълна.
-- Дневникът не се сменя и не се трие (тригерът спира UPDATE, DELETE и TRUNCATE).
-- Повторното пускане не чупи нищо и не дублира началните редове. Връщане: 0003_price_log.down.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS price_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Коя цена: при специалист (resource_services) или в каталога (service_items).
  table_name text NOT NULL CHECK (table_name IN ('resource_services', 'service_items')),
  row_id text NOT NULL,
  service_item_id text NOT NULL,
  -- null = каталожна цена. Без връзки към другите таблици: редът остава и след триене на услугата.
  resource_id text,
  -- start = цената при пускането на дневника; insert = нова цена; update = сменена цена.
  event text NOT NULL CHECK (event IN ('start', 'insert', 'update')),
  old_price real,
  new_price real NOT NULL,
  old_price_max real,
  new_price_max real,
  old_price_from boolean,
  new_price_from boolean NOT NULL,
  old_currency text,
  new_currency text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  -- Кой: id на потребителя (приложението, администрацията) или името на скрипта.
  changed_by text,
  -- Откъде: staff_app = «Услуги» в /staff; admin = /admin/services; script = скрипт с име;
  -- direct = скрипт без име или ръчна заявка; migration = началните редове.
  source text NOT NULL CHECK (source IN ('staff_app', 'admin', 'script', 'direct', 'migration'))
);

CREATE INDEX IF NOT EXISTS price_log_row_idx ON price_log (table_name, row_id, changed_at);
CREATE INDEX IF NOT EXISTS price_log_offer_idx ON price_log (service_item_id, resource_id, changed_at);

CREATE OR REPLACE FUNCTION price_log_capture() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  src text := coalesce(nullif(current_setting('app.price_source', true), ''), 'direct');
  who text := coalesce(nullif(current_setting('app.price_actor', true), ''), 'db:' || session_user);
  res text;
  svc text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.price IS NOT DISTINCT FROM OLD.price
     AND NEW.price_max IS NOT DISTINCT FROM OLD.price_max
     AND NEW.price_from IS NOT DISTINCT FROM OLD.price_from
     AND NEW.currency IS NOT DISTINCT FROM OLD.currency THEN
    RETURN NEW; -- сменено е друго (видимост, време), не цената
  END IF;
  IF TG_TABLE_NAME = 'resource_services' THEN
    res := NEW.resource_id;
    svc := NEW.service_item_id;
  ELSE
    res := NULL;
    svc := NEW.id;
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO price_log (table_name, row_id, service_item_id, resource_id, event,
      new_price, new_price_max, new_price_from, new_currency, changed_by, source)
    VALUES (TG_TABLE_NAME, NEW.id, svc, res, 'insert',
      NEW.price, NEW.price_max, NEW.price_from, NEW.currency, who, src);
  ELSE
    INSERT INTO price_log (table_name, row_id, service_item_id, resource_id, event,
      old_price, new_price, old_price_max, new_price_max, old_price_from, new_price_from,
      old_currency, new_currency, changed_by, source)
    VALUES (TG_TABLE_NAME, NEW.id, svc, res, 'update',
      OLD.price, NEW.price, OLD.price_max, NEW.price_max, OLD.price_from, NEW.price_from,
      OLD.currency, NEW.currency, who, src);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION price_log_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'price_log: дневникът на цените само се допълва (% е спряно)', TG_OP;
END $$;

DROP TRIGGER IF EXISTS resource_services_price_log ON resource_services;
CREATE TRIGGER resource_services_price_log
  AFTER INSERT OR UPDATE ON resource_services
  FOR EACH ROW EXECUTE FUNCTION price_log_capture();

DROP TRIGGER IF EXISTS service_items_price_log ON service_items;
CREATE TRIGGER service_items_price_log
  AFTER INSERT OR UPDATE ON service_items
  FOR EACH ROW EXECUTE FUNCTION price_log_capture();

DROP TRIGGER IF EXISTS price_log_no_change ON price_log;
CREATE TRIGGER price_log_no_change
  BEFORE UPDATE OR DELETE ON price_log
  FOR EACH ROW EXECUTE FUNCTION price_log_append_only();

DROP TRIGGER IF EXISTS price_log_no_truncate ON price_log;
CREATE TRIGGER price_log_no_truncate
  BEFORE TRUNCATE ON price_log
  FOR EACH STATEMENT EXECUTE FUNCTION price_log_append_only();

-- Началото: сегашната цена на всеки ред, по веднъж.
INSERT INTO price_log (table_name, row_id, service_item_id, resource_id, event,
  new_price, new_price_max, new_price_from, new_currency, changed_by, source)
SELECT 'resource_services', rs.id, rs.service_item_id, rs.resource_id, 'start',
  rs.price, rs.price_max, rs.price_from, rs.currency, '0003_price_log', 'migration'
FROM resource_services rs
WHERE NOT EXISTS (SELECT 1 FROM price_log p
                  WHERE p.table_name = 'resource_services' AND p.row_id = rs.id AND p.event = 'start');

INSERT INTO price_log (table_name, row_id, service_item_id, resource_id, event,
  new_price, new_price_max, new_price_from, new_currency, changed_by, source)
SELECT 'service_items', si.id, si.id, NULL, 'start',
  si.price, si.price_max, si.price_from, si.currency, '0003_price_log', 'migration'
FROM service_items si
WHERE NOT EXISTS (SELECT 1 FROM price_log p
                  WHERE p.table_name = 'service_items' AND p.row_id = si.id AND p.event = 'start');

ALTER TABLE price_log ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON price_log FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON price_log FROM authenticated';
  END IF;
END $$;

COMMIT;
