# Спринт 1: Услуги по дължина + Gap Booking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Цветните услуги да имат варианти по дължина (research-base времена) и Снежана да записва втори клиент в престоя на боядисване (gap booking), със зелено `next build`.

**Architecture:** 3-фазен модел (нанасяне+престой+измиване) върху съществуващите `serviceItems.activeMin/processingMin`. Pure slot-логиката се извлича от `getDaySlots` за unit тестване и става **active-based** (паралелен слот изисква само активното време да се събере в чужд престой). Staff формата свързва паралела; публичният booking вече е свързан (block-based) — само се активира с данните.

**Tech Stack:** Next.js 16, React 19.2, Drizzle ORM (Postgres/Supabase), TypeScript, Vitest (нов, за pure логиката), tsx (скриптове).

**Spec:** `docs/superpowers/specs/2026-06-24-parallel-booking-gap-time-design.md`
**Branch:** `feature/parallel-booking`

---

## Task 0: Vitest setup (за pure slot логиката)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDependencies)

- [ ] **Step 1: Инсталирай vitest**

Run: `npm i -D vitest@2.1.8`
Expected: добавя vitest в devDependencies, нула production промени.

- [ ] **Step 2: Създай `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Добави test скрипт в `package.json`**

В `"scripts"` добави след `"type-check"`:
```json
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 4: Провери че vitest върви (празно)**

Run: `npx vitest run`
Expected: "No test files found" (или 0 tests) — конфигът е валиден.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "build: add vitest for pure booking-logic unit tests"
```

---

## Task 1: Unit тестове за `windowFor` (parallel.ts вече е pure)

**Files:**
- Test: `src/lib/booking/parallel.test.ts`

`windowFor(startMs, activeMin, processingMin)` вече съществува и е pure (виж `parallel.ts:12`). Заключваме поведението с тестове преди да градим върху него.

- [ ] **Step 1: Напиши тестовете**

```ts
import { describe, it, expect } from "vitest";
import { windowFor, PARALLEL_SAFETY_MIN } from "./parallel";

const T0 = Date.UTC(2026, 5, 25, 14, 30); // 17:30 Sofia в UTC — стойността няма значение, важни са разликите

describe("windowFor", () => {
  it("връща null когато престоят е ≤ 2× safety (няма място за паралел)", () => {
    expect(windowFor(T0, 25, 2 * PARALLEL_SAFETY_MIN)).toBeNull();
    expect(windowFor(T0, 25, 0)).toBeNull();
  });

  it("отваря прозорец [start+active+safety, start+active+processing-safety]", () => {
    const w = windowFor(T0, 25, 40);
    expect(w).not.toBeNull();
    expect(w!.start).toBe(T0 + (25 + PARALLEL_SAFETY_MIN) * 60000); // +30 мин
    expect(w!.end).toBe(T0 + (25 + 40 - PARALLEL_SAFETY_MIN) * 60000); // +60 мин
  });

  it("прозорецът е дълъг processing − 2×safety", () => {
    const w = windowFor(T0, 25, 40)!;
    expect(w.end - w.start).toBe((40 - 2 * PARALLEL_SAFETY_MIN) * 60000); // 30 мин
  });
});
```

- [ ] **Step 2: Пусни — трябва да минат (функцията съществува)**

Run: `npx vitest run src/lib/booking/parallel.test.ts`
Expected: PASS (3 теста). Ако паднат → `windowFor` се е променил; спри и провери.

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking/parallel.test.ts
git commit -m "test(booking): lock windowFor parallel-window behavior"
```

---

## Task 2: Извлечи pure `computeDaySlots` + направи я active-based (TDD)

**Files:**
- Create: `src/lib/booking/compute-slots.ts`
- Test: `src/lib/booking/compute-slots.test.ts`

Извличаме слот-логиката от `getDaySlots` (`slots.ts:149-159`) в чиста функция, за да я тестваме и направим active-based. **Текущата проверка е block-based** (`end ≤ window.end`); новата проверява само **активното** време.

- [ ] **Step 1: Напиши failing тестовете**

