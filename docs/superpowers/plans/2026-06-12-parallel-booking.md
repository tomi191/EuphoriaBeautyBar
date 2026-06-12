# Паралелен час в престой (Feature B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** По време на престоя на процедурен час (боя/кератин) системата автоматично да предлага и записва втори кратък час в свободния прозорец — онлайн и staff.

**Architecture:** Услугите носят `activeMin`/`processingMin` (admin), часовете ги снапшотват (редактируеми). Нов `lib/booking/parallel.ts` смята свободните прозорци; `slots.ts` ги предлага като нов статус `parallel`. Часът в прозореца се записва `allowParallel=true` и DB partial constraint (`WHERE NOT allow_parallel`) го пропуска; всеки канал валидира `fitsParallelWindow` сървърно. Миграцията (колони + constraint DROP/ADD) е user-run.

**Tech Stack:** Next.js 16, Drizzle/Postgres/Supabase, React 19, zod. Без тест-харнес — верификация = `npm run build` + логика-проверка на parallel.ts през tsx + (жива след user-run миграция).

**Spec:** `docs/superpowers/specs/2026-06-12-parallel-booking-design.md`

---

## Task 1: Schema колони + миграция (user-run)

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `docs/parallel-booking-migration.sql` (за потребителя)

- [ ] **Step 1: Добави колоните в schema.ts**

В `serviceItems` (`pgTable("service_items", {...})`) добави:
```ts
  activeMin: integer("active_min").notNull().default(0),
  processingMin: integer("processing_min").notNull().default(0),
```
В `bookings` (`pgTable("bookings", {...})`) добави:
```ts
  activeMin: integer("active_min").notNull().default(0),
  processingMin: integer("processing_min").notNull().default(0),
  allowParallel: boolean("allow_parallel").notNull().default(false),
```
(`integer`, `boolean` вече се импортват в schema.ts.)

- [ ] **Step 2: Запиши миграцията за потребителя**

`docs/parallel-booking-migration.sql`:
```sql
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS active_min integer NOT NULL DEFAULT 0;
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS processing_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS active_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS processing_min integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS allow_parallel boolean NOT NULL DEFAULT false;

-- Частичен no-overlap: паралелните (flagged) часове се изключват от проверката.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (allow_parallel = false);
```
Бележка в plan-а: агентът е блокиран от prod DDL → потребителят пуска този SQL (Supabase SQL editor / Management API), извън пиков час.

- [ ] **Step 3: Build (типове)**

Run: `npm run build`
Expected: ✓ зелено (build не изисква колоните да съществуват в БД).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts docs/parallel-booking-migration.sql
git commit -m "Parallel booking: schema columns + migration SQL (user-run)"
```

---

## Task 2: `parallel.ts` — прозорци + валидация

**Files:**
- Create: `src/lib/booking/parallel.ts`
- Create: `scripts/check-parallel-logic.ts` (логика-проверка без БД)

- [ ] **Step 1: Напиши parallel.ts**

```ts
import { db } from "@/lib/db";

/** Предпазен буфер от двата края на престой прозореца (мин). */
export const PARALLEL_SAFETY_MIN = 5;

export interface ParallelWindow {
  hostBookingId: string;
  start: number; // ms (UTC) — реален свободен прозорец (вече свит с буфера)
  end: number;   // ms
}

/** Чист изчислителен помощник (тестваем без БД): свободният прозорец на час. */
export function windowFor(startMs: number, activeMin: number, processingMin: number): { start: number; end: number } | null {
  if (processingMin <= 2 * PARALLEL_SAFETY_MIN) return null;
  const winStart = startMs + (activeMin + PARALLEL_SAFETY_MIN) * 60000;
  const winEnd = startMs + (activeMin + processingMin - PARALLEL_SAFETY_MIN) * 60000;
  return winEnd > winStart ? { start: winStart, end: winEnd } : null;
}

