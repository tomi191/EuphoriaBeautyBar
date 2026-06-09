# Онлайн записване на часове — спецификация

Статус: одобрен дизайн (2026-06-09). Стак: Next.js 16 + Supabase Postgres + Drizzle + better-auth + Resend. TZ: Europe/Sofia. Cron: Vercel (in-project).

## Заключени решения
1. Известия: **само имейл** (Resend).
2. Депозит/предплащане: **не**.
3. No-show grace: **15 мин** (настройваемо), + предупреждение към изпълнителя преди авто-отмяна.
4. Записване на ниво **service_item**; всеки с `durationMin` + `bufferMin`.
5. Гост-записване: телефон + имейл с **верификация**; клиентите се пазят в `clients` (за бъдещ онбординг/акаунти).
6. Всички услуги онлайн-записваеми; продължителностите са приблизителни, **редактируеми от admin**.
7. Отказ: **само по телефон, мин. 5 часа преди**. Без онлайн self-cancel. (Изравни /contacts политиката от 24ч → 5ч — да се потвърди.)
8. Снимки преди/след: **отложени** (Phase 4). Покана за отзив остава.
9. Работно време: **салонно** (едно за всички ресурси).

## Модел: resource-based booking
Паралелни ресурси (Снежана=коса + наети места). Часове на различни ресурси може да се застъпват; на същия ресурс — никога (DB EXCLUDE constraint).

## Data model (Drizzle/Postgres)
- `resources` — изпълнител/място: name, kind (hair/nails/cosmetics), userId (staff login, nullable), color, active.
- `working_hours` — салонно, по weekday (0=нед..6=съб): openTime, closeTime, closed.
- `time_off` — resourceId (null=салонно), startAt, endAt, reason (отпуск/празник/обед).
- `service_items` (+колони) — durationMin, bufferMin, bookableOnline.
- `clients` — name, email, phone, emailVerified, verifyToken.
- `bookings` — resourceId, serviceItemId, serviceName(снапшот), clientId, startAt, endAt(изчислен), status (pending/confirmed/arrived/in_progress/completed/no_show/cancelled), source (online/phone/walkin), consentLate, arrivedAt/completedAt/cancelledAt/cancelReason, reviewRequestedAt, createdBy.
- EXCLUDE constraint: `gist (resource_id =, tstzrange(start,end) &&) WHERE status NOT IN (cancelled,no_show)` → желязна гаранция срещу double-booking.

## Механики
- **Слотове:** работно време − time_off − заети(start..end+buffer); стъпка 15 мин; валиден слот ако се събира + ≥ сега+мин.предизвестие. `end = start + durationMin + bufferMin`.
- **No-show:** cron/5мин → confirmed + startAt+grace<now + няма arrivedAt → предупреждение, после no_show + освобождава слота.
- **Известия (cron):** потвърждение (вкл. email verify линк) / напомняне / покана за отзив / no-show — всички имейл.
- **Верификация:** confirmation имейлът съдържа линк, който потвърждава часа + верифицира имейла.

## Роли
better-auth: owner/admin (вижда всичко), staff (само свой ресурс/график, записва телефонни часове). Клиенти = гост (телефон+имейл), без акаунт засега.

## Фази
1. **MVP вътрешен:** schema + EXCLUDE + ресурси + работно време + durations + admin/staff ръчно записване + „моят график" + статуси + „дойде/завършен" + имейл потвърждение.
2. **Публично онлайн:** клиентски slot-flow (гост) + email verify + напомняне + late disclaimer/съгласие.
3. **Автоматики:** no-show cron + покана за отзив cron.
4. **По избор:** снимки преди/след, SMS/Viber, депозити, акаунти, презаписване.