```ts
import { describe, it, expect } from "vitest";
import { computeDaySlots } from "./compute-slots";

const H = (hhmm: string) => Date.UTC(2026, 5, 25, +hhmm.slice(0, 2), +hhmm.slice(3)); // "09:00" → ms
const STEP = 15 * 60000;

describe("computeDaySlots", () => {
  const base = {
    open: H("09:00"), close: H("19:00"),
    busy: [] as Array<[number, number]>, wins: [] as Array<{ start: number; end: number }>,
    blockMs: 30 * 60000, activeMs: 30 * 60000,
    minStart: H("09:00"), stepMs: STEP, allowParallel: false,
  };

  it("маркира всички свободни когато няма заети", () => {
    const slots = computeDaySlots(base);
    expect(slots[0]).toEqual({ start: new Date(H("09:00")).toISOString(), status: "free" });
    expect(slots.every((s) => s.status === "free")).toBe(true);
  });

  it("маркира past преди minStart", () => {
    const slots = computeDaySlots({ ...base, minStart: H("10:00") });
    expect(slots.find((s) => s.start === new Date(H("09:00")).toISOString())!.status).toBe("past");
    expect(slots.find((s) => s.start === new Date(H("10:00")).toISOString())!.status).toBe("free");
  });

  it("маркира busy при застъпване със зает час", () => {
    const slots = computeDaySlots({ ...base, busy: [[H("10:00"), H("11:00")]] });
    expect(slots.find((s) => s.start === new Date(H("10:00")).toISOString())!.status).toBe("busy");
  });

  it("НЕ показва паралел когато allowParallel=false", () => {
    const slots = computeDaySlots({
      ...base, busy: [[H("10:00"), H("12:00")]], wins: [{ start: H("10:00"), end: H("12:00") }],
    });
    expect(slots.find((s) => s.start === new Date(H("10:30")).toISOString())!.status).toBe("busy");
  });

  it("паралел по АКТИВНО време: дълъг блок се вмъква ако активното се събира в прозореца", () => {
    // host боя 10:00-11:30 busy; прозорец 10:30-11:15; втора услуга blockMs=90 (overflow), activeMs=25
    const slots = computeDaySlots({
      ...base,
      busy: [[H("10:00"), H("11:30")]],
      wins: [{ start: H("10:30"), end: H("11:15") }],
      blockMs: 90 * 60000, activeMs: 25 * 60000, allowParallel: true,
    });
    // 10:30: активното 10:30-10:55 е в прозореца 10:30-11:15 → parallel (макар блокът да излиза)
    expect(slots.find((s) => s.start === new Date(H("10:30")).toISOString())!.status).toBe("parallel");
    // 11:00: активното 11:00-11:25 излиза от прозореца (11:15) → busy
    expect(slots.find((s) => s.start === new Date(H("11:00")).toISOString())!.status).toBe("busy");
  });

  it("пропуска слотове, чийто блок излиза извън работното време и не са паралел", () => {
    // близо до края: activeMs се събира, blockMs не → не се показва (както досега)
    const slots = computeDaySlots({ ...base, blockMs: 60 * 60000, activeMs: 20 * 60000, open: H("18:30") });
    // 18:30: block до 19:30 > close, не паралел → пропуснат; activeMs (18:50) ≤ close но без паралел
    expect(slots.find((s) => s.start === new Date(H("18:30")).toISOString())).toBeUndefined();
  });
});
```

- [ ] **Step 2: Пусни — трябва да fail-нат (няма функция)**

Run: `npx vitest run src/lib/booking/compute-slots.test.ts`
Expected: FAIL — "Failed to resolve import './compute-slots'".

- [ ] **Step 3: Напиши `compute-slots.ts`**