/** Прозорците на престой за деня — по един на процедурен час, минус заетите от паралел. */
export async function parallelWindows(resourceId: string, dayStart: Date, dayEnd: Date): Promise<ParallelWindow[]> {
  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(eq(b.resourceId, resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
  });
  const hosts = rows.filter((b) => !b.allowParallel && b.processingMin > 0);
  const parallels = rows.filter((b) => b.allowParallel);

  const out: ParallelWindow[] = [];
  for (const h of hosts) {
    const w = windowFor(h.startAt.getTime(), h.activeMin, h.processingMin);
    if (!w) continue;
    // MVP: 1 паралел на прозорец — ако вече има паралел вътре, прозорецът е зает.
    const taken = parallels.some((p) => p.startAt.getTime() < w.end && p.endAt.getTime() > w.start);
    if (!taken) out.push({ hostBookingId: h.id, start: w.start, end: w.end });
  }
  return out;
}

/** Събира ли се [start,end) ИЗЦЯЛО в някой свободен паралел прозорец на изпълнителя. */
export async function fitsParallelWindow(resourceId: string, start: Date, end: Date): Promise<boolean> {
  const dayStart = new Date(start); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const wins = await parallelWindows(resourceId, dayStart, dayEnd);
  const s = start.getTime(), e = end.getTime();
  return wins.some((w) => s >= w.start && e <= w.end);
}
```

- [ ] **Step 2: Логика-проверка (без БД)**

`scripts/check-parallel-logic.ts` импортира `windowFor` и проверява: боя start=10:00 active=15 processing=30 → прозорец 10:20–10:40 (15+5 .. 15+30-5); processing=8 (≤10) → null; подстригване processing=0 → null. Печата PASS/FAIL.

Run: `npx tsx scripts/check-parallel-logic.ts`
Expected: всички PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking/parallel.ts scripts/check-parallel-logic.ts
git commit -m "Parallel booking: windows + fitsParallelWindow + safety buffer"
```

---

## Task 3: `slots.ts` — паралелни слотове

**Files:**
- Modify: `src/lib/booking/slots.ts`

- [ ] **Step 1: Разшири SlotStatus + getDaySlots**

Добави `"parallel"` към `SlotStatus`. В `getDaySlots` добави опц. параметър `parallelFor?: boolean`. Когато true: след основното изчисление, за всеки слот със статус `busy`, ако цялото `[t, end)` се събира в някой `parallelWindows(...)` прозорец (изчисли ги веднъж за деня) И не се застъпва с нормален час ИЗВЪН неговия host, маркирай статуса като `parallel` вместо `busy`. (Импортирай `parallelWindows` от `./parallel`; `import` без circular — parallel.ts не импортва slots.ts.) Простото правило за MVP: слотът е `parallel`, ако `[t,end)` ⊆ някой прозорец (прозорците вече изключват заетите). Запази `free`/`past` логиката.

- [ ] **Step 2: getAvailableSlots аналогично (за валидация на онлайн фит — по избор)**

Не е задължително за UI; `getDaySlots` захранва формите. Остави `getAvailableSlots` както е, освен ако се ползва някъде за паралел.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/slots.ts
git commit -m "Parallel booking: parallel slots in getDaySlots"
```

---

## Task 4: Create канали — приемат + валидират allowParallel

**Files:**
- Modify: `src/lib/actions/public-booking.ts`
- Modify: `src/lib/actions/staff-bookings.ts`
- Modify: `src/lib/actions/bookings.ts`

- [ ] **Step 1: Снапшот active/processing + allowParallel при създаване**

Във всеки от трите create action-а: когато услугата има `activeMin`/`processingMin` → запиши ги на новия booking (снапшот). Приеми опц. `allowParallel?: boolean` в схемата. Когато `allowParallel === true`:
- сървърно валидирай `await fitsParallelWindow(resourceId, start, end)`; ако false → `{ ok:false, error:"Този паралелен час не се събира в свободния престой." }`;
- сетвай `allowParallel: true` на insert-а; пропусни `hasTimeOffConflict`/normal-overlap пътя (constraint-ът няма да гръмне за флагнат).
Когато `allowParallel` не е зададен → текущото поведение (23P01 пази).
Импортирай `fitsParallelWindow` от `@/lib/booking/parallel`. За снапшота прочети service_items.activeMin/processingMin (или 0 при multi/без serviceItemId).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/public-booking.ts src/lib/actions/staff-bookings.ts src/lib/actions/bookings.ts
git commit -m "Parallel booking: create channels accept+validate allowParallel + snapshot"
```

---

