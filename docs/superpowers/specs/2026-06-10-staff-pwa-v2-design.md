# Staff PWA v2 — статуси, клиентско досие, оборот, native полиш

**Дата:** 10.06.2026 · **Статус:** одобрен дизайн · **Обхват:** само `/staff` PWA (без публичния сайт, без admin)

## Контекст

Staff PWA-то покрива календара (график, дъска, услуги, часове, профил), но не покрива три неща от реалното ежедневие на работника зад стола: маркиране на статус на час, клиентска памет (формули/предпочитания) и следене на оборота. Ползватели: наети работници (плащат наем за стол, собствена клиентела) + Снежана.

## Фаза 1 — операционна стойност

### 1.1 Статуси от работника
- **Actions** (`src/lib/actions/staff-bookings.ts`): `markMyArrived(id)`, `markMyCompleted(id)`, `markMyNoShow(id)` — `requireStaff()` + ownership (`resourceId`), update status + съответния timestamp, revalidate `/staff` + `/admin/bookings`.
- **UI** (`src/app/staff/page.tsx` + малък client компонент `booking-status-actions.tsx`): в timeline блока, според статуса: `confirmed` → [Дойде] [Не дойде]; `arrived` → [Приключих]. Компактни бутони (text-xs, rounded-full), optimistic + toast + router.refresh.
- Правило: бутоните се показват само за днешни/минали часове (за бъдещ час „Дойде" няма смисъл).

### 1.2 Клиентско досие
- **Таблица** `client_notes`: `id text PK, client_id text FK→clients ON DELETE CASCADE, resource_id text FK→resources ON DELETE CASCADE, note text NOT NULL, updated_at timestamptz, UNIQUE(client_id, resource_id)`. Бележката е ЧАСТНА per работник (наемателите не споделят клиентела).
- **Actions** (`src/lib/actions/staff-clients.ts`): `getMyClientFile(clientId)` → {client, visits (неговите bookings с този клиент, desc), note}; `saveMyClientNote(clientId, note)` (upsert).
- **UI — досие**: клик върху името на клиента в графика → bottom sheet `client-file-sheet.tsx`: име+телефон (+call/Viber), трайна бележка (Textarea + Запази), история на посещенията (дата, услуга, статус, бележка от часа). Lazy fetch при отваряне.
- **UI — списък** `/staff/clients` (`page.tsx` + търсене client-side): клиентите с ≥1 час при този resource, име+телефон+последно посещение, клик → досие sheet. Линк: от search зоната на графика („Виж всички клиенти") — НЕ нов таб.

### 1.3 Оборот
- **Колона** `bookings.price_eur real NULL` — snapshot при създаване на час: от `resolveOffering` (публичен) / `ownDuration`+цена (staff) / каталожна (admin). Старите часове: fallback изчисление по текущата цена на услугата (приблизително, отбелязано в UI).
- **Action** `getMyStats()` → {today, week, month}: брой completed часове + сума (price_eur ?? текуща цена на serviceItem).
- **UI**: секция „Оборот" най-горе в `/staff/profile` (3 карти: Днес / Седмица / Месец — сума + бр. часове) + малка иконка-линк от графика header-а. Бележка под картите: „По цените на услугите; ориентировъчно."

## Фаза 2 — experience

### 2.1 Вечерен push
- Cron `/api/cron/evening-digest` (vercel.json: `0 16 * * *` UTC ≈ 19:00 София): за всеки resource с часове утре → push „Утре: N часа, първият в HH:MM" (sendPushToResource). CRON_SECRET guard.

### 2.2 Offline
- `public/sw.js`: network-first за `/staff*` навигации с cache fallback (Cache API, само последния успешен HTML per URL) + кеширане на статичните икони. Offline индикатор в StaffShell (navigator.onLine + event listeners): лента „Офлайн — показвам последното заредено".

### 2.3 Native полиш
- Safe-area: `pb-[env(safe-area-inset-bottom)]` на bottom nav + `viewport-fit=cover` (staff layout viewport).
- Skeleton loaders: `loading.tsx` за /staff, /staff/board, /staff/services (брандови скелети, не празно).
- Тактилност: `active:scale-[0.98] transition-transform` на карти/бутоните в staff компонентите; `navigator.vibrate?.(10)` при статус действия и запазвания.
- Преходи: леки fade/slide на route change (CSS, без библиотека).

## Извън обхвата (нарочно)
Google Calendar sync; споделени бележки между работници; статистика за Снежана върху целия салон (тя има админа); плащания/каса.

## Рискове
- price_eur snapshot не покрива стари часове → статистиката за минали месеци е приблизителна (отбелязано в UI).
- Offline кешът е last-known-good, не пълна offline функционалност (записване офлайн няма).
- client_notes са лични: при изтриване на resource → CASCADE (бележките умират с работника — прието).

## Тестове
Playwright: статус бутони (confirmed→arrived→completed), досие sheet (отвори, запази бележка, презареди), /staff/clients търсене, оборот числата срещу seed данни. tsc + build зелени.