```ts
import type { DaySlot, SlotStatus } from "./slots";

export interface ComputeSlotsParams {
  open: number;          // ms UTC начало на работния ден
  close: number;         // ms UTC край
  busy: Array<[number, number]>;            // заети интервали [start, end)
  wins: Array<{ start: number; end: number }>; // паралелни прозорци (престои)
  blockMs: number;       // (durationMin + bufferMin) * 60000
  activeMs: number;      // activeMin * 60000 (или blockMs ако няма активно)
  minStart: number;      // ms UTC — преди това = past
  stepMs: number;        // стъпка (15 мин)
  allowParallel: boolean;
}

/**
 * Pure: пресмята статуса на всеки слот за деня. Паралелът е ACTIVE-based —
 * втори (дълъг) час се събира, ако само активното му време попада в чужд престой;
 * престоят му може да прелее след работното време.
 */
export function computeDaySlots(p: ComputeSlotsParams): DaySlot[] {
  const out: DaySlot[] = [];
  for (let t = p.open; t + p.activeMs <= p.close; t += p.stepMs) {
    const blockEnd = t + p.blockMs;
    const activeEnd = t + p.activeMs;
    const fitsBlock = blockEnd <= p.close;
    const overlaps = p.busy.some(([bs, be]) => t < be && blockEnd > bs);

    let status: SlotStatus;
    if (!overlaps) {
      if (!fitsBlock) continue; // блокът излиза извън деня, няма паралел → не показвай
      status = t < p.minStart ? "past" : "free";
    } else if (p.allowParallel && p.wins.some((w) => t >= w.start && activeEnd <= w.end)) {
      status = t < p.minStart ? "past" : "parallel";
    } else if (fitsBlock) {
      status = "busy";
    } else {
      continue; // застъпен блок, който и без друго не се събира, и не е паралел
    }
    out.push({ start: new Date(t).toISOString(), status });
  }
  return out;
}
```

- [ ] **Step 4: Пусни — трябва да минат**

Run: `npx vitest run src/lib/booking/compute-slots.test.ts`
Expected: PASS (7 теста).

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/compute-slots.ts src/lib/booking/compute-slots.test.ts
git commit -m "feat(booking): active-based pure computeDaySlots with tests"
```

---

## Task 3: `getDaySlots` ползва `computeDaySlots` + приема `activeMin`

**Files:**
- Modify: `src/lib/booking/slots.ts:94-162`

- [ ] **Step 1: Добави `activeMin` в сигнатурата и замени цикъла**

В `getDaySlots` опциите (`slots.ts:94-102`) добави `activeMin?: number;` след `allowParallel?: boolean;`.

Замени ръчния цикъл (`slots.ts:145-159`, от `const minStart` до края на `for`) с:
```ts
  const minStart = now.getTime() + minNotice * 60000;
  const stepMs = GRANULARITY_MIN * 60000;
  const activeMs = (opts.activeMin && opts.activeMin > 0 ? opts.activeMin : opts.durationMin) * 60000;

  const slots = computeDaySlots({
    open, close, busy, wins, blockMs, activeMs, minStart, stepMs,
    allowParallel: opts.allowParallel === true,
  });
```

Добави импорта най-горе (`slots.ts:1-4`):
```ts
import { computeDaySlots } from "./compute-slots";
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: нула грешки.

- [ ] **Step 3: Регресия на pure тестовете**

Run: `npx vitest run`
Expected: PASS (всички от Task 1-2).

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/slots.ts
git commit -m "refactor(booking): getDaySlots delegates to active-based computeDaySlots"
```

---

## Task 4: `fitsParallelWindow` по активно време в staff actions

**Files:**
- Modify: `src/lib/actions/staff-bookings.ts:72, 145, 198`

Трите извиквания на `fitsParallelWindow` подават `end` = край на блока. За паралел трябва **край на активното** (`start + activeMin`), за да съвпада с `computeDaySlots`.

- [ ] **Step 1: Прочети текущите извиквания**

Run: `grep -n "fitsParallelWindow\|activeMin\|durationMin" src/lib/actions/staff-bookings.ts`
Expected: вижда редовете 72/145/198 и откъде идва `activeMin` (от `ownOffering` / snapshot).

- [ ] **Step 2: В `createMyBooking` (около ред 72) изчисли active end**

Преди проверката `if (d.allowParallel && ...)` добави:
```ts
  const activeEndDate = new Date(start.getTime() + (d.activeMin && d.activeMin > 0 ? d.activeMin : d.durationMin) * 60000);