## Task 5: Admin форма за услуга — активни/престой минути

**Files:**
- Modify: `src/components/admin/service-item-form.tsx`
- Modify: `src/lib/actions/service-items.ts`

- [ ] **Step 1: Полета в формата**

Добави два `Input type=number` „Активни минути" + „Минути престой" (с htmlFor/id, a11y) + пояснение „за паралелни часове по време на престой; 0 = няма престой". Подай ги към update/create action-а. Прочети съществуващия `service-item-form` за pattern (цена/продължителност полета).

- [ ] **Step 2: Action приема полетата**

В `service-items.ts` разшири схемата/insert/update с `activeMin`/`processingMin` (z.coerce.number().int().min(0)). Запази `revalidateCatalog()`.

- [ ] **Step 3: Build + Commit**

Run: `npm run build` → ✓
```bash
git add src/components/admin/service-item-form.tsx src/lib/actions/service-items.ts
git commit -m "Parallel booking: admin service form active/processing minutes"
```

---

## Task 6: UI — онлайн слотове + staff прозорец + edit полета

**Files:**
- Modify: `src/components/forms/public-booking-form.tsx`
- Modify: `src/app/staff/page.tsx`
- Modify: `src/components/staff/booking-edit-sheet.tsx`, `src/components/admin/booking-edit-dialog.tsx`

- [ ] **Step 1: Онлайн форма — маркирай паралелните слотове**

`public-booking-form` рендира `DaySlot[]`. За слотове със статус `parallel`: направи ги кликаеми (като `free`) с дискретен етикет „· паралел" / различен нюанс. Когато избран слот е parallel → подай `allowParallel:true` към `createPublicBooking`. Добави и в легендата „паралел".

- [ ] **Step 2: Staff график — престой прозорец като паралел-блок**

В `staff/page.tsx`, освен обикновените „свободно" gap-ове, изчисли `parallelWindows` за деня и вмъкни блок „свободно (престой) — паралелен час" на мястото на прозореца, tappable към „Нов час" с предзададен прозорец (allowParallel). Паралелните часове (`b.allowParallel`) маркирай с етикет „паралелен" в timeline блока.

- [ ] **Step 3: Edit форми — активни/престой полета за процедурни часове**

В `booking-edit-sheet` + `booking-edit-dialog` добави (когато часът има processingMin или услугата е процедурна) полета „активни / престой минути", подавани към editMyBooking/updateBooking (разшири схемите им с тези опц. полета + снапшот при запис). Майсторът коригира за дълга/къса коса.

- [ ] **Step 4: Build + Commit**

Run: `npm run build` → ✓
```bash
git add src/components/forms/public-booking-form.tsx src/app/staff/page.tsx src/components/staff/booking-edit-sheet.tsx "src/components/admin/booking-edit-dialog.tsx"
git commit -m "Parallel booking: online slots + staff window + edit fields"
```

---

## Task 7: Push + верификация + инструкции

- [ ] **Step 1: Финален build**

Run: `npm run build` → ✓ зелено.

- [ ] **Step 2: Логика-проверка**

Run: `npx tsx scripts/check-parallel-logic.ts` → всички PASS.

- [ ] **Step 3: Push**

```bash
git push
```

- [ ] **Step 4: Инструкции за потребителя**

Изведи ясно: (1) пусни `docs/parallel-booking-migration.sql` в Supabase (колони + constraint); (2) в admin → Услуги задай „активни/престой минути" на процедурните (боя/кератин/балаяж); (3) тогава онлайн формата ще пуска паралелни слотове в престоя, а staff графикът ще показва прозореца. Преди миграцията: кодът е zero-regression (колоните default 0 → processingMin 0 → нула паралелни прозорци; allowParallel винаги false).

⚠️ Жива Playwright проверка изисква миграцията + admin парола (user-side), както при другите booking тестове.

---

## Дефиниция за готовност (spec §9)

- `next build` зелен; `check-parallel-logic.ts` PASS.
- Преди миграция: нула регресия (default 0 → нула паралел).
- След миграция + processingMin услуга: онлайн паралелен слот в престоя; запис allow_parallel=true; нормален застъпващ запис пак блокиран; `fitsParallelWindow` отхвърля извън прозореца; staff показва прозореца.
