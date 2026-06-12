# Паралелен час в престой — дизайн

**Дата:** 2026-06-12
**Статус:** одобрен дизайн, чака implementation plan
**Контекст:** Feature B от разбивката на графика (A=блокиране — съществува; C=редакция — готово).
Цел: докато боята/процедурата на един клиент „стои" (престой, ръцете на майстора са свободни),
системата автоматично да позволи втори кратък час (подстригване/сешоар) в този прозорец —
включително онлайн, без ръчно одобрение. Сега `bookings_no_overlap` exclusion constraint забранява
всяко застъпване.

---

## 1. Цел и обхват

- Услугите носят данни за **престой** (активни + престой минути), които Снежана въвежда в admin.
- Системата смята свободния прозорец на всеки „процедурен" час и **автоматично** го предлага за
  кратки услуги, които се събират вътре — онлайн И в staff.
- Майсторът коригира прозореца per час (дълга/къса коса).
- DB защитата срещу СЛУЧАЙНИ двойни записи остава за нормалните часове.

Не-цели (YAGNI): множество вложени паралели (>1 на час) в MVP — позволяваме 1 паралел на прозорец;
автоматично пренареждане при преминал престой; phase-modeling отвъд един прозорец (без отделен
„финал" модел — приема се, че след престоя следва активен финал до края на блока).

---

## 2. Модел на времето

Услуга има (вече) `durationMin` + `bufferMin`. Добавяме:
- **`activeMin`** (int, default 0): хендс-он минути в НАЧАЛОТО, преди престоя.
- **`processingMin`** (int, default 0): минути престой (свободен прозорец). 0 = няма паралел.

Свободен прозорец на час, започнал в `start`: **`[start + activeMin, start + activeMin + processingMin]`**.
Преди и след прозореца майсторът е зает. Валидно изискване: `activeMin + processingMin <= durationMin`.

Часовете снапшотват тези стойности при създаване (за да може майсторът да ги коригира per клиент,
без да мени услугата). `bookings` += `activeMin`, `processingMin`.

**Предпазен буфер:** прозорецът, предлаган за паралел, се свива с `PARALLEL_SAFETY_MIN` (5 мин) от
двата края — паралелната услуга не опира директно до активните фази (риск при по-дълга коса).
Реален свободен прозорец = `[start+activeMin+5, start+activeMin+processingMin-5]`.

---

## 3. База данни (миграция — user-run)

`bookings` += `allow_parallel` (boolean, default false). Часът, поставен В прозореца на друг
(паралелната кратка услуга), е `allow_parallel=true`; домакинът (боята) си остава нормален
(`allow_parallel=false`).

**Промяна на constraint-а → partial** (за да пропуска флагнатите):
```sql
ALTER TABLE bookings ADD COLUMN allow_parallel boolean NOT NULL DEFAULT false;
ALTER TABLE service_items ADD COLUMN active_min integer NOT NULL DEFAULT 0;
ALTER TABLE service_items ADD COLUMN processing_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN active_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN processing_min integer NOT NULL DEFAULT 0;

ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (allow_parallel = false);
```
Ефект: нормален↔нормален → пак не се застъпват; паралелен (флагнат) → изключен от constraint-а.
Колоните се добавят и в `schema.ts` (Drizzle) за типове. Constraint-промяната е ръчен SQL (drizzle
push не я прави) → потребителят я пуска (както при предишни DDL през Supabase). **Агентът е блокиран
от prod DDL.**

---

## 4. Логика — свободни прозорци за паралел

Нов хелпер `lib/booking/parallel.ts`:
- `parallelWindows(resourceId, dateStr)` → за деня връща списък `[{ hostBookingId, start, end }]` —
  по един прозорец за всеки час, чиято снапшот-`processingMin > 0`, свит с предпазния буфер, минус
  вече заетото от друг паралел в същия прозорец.
- `fitsParallelWindow(resourceId, start, end)` → true ако `[start,end)` се събира ИЗЦЯЛО в някой
  свободен паралел прозорец (за валидация при запис).

`slots.ts` (`getAvailableSlots`) се разширява с опционален режим: освен нормалните свободни слотове,
ако услугата е достатъчно кратка, добавя и слотове в паралелните прозорци, маркирани `parallel:true`.
Нормалните busy-проверки НЕ броят паралелните прозорци като свободни за нормални услуги.

---

## 5. Запис

И трите канала (createPublicBooking, createMyBooking, admin createBooking) приемат опц.
`allowParallel` сигнал (от избрания слот). Когато слотът е паралелен:
- сетва `allow_parallel=true` на новия час;
- ВАЛИДИРА `fitsParallelWindow(...)` сървърно (не вярва на клиента);
- DB constraint-ът не пречи (флагнат).
Когато слотът е нормален → текущото поведение (23P01 пази).

Часовете на процедурни услуги снапшотват `activeMin`/`processingMin` от услугата при създаване.

---

## 6. UI

**Admin — форма за услуга** (`service-item-form`): += „Активни минути" + „Минути престой"
(с пояснение „за паралелни часове по време на престой; 0 = няма престой"). Снежана ги задава.

**Онлайн форма** (`/zapazi-chas`): слот-гридът показва и паралелните слотове, отбелязани дискретно
(напр. „· паралел" / различен нюанс) — клиентът просто избира свободен час; системата ги пуска
автоматично, без одобрение.

**Staff график** (`/staff`): прозорецът на престой се показва като блок „свободно (престой) —
паралелен час" (различен от обикновените „свободно" прозорци), tappable към запис. Паралелните
часове в графика се маркират „паралелен".

**Редакция на престоя per час:** в booking-edit формата (Feature C) += полета „активни / престой
минути" за процедурни часове — майсторът коригира за дълга/къса коса; прозорецът се преизчислява.

---

## 7. Рискове / предпазни мерки

- **Преминал престой (дълга коса, default подценен):** авто-записан паралел може да се удари.
  Мерки: предпазен буфер 5 мин; реалистични default-и (Снежана ги задава); майсторът вижда всичко
  в графика и може да премести; (MVP) макс 1 паралел на прозорец.
- **Злоупотреба от клиент:** паралел се валидира сървърно да се събира в реален прозорец — не може
  произволно застъпване през формата.
- **Partial constraint = по-малко DB защита за флагнатите:** компенсира се с `fitsParallelWindow`
  валидацията във ВСЕКИ канал на запис.
- **Миграция:** constraint DROP+ADD е чувствителна — пуска се от потребителя с точния SQL (§3),
  извън пиков час; кратко прозорче без защита между DROP и ADD (приемливо).

---

## 8. Файлове

| Файл | Действие |
|------|----------|
| `src/lib/db/schema.ts` | + колони (service_items activeMin/processingMin; bookings activeMin/processingMin/allowParallel) |
| `src/lib/booking/parallel.ts` | НОВ — parallelWindows + fitsParallelWindow + PARALLEL_SAFETY_MIN |
| `src/lib/booking/slots.ts` | разширен — паралелни слотове в getAvailableSlots |
| `src/lib/actions/{public-booking,staff-bookings,bookings}.ts` | приемат/валидират allowParallel + снапшот active/processing |
| `src/components/admin/service-item-form.tsx` | + активни/престой полета |
| `src/components/forms/public-booking-form.tsx` | паралелни слотове маркирани |
| `src/app/staff/page.tsx` | престой прозорец като паралел-блок |
| `src/components/staff/booking-edit-sheet.tsx` + admin dialog | + active/processing полета за процедурни часове |

---

## 9. Верификация (definition of done)

- `next build` зелен.
- След миграция + service с processingMin>0: онлайн форма показва паралелен слот в престоя;
  запис минава с allow_parallel=true; нормален застъпващ запис пак се блокира (23P01).
- `fitsParallelWindow` отхвърля паралел извън прозореца (сървърна валидация).
- Staff график показва престой-прозореца и маркира паралелните часове.
- Жива проверка изисква миграцията (user-run) — дотогава build + unit-style проверка на parallel.ts
  логиката (ръчно през tsx скрипт ако трябва).

⚠️ Активиране: потребителят пуска SQL миграцията (§3) + въвежда активни/престой минути на
процедурните услуги през admin.