```
и смени проверката на:
```ts
  if (d.allowParallel && !(await fitsParallelWindow(resource.id, start, activeEndDate))) {
    return { ok: false as const, error: "Този паралелен час не се събира в свободния престой." };
  }
```
Ако `d.activeMin` не съществува в схемата на input-а — добави `activeMin: z.number().int().min(0).optional()` в zod схемата и го подай от формата (виж Task 6).

- [ ] **Step 3: Същото за `rescheduleMyBooking` (~145) и `editMyBooking` (~198)**

И в двете използвай `booking.activeMin` (snapshot-нат на часа) за active end:
```ts
  const activeEnd = new Date(newStart.getTime() + (booking.activeMin > 0 ? booking.activeMin : booking.durationMin ?? /* fallback */ 60) * 60000);
  if (booking.allowParallel && !(await fitsParallelWindow(resource.id, newStart, activeEnd, id))) {
    return { ok: false as const, error: "Преместеният паралелен час не се събира в престоя." };
  }
```
(Имената на променливите за нов старт следвай каквито са в текущия код — `newStart`/`start`.)

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: нула грешки.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/staff-bookings.ts
git commit -m "fix(booking): staff parallel check uses active-end, not block-end"
```

---

## Task 5: `fetchMySlots` активира паралел + подава `activeMin`

**Files:**
- Modify: `src/lib/actions/staff-bookings.ts:42` (и `ownOffering` извличането над него)

- [ ] **Step 1: Прочети `fetchMySlots` + `ownOffering`**

Run: `grep -n "fetchMySlots\|ownOffering\|getDaySlots" src/lib/actions/staff-bookings.ts`
Expected: вижда как се вземат `durationMin, bufferMin` и че `ownOffering` връща и `activeMin, processingMin`.

- [ ] **Step 2: Подай `allowParallel` + `activeMin` към `getDaySlots`**

Смени извикването (`staff-bookings.ts:42`) на:
```ts
  const res = await getDaySlots({
    resourceId: resource.id,
    durationMin,
    bufferMin,
    activeMin,            // от ownOffering
    dateStr,
    minNoticeMin: 0,
    allowParallel: true,
  });
```
Увери се, че `activeMin` е деструктуриран от `ownOffering(...)` няколко реда по-горе (където са `durationMin, bufferMin`).

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: нула грешки.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/staff-bookings.ts
git commit -m "feat(booking): staff new-appointment form loads parallel slots"
```

---

## Task 6: Staff формата прави паралелните слотове записваеми

**Files:**
- Modify: `src/components/staff/staff-booking-form.tsx:228-244` (slot rendering) + slot state + submit

- [ ] **Step 1: Прочети slot state и submit**

Run: `grep -n "setSlot\|const \[slot\|createMyBooking\|slotIsParallel\|activeMin" src/components/staff/staff-booking-form.tsx`
Expected: вижда `slot` state-а и `createMyBooking({...})` извикването.

- [ ] **Step 2: Изведи дали избраният слот е паралелен**

До другите `useMemo`/derived стойности добави:
```tsx
  const slotIsParallel = data.slots.some((s) => s.start === slot && s.status === "parallel");
```

- [ ] **Step 3: Направи `parallel` слотовете clickable (различен цвят)**

Замени блока `data.slots.map(...)` (`staff-booking-form.tsx:229-243`) с:
```tsx
            {data.slots.map((s) => {
              const isFree = s.status === "free";
              const isParallel = s.status === "parallel";
              if (isFree || isParallel) {
                const selected = slot === s.start;
                return (
                  <button key={s.start} type="button" onClick={() => setSlot(s.start)}
                    className={
                      "rounded-xl border py-2.5 text-sm font-medium tabular-nums transition-all active:scale-[0.98] " +
                      (selected
                        ? "border-foreground bg-foreground text-background"
                        : isParallel
                          ? "border-mint bg-mint/15 text-foreground hover:border-mint/80"
                          : "border-border bg-background hover:border-foreground/50")
                    }>
                    {slotLabel(s.start)}
                    {isParallel && <span className="ml-1 text-[10px] font-normal text-primary">в престой</span>}
                  </button>
                );
              }
              return (
                <span key={s.start} className={"cursor-not-allowed rounded-xl py-2.5 text-center text-sm tabular-nums " + (s.status === "busy" ? "bg-secondary text-muted-foreground line-through" : "bg-muted/30 text-muted-foreground/55")}>
                  {slotLabel(s.start)}
                </span>
              );
            })}
