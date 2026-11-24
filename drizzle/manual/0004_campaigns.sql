-- №11, част 1: промоциите на специалистите (решения 23, 24, 31). Само добавяне: две нови таблици и три нови
-- празни колони в bookings; старите редове не се пипат. Повторното пускане не чупи нищо.
-- Статусът пази само решението (чака / върната / одобрена / спряна). «Предстои», «тече», «свършила» и «изтекла»
-- се смятат по датите при четене (src/lib/campaigns/rules.ts, campaignPhase), без крон.
-- Записите се пазят като доказателство (ЗЗП чл. 68л, ал. 2): нищо в кода не трие промоция.
-- Връщане: 0004_campaigns.down.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS campaigns (
  id text PRIMARY KEY,
  -- Чия е промоцията. RESTRICT: специалист с промоции не се трие (те са доказателство), само се приключва.
  resource_id text NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
  -- discount = намалена цена; gift = подарък в същия час.
  kind text NOT NULL CHECK (kind IN ('discount', 'gift')),
  -- Подаръкът с думи, до 40 знака (само при gift).
  gift text,
  -- «Защо»: истинската причина, до 60 знака, по желание.
  reason text,
  -- Дните (Europe/Sofia), включително двата края; от 1 до 30 дни.
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  -- Колко часа най-много по промоцията; null = без лимит.
  slots integer CHECK (slots IS NULL OR slots >= 1),
  first_visit_only boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'returned', 'approved', 'stopped')),
  submitted_at timestamptz,
  -- Връщане от Снежана: price | text | dates | other и нейният ред.
  return_reason text CHECK (return_reason IS NULL OR return_reason IN ('price', 'text', 'dates', 'other')),
  return_note text,
  returned_at timestamptz,
  -- Одобрение: user.id или 'telegram' (бутонът в админ канала); при Снежана 'self'.
  approved_by text,
  approved_at timestamptz,
  -- Спиране с причина: wrong_price | wrong_text | cannot_take | other (+ ред) или system_* от системата.
  stop_reason text,
  stop_note text,
  stopped_at timestamptz,
  stopped_by text,
  -- Постът във Facebook (част 4).
  facebook_post_id text,
  facebook_posted_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on AND ends_on - starts_on <= 29)
);

CREATE INDEX IF NOT EXISTS campaigns_resource_idx ON campaigns (resource_id, status, ends_on);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns (status, starts_on, ends_on);

-- Услугите в промоцията (от 1 до 5) и цените им.
CREATE TABLE IF NOT EXISTS campaign_services (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  service_item_id text NOT NULL REFERENCES service_items(id) ON DELETE RESTRICT,
  -- Предишната цена (€): най-ниската за 30 дни от дневника на цените (price_log); смята се при изпращане
  -- и наново при одобрението. Специалистът не я пише.
  prev_price_eur real,
  -- Новата цена (€) при намаление; null при подарък.
  new_price_eur real,
  -- Цената в момента на изпращане (€) и «от» при подарък: за картата.
  regular_price_eur real,
  price_from boolean NOT NULL DEFAULT false,
  prev_price_at timestamptz,
  UNIQUE (campaign_id, service_item_id)
);

CREATE INDEX IF NOT EXISTS campaign_services_service_idx ON campaign_services (service_item_id);

-- Часът пази промоцията, редовната цена в този момент и откъде е дошъл клиентът (пише ги част 3).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS regular_price_eur real,
  ADD COLUMN IF NOT EXISTS came_from text;

CREATE INDEX IF NOT EXISTS bookings_campaign_idx ON bookings (campaign_id) WHERE campaign_id IS NOT NULL;

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_services ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON campaigns, campaign_services FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON campaigns, campaign_services FROM authenticated';
  END IF;
END $$;

COMMIT;