```

- [ ] **Step 4: Подай `allowParallel` (+ activeMin) при запис**

В `createMyBooking({...})` извикването добави:
```tsx
        allowParallel: slotIsParallel,
        activeMin: offering?.activeMin ?? 0,
```
(Името на текущо избраната оферта/услуга следвай каквото е в компонента — там, откъдето идват `durationMin`/`serviceItemId`. Ако няма `offering`, вземи `activeMin` от избрания service item.)

- [ ] **Step 5: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: нула грешки, build зелен.

- [ ] **Step 6: Commit**

```bash
git add src/components/staff/staff-booking-form.tsx src/lib/actions/staff-bookings.ts
git commit -m "feat(booking): staff parallel slots are bookable (mint 'в престой')"
```

---

## Task 7: Seed скрипт — цветни услуги по дължина

**Files:**
- Create: `scripts/seed-length-services.ts`

Скриптът е **идемпотентен** и НЕ се пуска от агента (production DB запис) — само се създава и предоставя на собственика. Заменя единичните цветни услуги с по 3 варианта (къса/средна/дълга) с времената от spec §3.

- [ ] **Step 1: Напиши скрипта**

```ts
/**
 * Идемпотентно създава цветните услуги в 3 варианта по дължина (къса/средна/дълга)
 * с research-base активно/престой времена (spec §3). Цените са ПРЕДЛОЖЕНИЯ — собственикът
 * ги коригира в админ панела. НЕ изтрива стари услуги; маркира ги bookableOnline=false,
 * за да не дублират (ръчно изтриване след преглед).
 *
 * Пускане: npx tsx --env-file=.env.local scripts/seed-length-services.ts
 */
import { nanoid } from "nanoid";
import { db, schema } from "../src/lib/db";
import { eq } from "drizzle-orm";

type Variant = { len: "къса" | "средна" | "дълга"; active: number; processing: number; finish: number; price: number };
type ColorService = { match: RegExp; groupTitle: string; baseName: string; categorySlug: string; variants: Variant[] };

// durationMin = active + processing + finish. Цените са стартови (лв) — собственикът ги сменя.
const SERVICES: ColorService[] = [
  { match: /^боядисване$/i, baseName: "Боядисване", groupTitle: "Боядисване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 15, processing: 40, finish: 15, price: 45 },
    { len: "средна", active: 25, processing: 40, finish: 20, price: 55 },
    { len: "дълга", active: 40, processing: 40, finish: 25, price: 70 },
  ]},
  { match: /^балаяж$/i, baseName: "Балаяж", groupTitle: "Изсветляване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 50, processing: 40, finish: 30, price: 120 },
    { len: "средна", active: 70, processing: 45, finish: 35, price: 150 },
    { len: "дълга", active: 90, processing: 45, finish: 45, price: 190 },
  ]},
  { match: /кичури/i, baseName: "Кичури на фолио", groupTitle: "Изсветляване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 30, processing: 40, finish: 15, price: 70 },
    { len: "средна", active: 45, processing: 40, finish: 20, price: 90 },
    { len: "дълга", active: 60, processing: 40, finish: 25, price: 120 },
  ]},
  { match: /корекция/i, baseName: "Корекция на цветовете", groupTitle: "Боядисване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 40, processing: 45, finish: 20, price: 90 },
    { len: "средна", active: 55, processing: 45, finish: 25, price: 120 },
    { len: "дълга", active: 75, processing: 45, finish: 30, price: 150 },
  ]},
];

async function main() {
  const cats = await db.query.serviceCategories.findMany();
  const items = await db.query.serviceItems.findMany();

  for (const svc of SERVICES) {
    const cat = cats.find((c) => c.slug === svc.categorySlug);
    if (!cat) { console.warn(`⚠ категория ${svc.categorySlug} липсва — пропускам ${svc.baseName}`); continue; }

    // Изключи старите единични варианти от онлайн (не трий — ръчен преглед)
    for (const old of items.filter((i) => svc.match.test(i.name) && i.categoryId === cat.id)) {
      await db.update(schema.serviceItems).set({ bookableOnline: false }).where(eq(schema.serviceItems.id, old.id));
      console.log(`  ↪ старо „${old.name}" → bookableOnline=false`);
    }

    let order = 0;
    for (const v of svc.variants) {
      const name = `${svc.baseName} (${v.len} коса)`;
      const existing = items.find((i) => i.name === name && i.categoryId === cat.id);
      const values = {
        categoryId: cat.id,
        groupTitle: svc.groupTitle,
        name,
        price: v.price,
        priceFrom: true,
        currency: "лв",
        durationMin: v.active + v.processing + v.finish,
        bufferMin: 15,
        activeMin: v.active,
        processingMin: v.processing,
        bookableOnline: true,
        sortOrder: order++,
      };
      if (existing) {
        await db.update(schema.serviceItems).set(values).where(eq(schema.serviceItems.id, existing.id));
        console.log(`  ✓ ъпдейт „${name}" (${values.durationMin}мин, престой ${v.processing})`);
      } else {
        await db.insert(schema.serviceItems).values({ id: nanoid(), ...values });
        console.log(`  + нова „${name}" (${values.durationMin}мин, престой ${v.processing})`);
      }
    }
  }
  console.log("\n✅ Готово. Прегледай цените в админ панела и изтрий старите единични услуги ръчно.");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
```

- [ ] **Step 2: Type-check на скрипта**

Run: `npx tsc --noEmit scripts/seed-length-services.ts --moduleResolution bundler --module esnext --target es2022 --skipLibCheck` (или просто `npm run type-check` ако скриптовете са включени)
Expected: нула грешки (или само очаквани за пътищата — ключово е логиката да компилира).

- [ ] **Step 3: Commit (БЕЗ пускане)**

```bash
git add scripts/seed-length-services.ts
git commit -m "feat(booking): seed script for length-based color services (owner-run)"
```

- [ ] **Step 4: Документирай за собственика**

Добави към финалното резюме: „Пусни `npx tsx --env-file=.env.local scripts/seed-length-services.ts`, после провери цените в админ и изтрий старите единични услуги."

---

## Task 8: Три line-art SVG картинки за дължина

**Files:**
- Create: `public/illustrations/hair-short.svg`
- Create: `public/illustrations/hair-medium.svg`
- Create: `public/illustrations/hair-long.svg`

Прости line-art силуети (профил на глава + коса), консистентни с `/illustrations/*` (line stroke, `currentColor`, за да приемат `text-mint`).

- [ ] **Step 1: `hair-short.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M50 18c-14 0-22 10-22 24 0 8 3 13 3 18" />
  <path d="M50 18c14 0 22 10 22 24 0 8-3 13-3 18" />
  <path d="M35 40c4-8 11-12 15-12s11 4 15 12" />
  <circle cx="50" cy="50" r="20" />
  <path d="M44 88c0 6 12 6 12 0" />
  <path d="M50 70v14" />
</svg>
```

- [ ] **Step 2: `hair-medium.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M50 16c-16 0-25 11-25 26 0 14 4 24 4 38" />
  <path d="M50 16c16 0 25 11 25 26 0 14-4 24-4 38" />
  <path d="M33 40c5-9 12-13 17-13s12 4 17 13" />
  <circle cx="50" cy="50" r="20" />
  <path d="M29 80c0 6 3 12 6 18M71 80c0 6-3 12-6 18" />
</svg>
```

- [ ] **Step 3: `hair-long.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M50 14c-18 0-28 12-28 28 0 22 6 36 7 56" />
  <path d="M50 14c18 0 28 12 28 28 0 22-6 36-7 56" />
  <path d="M31 40c5-10 13-14 19-14s14 4 19 14" />
  <circle cx="50" cy="50" r="20" />
  <path d="M26 78c0 12 2 22 4 32M74 78c0 12-2 22-4 32" />
</svg>
```

- [ ] **Step 4: Визуална проверка**

Run: `npm run dev` и отвори всеки SVG на `http://localhost:3000/illustrations/hair-short.svg` (medium/long).
Expected: вижда се разпознаваем силует с нарастваща дължина. Ако е твърде грубо — коригирай path-овете.

- [ ] **Step 5: Commit**

```bash
git add public/illustrations/hair-short.svg public/illustrations/hair-medium.svg public/illustrations/hair-long.svg
git commit -m "feat(ui): line-art length illustrations (short/medium/long)"
```

---

## Task 9: Показвай картинката до length-вариантите при избор

**Files:**
- Modify: `src/components/forms/public-booking-form.tsx` (списъка с услуги)
- Modify: `src/components/staff/staff-booking-form.tsx` (списъка с услуги)

Когато услуга има „(къса/средна/дълга коса)" в името, покажи съответната икона до нея.

- [ ] **Step 1: Помощна функция за иконата (споделена)**

Create: `src/lib/booking/length-icon.ts`
```ts
/** Връща пътя към line-art иконата според дължината в името на услугата, или null. */
export function lengthIconFor(name: string): string | null {
  if (/къса коса/i.test(name)) return "/illustrations/hair-short.svg";
  if (/средна коса/i.test(name)) return "/illustrations/hair-medium.svg";
  if (/дълга коса/i.test(name)) return "/illustrations/hair-long.svg";
  return null;
}
```

- [ ] **Step 2: Покажи иконата в staff формата**

Run: `grep -n "Фризьор\|services.map\|button.*service\|setServiceId" src/components/staff/staff-booking-form.tsx`
Expected: намира къде се рендира списъкът с услуги (бутоните `e20`-`e88` от снапшота).

В рендера на всяка услуга, преди името, добави (импортирай `lengthIconFor` + `Image`):
```tsx
{lengthIconFor(svc.name) && (
  <img src={lengthIconFor(svc.name)!} alt="" aria-hidden className="size-6 shrink-0 text-mint mix-blend-multiply" />
)}
```

- [ ] **Step 3: Същото в публичната форма**

Run: `grep -n "services.filter\|selectedServices\|toggleService\|s.name" src/components/forms/public-booking-form.tsx`
Expected: намира списъка с услуги (групиран по категория/група).

Добави същата икона до името на всяка услуга-вариант.

- [ ] **Step 4: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: нула грешки, build зелен.

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/length-icon.ts src/components/forms/public-booking-form.tsx src/components/staff/staff-booking-form.tsx
git commit -m "feat(ui): show length icon next to length service variants"
```

---

## Task 10: Интеграционна проверка (диагностика + визуално)

**Files:** (само четене/пускане)

- [ ] **Step 1: Пусни диагностиката след seed (от собственика)**

> Изпълнява се СЛЕД като собственикът е пуснал Task 7 seed скрипта.

Run: `npx tsx --env-file=.env.local scripts/check-coloring.ts`
Expected: „Боядисване" вече показва `processing>0`; симулацията „17:30 host" дава прозорец (не NULL).

- [ ] **Step 2: Визуална репродукция в staff PWA**

Влез в `/staff/login` (admin@euphoriabeauty.eu), нов час → „Боядисване (средна коса)" → host час, после втори час 18:00.
Expected: 18:00 е **записваем** (mint „в престой"), не задраскан.

- [ ] **Step 3: Регресия**

Избери услуга без престой (подстригване/маникюр) на същия ден.
Expected: непроменено — без паралелни слотове, нормално поведение.

- [ ] **Step 4: Финален build**

Run: `npm run build && npx vitest run`
Expected: build зелен (всички страници), всички unit тестове минават.

---

## Дефиниция на „готово" за Спринт 1
- `npm run build` зелен, `npx vitest run` зелен, `npm run type-check` чист.
- Staff може да запише паралелно боядисване в престоя (17:30 + 18:00).
- Цветните услуги имат варианти по дължина с research-base времена.
- Line-art иконите се показват до length-вариантите.
- Seed скриптът е готов за собственика (НЕ пуснат от агента).
- Публичният booking показва кратки услуги в престоите (block-based, без промяна по кода).
