# Симетричен паралелен запис + престой в /staff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Снежана да записва два (или повече) застъпени дълги часа (боядисвания) в произволен ред, стига намазванията да не се застъпват — и да управлява престоя на услугите от /staff.

**Architecture:** Заменяме асиметричния „престой-прозорец" модел със симетрична pure проверка `pairFits` (заетите времена не се застъпват + заетото на единия е в престоя на другия). `computeDaySlots` и записните канали ползват една и съща pure функция. Престоят (active/processing) остава глобален на услугата, но става редактируем от /staff (без DB миграция).

**Tech Stack:** Next.js 16, React 19, Drizzle + Supabase Postgres, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-29-symmetric-parallel-booking-design.md`

---

## File structure

| Файл | Промяна | Отговорност |
|---|---|---|
| `src/lib/booking/parallel-window.ts` | modify | pure ядро: `windowFor` (запазва се) + нови `busySpan`, `pairFits`, `slotParallelFits` |
| `src/lib/booking/parallel.test.ts` | modify | unit тестове за `pairFits` / `slotParallelFits` |
| `src/lib/booking/compute-slots.ts` | modify | нова сигнатура (`neighbors`), симетрична паралелна логика |
| `src/lib/booking/compute-slots.test.ts` | modify | пренаписани тестове |
| `src/lib/booking/parallel.ts` | modify | `fitsParallelSlot` DB-обвивка (заменя `fitsParallelWindow`); `parallelWindows` се маха |
| `src/lib/booking/slots.ts` | modify | `getDaySlots` строи `neighbors`, приема `processingMin` |
| `src/lib/actions/staff-bookings.ts` | modify | трите канала ползват `fitsParallelSlot` |
| `src/lib/actions/resource-services.ts` | modify | `updateMyService` += `activeMin/processingMin` → service_items |
| `src/components/staff/my-services.tsx` | modify | `EditSheet` + `MyServiceOpt` += престой полета |
| `src/app/staff/services/page.tsx` | modify | подава active/processing към `MyServiceOpt` |

---

## Task 1: Pure ядро — `pairFits` + `slotParallelFits`

**Files:**
- Modify: `src/lib/booking/parallel-window.ts`
- Test: `src/lib/booking/parallel.test.ts`

- [ ] **Step 1: Добави pure функциите в `parallel-window.ts`** (под съществуващия `windowFor`)

```ts
export interface SlotNeighbor {
  start: number; // ms UTC начало (booking.startAt)
  end: number;   // ms UTC край (booking.endAt — край на целия блок)
  activeMin: number;
  processingMin: number;
}

/**
 * Заетото време на час: ако има престой → само намазването [start, start+active];
 * ако НЯМА престой (processing ≤ 2×safety) → целият блок е плътно зает [start, end].
 */
function busySpan(startMs: number, endMs: number, activeMin: number, procMin: number) {
  if (procMin > 2 * PARALLEL_SAFETY_MIN) return { start: startMs, end: startMs + activeMin * 60000 };
  return { start: startMs, end: endMs };
}

/**
 * Симетрична проверка дали два часа може да текат паралелно:
 *  (a) заетите времена не се застъпват, с поне PARALLEL_SAFETY_MIN мин помежду им;
 *  (b) заетото на единия е ИЗЦЯЛО в престоя (windowFor) на другия.
 * Услуга без престой → windowFor = null → не може да приеме/влезе паралелно.
 */
export function pairFits(
  candStart: number, candEnd: number, candActiveMin: number, candProcMin: number,
  otherStart: number, otherEnd: number, otherActiveMin: number, otherProcMin: number,
): boolean {
  const SAFETY = PARALLEL_SAFETY_MIN * 60000;
  const cb = busySpan(candStart, candEnd, candActiveMin, candProcMin);
  const ob = busySpan(otherStart, otherEnd, otherActiveMin, otherProcMin);
  if (!(cb.start >= ob.end + SAFETY || ob.start >= cb.end + SAFETY)) return false;
  const cw = windowFor(candStart, candActiveMin, candProcMin);
  const ow = windowFor(otherStart, otherActiveMin, otherProcMin);
  const candInOther = ow !== null && cb.start >= ow.start && cb.end <= ow.end;
  const otherInCand = cw !== null && ob.start >= cw.start && ob.end <= cw.end;
  return candInOther || otherInCand;
}

/**
 * Кандидат-блок [candStart, candEnd) се вписва паралелно, ако застъпва поне един
 * съсед и pairFits е true с ВСЕКИ застъпен (никое заето време не се блъска).
 */
export function slotParallelFits(
  candStart: number, candEnd: number, candActiveMin: number, candProcMin: number,
  neighbors: SlotNeighbor[],
): boolean {
  const hit = neighbors.filter((n) => candStart < n.end && candEnd > n.start);
  if (hit.length === 0) return false;
  return hit.every((n) =>
    pairFits(candStart, candEnd, candActiveMin, candProcMin, n.start, n.end, n.activeMin, n.processingMin),
  );
}
```

- [ ] **Step 2: Добави тестовете в `parallel.test.ts`** (под съществуващия `describe("windowFor")`)

```ts
import { windowFor, PARALLEL_SAFETY_MIN, pairFits, slotParallelFits, type SlotNeighbor } from "./parallel-window";

// helper: ms за час hh:mm на 2026-06-30 (Sofia≈UTC+3, стойността без значение — важни са разликите)
const M = (hhmm: string) => Date.UTC(2026, 5, 30, +hhmm.slice(0, 2), +hhmm.slice(3));
// блок край = start + (duration+buffer); за боядисване средна: 85+15=100мин
const block = (startHHMM: string, totalMin: number) => M(startHHMM) + totalMin * 60000;

describe("pairFits — симетричен паралел", () => {
  // боядисване средна: active=25, processing=40, блок=100мин
  it("reverse: нов 17:00 преди записан 17:30 → пасва", () => {
    const ok = pairFits(
      M("17:00"), block("17:00", 100), 25, 40,
      M("17:30"), block("17:30", 100), 25, 40,
    );
    expect(ok).toBe(true);
  });

  it("forward: нов 17:30 след записан 17:00 → пасва (симетрично)", () => {
    const ok = pairFits(
      M("17:30"), block("17:30", 100), 25, 40,
      M("17:00"), block("17:00", 100), 25, 40,
    );
    expect(ok).toBe(true);
  });

  it("блъскащи намазвания → не пасва (дълга коса active=40 застъпва 17:30)", () => {
    const ok = pairFits(
      M("17:00"), block("17:00", 120), 40, 40,
      M("17:30"), block("17:30", 100), 25, 40,
    );
    expect(ok).toBe(false);
  });

  it("съсед без престой (плътно зает блок) → не позволява паралел", () => {
    // стара „Боядисване" 17:30, active=0/proc=0, блок 90мин
    const ok = pairFits(
      M("17:00"), block("17:00", 100), 25, 40,
      M("17:30"), block("17:30", 90), 0, 0,
    );
    expect(ok).toBe(false);
  });

  it("кратка услуга без престой ВЪВ престоя на боя → пасва (класически forward)", () => {
    // стрижка 18:00 (active=30, proc=0, блок 40) в престоя на боя 17:30 (windowFor=[18:00,18:30])
    const ok = pairFits(
      M("18:00"), block("18:00", 40), 30, 0,
      M("17:30"), block("17:30", 100), 25, 40,
    );
    expect(ok).toBe(true);
  });
});

describe("slotParallelFits — срещу множество съседи", () => {
  const colorMid = (startHHMM: string): SlotNeighbor => ({
    start: M(startHHMM), end: block(startHHMM, 100), activeMin: 25, processingMin: 40,
  });

  it("празни съседи → false (няма с какво да е паралел)", () => {
    expect(slotParallelFits(M("17:00"), block("17:00", 100), 25, 40, [])).toBe(false);
  });

  it("17:00 спрямо записан 17:30 → true", () => {
    expect(slotParallelFits(M("17:00"), block("17:00", 100), 25, 40, [colorMid("17:30")])).toBe(true);
  });

  it("блокира се ако ДОРИ ЕДИН застъпен съсед е плътен (time_off)", () => {
    const timeOff: SlotNeighbor = { start: M("17:15"), end: M("18:15"), activeMin: 60, processingMin: 0 };
    expect(slotParallelFits(M("17:00"), block("17:00", 100), 25, 40, [colorMid("17:30"), timeOff])).toBe(false);
  });
});
```

- [ ] **Step 3: Пусни тестовете — трябва да фейлнат (функциите още не са импортирани/съществуват в теста)**

Run: `npm run test -- parallel.test`
Expected: PASS на новите (понеже Step 1 ги добави). Ако фейлва — поправи логиката, не теста.

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/parallel-window.ts src/lib/booking/parallel.test.ts
git commit -m "feat(booking): symmetric pairFits/slotParallelFits pure core"
```

---

## Task 2: `computeDaySlots` — симетрична логика

**Files:**
- Modify: `src/lib/booking/compute-slots.ts`
- Test: `src/lib/booking/compute-slots.test.ts`

- [ ] **Step 1: Замени тялото на `compute-slots.ts`**

```ts
/** Pure (без DB) ядро на дневния график — изолирано за unit тестване. */
import { slotParallelFits, type SlotNeighbor } from "./parallel-window";

export type SlotStatus = "free" | "busy" | "past" | "parallel";

export interface DaySlot {
  start: string; // ISO UTC
  status: SlotStatus;
}

export interface ComputeSlotsParams {
  open: number; // ms UTC начало на работния ден
  close: number; // ms UTC край
  neighbors: SlotNeighbor[]; // заети часове (bookings) + отпуски (като плътни: processingMin=0)
  blockMs: number; // (durationMin + bufferMin) * 60000 на НОВАТА услуга
  activeMin: number; // ефективно активно време на новата услуга (или durationMin ако няма)
  processingMin: number; // престой на новата услуга
  minStart: number; // ms UTC — преди това = past
  stepMs: number; // стъпка (15 мин)
  allowParallel: boolean;
}

/**
 * Pure: статус на всеки слот. Паралел = симетричен (slotParallelFits): нов час се
 * вписва, ако заетите му времена не се блъскат с ничии и заетото на единия е в
 * престоя на другия — независимо от реда на запис.
 */
export function computeDaySlots(p: ComputeSlotsParams): DaySlot[] {
  const out: DaySlot[] = [];
  const activeMs = p.activeMin * 60000;
  for (let t = p.open; t + activeMs <= p.close; t += p.stepMs) {
    const blockEnd = t + p.blockMs;
    const fitsBlock = blockEnd <= p.close;
    const overlaps = p.neighbors.some((n) => t < n.end && blockEnd > n.start);

    let status: SlotStatus;
    if (!overlaps) {
      if (!fitsBlock) continue; // блокът излиза извън деня, няма паралел → не показвай
      status = t < p.minStart ? "past" : "free";
    } else if (p.allowParallel && slotParallelFits(t, blockEnd, p.activeMin, p.processingMin, p.neighbors)) {
      status = t < p.minStart ? "past" : "parallel";
    } else if (fitsBlock) {
      status = "busy";
    } else {
      continue;
    }
    out.push({ start: new Date(t).toISOString(), status });
  }
  return out;
}
```

- [ ] **Step 2: Пренапиши `compute-slots.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeDaySlots } from "./compute-slots";
import type { SlotNeighbor } from "./parallel-window";

const H = (hhmm: string) => Date.UTC(2026, 5, 30, +hhmm.slice(0, 2), +hhmm.slice(3));
const STEP = 15 * 60000;

describe("computeDaySlots", () => {
  const base = {
    open: H("09:00"),
    close: H("19:00"),
    neighbors: [] as SlotNeighbor[],
    blockMs: 30 * 60000,
    activeMin: 30,
    processingMin: 0,
    minStart: H("09:00"),
    stepMs: STEP,
    allowParallel: false,
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
    const neighbors: SlotNeighbor[] = [{ start: H("10:00"), end: H("11:00"), activeMin: 60, processingMin: 0 }];
    const slots = computeDaySlots({ ...base, neighbors });
    expect(slots.find((s) => s.start === new Date(H("10:00")).toISOString())!.status).toBe("busy");
  });

  it("НЕ показва паралел когато allowParallel=false", () => {
    const neighbors: SlotNeighbor[] = [{ start: H("10:00"), end: H("12:00"), activeMin: 25, processingMin: 40 }];
    const slots = computeDaySlots({ ...base, neighbors, allowParallel: false });
    expect(slots.find((s) => s.start === new Date(H("10:30")).toISOString())!.status).toBe("busy");
  });

  it("REVERSE: нов по-ранен час пада паралелно преди записан боя-час", () => {
    // записан боя 10:30 (active=25, proc=40, блок 100мин); нов боя 10:00 (същата услуга)
    const neighbors: SlotNeighbor[] = [{ start: H("10:30"), end: H("10:30") + 100 * 60000, activeMin: 25, processingMin: 40 }];
    const slots = computeDaySlots({
      ...base, neighbors, blockMs: 100 * 60000, activeMin: 25, processingMin: 40, allowParallel: true,
    });
    expect(slots.find((s) => s.start === new Date(H("10:00")).toISOString())!.status).toBe("parallel");
  });

  it("FORWARD: кратка услуга в престоя на записан боя-час", () => {
    // боя 10:00 (active=25, proc=40 → престой 10:30-11:00); нова услуга active=20, proc=0, блок 30
    const neighbors: SlotNeighbor[] = [{ start: H("10:00"), end: H("10:00") + 100 * 60000, activeMin: 25, processingMin: 40 }];
    const slots = computeDaySlots({
      ...base, neighbors, blockMs: 30 * 60000, activeMin: 20, processingMin: 0, allowParallel: true,
    });
    expect(slots.find((s) => s.start === new Date(H("10:30")).toISOString())!.status).toBe("parallel");
  });

  it("блъскащи намазвания → busy, не parallel", () => {
    // записан боя 10:30; нов боя 10:00 с дълго намазване (active=40) → блъска 10:30 намазване
    const neighbors: SlotNeighbor[] = [{ start: H("10:30"), end: H("10:30") + 100 * 60000, activeMin: 25, processingMin: 40 }];
    const slots = computeDaySlots({
      ...base, neighbors, blockMs: 120 * 60000, activeMin: 40, processingMin: 40, allowParallel: true,
    });
    expect(slots.find((s) => s.start === new Date(H("10:00")).toISOString())!.status).toBe("busy");
  });

  it("услуга без престой като съсед (стара боя 0/0) не дава паралел", () => {
    const neighbors: SlotNeighbor[] = [{ start: H("10:30"), end: H("10:30") + 90 * 60000, activeMin: 0, processingMin: 0 }];
    const slots = computeDaySlots({
      ...base, neighbors, blockMs: 100 * 60000, activeMin: 25, processingMin: 40, allowParallel: true,
    });
    expect(slots.find((s) => s.start === new Date(H("10:00")).toISOString())!.status).toBe("busy");
  });
});
```

- [ ] **Step 3: Пусни тестовете**

Run: `npm run test -- compute-slots.test`
Expected: PASS (8 теста). Ако фейлва — поправи логиката.

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/compute-slots.ts src/lib/booking/compute-slots.test.ts
git commit -m "feat(booking): symmetric parallel logic in computeDaySlots"
```

---

## Task 3: `fitsParallelSlot` DB-обвивка (ДОБАВЯ се, без да маха старите)

**Files:**
- Modify: `src/lib/booking/parallel.ts`

> ⚠️ `parallelWindows` и `fitsParallelWindow` СЕ ЗАПАЗВАТ — публичната форма (`public-booking.ts`), admin (`bookings.ts`) и графикът (`staff/page.tsx`) ги ползват и остават block-based. Само ДОБАВЯМЕ `fitsParallelSlot`.

- [ ] **Step 1: Обнови импорта/реекспорта горе в `parallel.ts`** — добави `slotParallelFits` + `SlotNeighbor`:

```ts
import { db } from "@/lib/db";
import { PARALLEL_SAFETY_MIN, windowFor, slotParallelFits, type ParallelWindow, type SlotNeighbor } from "./parallel-window";

// Реекспорт за съвместимост — pure ядрото живее в ./parallel-window (без DB, за тестове).
export { PARALLEL_SAFETY_MIN, windowFor, slotParallelFits };
export type { ParallelWindow, SlotNeighbor };
```
(Останалите функции `parallelWindows` и `fitsParallelWindow` се ОСТАВЯТ непокътнати.)

- [ ] **Step 2: Добави `fitsParallelSlot` + `dayNeighbors` в края на `parallel.ts`**

```ts
/**
 * Зарежда съседните часове (bookings) за деня на `start` като SlotNeighbor[].
 * Отпуските НЕ се включват тук — те се проверяват отделно с hasTimeOffConflict
 * при запис; за визуалния график се добавят в getDaySlots.
 */
async function dayNeighbors(resourceId: string, start: Date, excludeId?: string): Promise<SlotNeighbor[]> {
  const dayStart = new Date(start); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(eq(b.resourceId, resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
  });
  return rows
    .filter((b) => b.id !== excludeId)
    .map((b) => ({ start: b.startAt.getTime(), end: b.endAt.getTime(), activeMin: b.activeMin, processingMin: b.processingMin }));
}

/**
 * Сървърна проверка при ЗАПИС (staff): блокът [start, end) на нов/преместен паралелен
 * час се вписва симетрично сред съседите си (заетите времена не се блъскат, заетото на
 * единия е в престоя на другия). `excludeId` — при местене/редакция на собствен час.
 */
export async function fitsParallelSlot(
  resourceId: string, start: Date, end: Date, activeMin: number, processingMin: number, excludeId?: string,
): Promise<boolean> {
  const neighbors = await dayNeighbors(resourceId, start, excludeId);
  return slotParallelFits(start.getTime(), end.getTime(), activeMin, processingMin, neighbors);
}
```

- [ ] **Step 3: Build-проверка**

Run: `npm run type-check`
Expected: грешки САМО в `slots.ts` и `staff-bookings.ts` (Task 4–5). `public-booking.ts`/`bookings.ts`/`staff/page.tsx` трябва да са чисти (старите функции са налични).

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/parallel.ts
git commit -m "feat(booking): add symmetric fitsParallelSlot (keep legacy window fns)"
```

---

## Task 4: `getDaySlots` — строи neighbors, приема processingMin

**Files:**
- Modify: `src/lib/booking/slots.ts`

- [ ] **Step 1: Обнови `getDaySlots`** (импортите + тялото). Промени горе:

```ts
import { computeDaySlots, type SlotStatus, type DaySlot } from "./compute-slots";
import type { SlotNeighbor } from "./parallel-window";
```
(Махни `import { parallelWindows } from "./parallel";`.)

- [ ] **Step 2: В сигнатурата на `getDaySlots` добави `processingMin`**

```ts
export async function getDaySlots(opts: {
  resourceId: string;
  durationMin: number;
  bufferMin: number;
  dateStr: string;
  now?: Date;
  minNoticeMin?: number;
  allowParallel?: boolean;
  activeMin?: number;
  processingMin?: number;
}): Promise<{ open: string; close: string; slots: DaySlot[] } | null> {
```

- [ ] **Step 3: Замени блока след зареждане на `busyBookings`/`busyOff`** (всичко от реда `const busy: Array<...>` до и включително `return { open: ..., close: ..., slots };` накрая на функцията — старите `busy`, `wins`, `activeMs`, `minStart`, `stepMs`, `computeDaySlots` извикване и `return`) с:

```ts
  // Съседи за паралелната проверка: реалните часове (с фази) + отпуски като
  // ПЛЪТНИ блокове (processingMin=0 → не приемат паралел).
  const neighbors: SlotNeighbor[] = [
    ...busyBookings.map((b) => ({
      start: b.startAt.getTime(),
      end: b.endAt.getTime(),
      activeMin: b.activeMin,
      processingMin: b.processingMin,
    })),
    ...busyOff.map((t) => ({
      start: t.startAt.getTime(),
      end: t.endAt.getTime(),
      activeMin: Math.max(0, Math.round((t.endAt.getTime() - t.startAt.getTime()) / 60000)),
      processingMin: 0,
    })),
  ];

  const minStart = now.getTime() + minNotice * 60000;
  const stepMs = GRANULARITY_MIN * 60000;
  // Паралелът се мери по АКТИВНОТО време; ако услугата няма активно, връщаме се
  // към целия блок (поведение както за услуги без престой).
  const activeMin = opts.activeMin && opts.activeMin > 0 ? opts.activeMin : opts.durationMin;

  const slots = computeDaySlots({
    open,
    close,
    neighbors,
    blockMs,
    activeMin,
    processingMin: opts.processingMin ?? 0,
    minStart,
    stepMs,
    allowParallel: opts.allowParallel === true,
  });

  return { open: new Date(open).toISOString(), close: new Date(close).toISOString(), slots };
}
```
(Премахни старите `const busy: Array<[number, number]> = [...]` и `const wins = ...` редове — `busy` вече не се ползва; `busyBookings`/`busyOff` остават.)

- [ ] **Step 4: Build-проверка**

Run: `npm run type-check`
Expected: грешки само в `staff-bookings.ts` (Task 5). Ако друго — поправи.

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking/slots.ts
git commit -m "feat(booking): getDaySlots builds neighbors + processingMin"
```

---

## Task 5: Записни канали — `fitsParallelSlot` в трите action-а

**Files:**
- Modify: `src/lib/actions/staff-bookings.ts`

- [ ] **Step 1: Смени импорта**

```ts
import { fitsParallelSlot } from "@/lib/booking/parallel";
```
(беше `import { fitsParallelWindow } from "@/lib/booking/parallel";`)

- [ ] **Step 2: `fetchMySlots` — подай `processingMin`**

В деструктурирането добави `processingMin`, и го подай на `getDaySlots`:

```ts
export async function fetchMySlots(serviceItemId: string, dateStr: string): Promise<DayScheduleResult> {
  const { resource } = await requireStaff();
  const { durationMin, bufferMin, activeMin, processingMin } = await ownOffering(resource.id, serviceItemId);
  const res = await getDaySlots({
    resourceId: resource.id,
    durationMin,
    bufferMin,
    activeMin,
    processingMin,
    dateStr,
    minNoticeMin: 0,
    allowParallel: true,
  });
  return res ?? { open: null, close: null, slots: [] };
}
```

- [ ] **Step 3: `createMyBooking` — замени паралелната проверка**

Замени блока:
```ts
  const activeEnd = new Date(start.getTime() + (activeMin > 0 ? activeMin : durationMin) * 60000);
  if (d.allowParallel && !(await fitsParallelWindow(resource.id, start, activeEnd))) {
    return { ok: false as const, error: "Този паралелен час не се събира в свободния престой." };
  }
```
с:
```ts
  if (d.allowParallel && !(await fitsParallelSlot(resource.id, start, end, activeMin > 0 ? activeMin : durationMin, processingMin))) {
    return { ok: false as const, error: "Този паралелен час не се събира в свободния престой." };
  }
```
(`end` вече е дефиниран по-горе като `start + (durationMin+bufferMin)`.)

- [ ] **Step 4: `rescheduleMyBooking` — замени паралелната проверка**

Замени блока:
```ts
  const activeEnd = new Date(newStart.getTime() + (booking.activeMin > 0 ? booking.activeMin * 60000 : durationMs));
  if (booking.allowParallel && !(await fitsParallelWindow(resource.id, newStart, activeEnd, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }
```
с:
```ts
  const effActive = booking.activeMin > 0 ? booking.activeMin : Math.round(durationMs / 60000);
  if (booking.allowParallel && !(await fitsParallelSlot(resource.id, newStart, newEnd, effActive, booking.processingMin, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }
```
(`newEnd` вече е дефиниран по-горе.)

- [ ] **Step 5: `editMyBooking` — замени паралелната проверка**

Замени блока:
```ts
  const activeMinE = d.activeMin ?? booking.activeMin;
  const activeEnd = new Date(start.getTime() + (activeMinE > 0 ? activeMinE : d.durationMin) * 60000);
  if (booking.allowParallel && !(await fitsParallelWindow(resource.id, start, activeEnd, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }
```
с:
```ts
  const activeMinE = d.activeMin ?? booking.activeMin;
  const procMinE = d.processingMin ?? booking.processingMin;
  if (booking.allowParallel && !(await fitsParallelSlot(resource.id, start, end, activeMinE > 0 ? activeMinE : d.durationMin, procMinE, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }
```
(`end` вече е дефиниран по-горе като `start + d.durationMin*60000`.)

- [ ] **Step 6: Тестове + build**

Run: `npm run test` (целият пакет — pure тестовете трябва зелени)
Run: `npm run type-check`
Expected: PASS, без TS грешки.

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/staff-bookings.ts
git commit -m "feat(booking): staff create/reschedule/edit use symmetric fitsParallelSlot"
```

---

## Task 6: Престой в /staff — `updateMyService` пише active/processing глобално

**Files:**
- Modify: `src/lib/actions/resource-services.ts`

- [ ] **Step 1: Разшири `updateSchema`**

```ts
const updateSchema = z.object({
  price: z.number().positive(),
  priceMax: z.number().positive().nullable().optional(),
  priceFrom: z.boolean(),
  currency: z.string().min(1),
  durationMin: z.number().int().positive(),
  bufferMin: z.number().int().min(0),
  activeMin: z.number().int().min(0).optional(),
  processingMin: z.number().int().min(0).optional(),
});
```

- [ ] **Step 2: В `updateMyService` — отдели own полетата (resource_services) от престоя (глобален service_items)**

Замени тялото на функцията (след `const d = updateSchema.parse(input);`) с:

```ts
  const { activeMin, processingMin, ...own } = d;
  const existing = await db.query.resourceServices.findFirst({
    where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.serviceItemId, serviceItemId)),
  });
  if (existing) {
    await db
      .update(schema.resourceServices)
      .set({ ...own, priceMax: own.priceMax ?? null, updatedAt: new Date() })
      .where(eq(schema.resourceServices.id, existing.id));
  } else {
    await db.insert(schema.resourceServices).values({
      id: nanoid(),
      resourceId: resource.id,
      serviceItemId,
      ...own,
      priceMax: own.priceMax ?? null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  // Престоят е характеристика на услугата (глобален) → пише се в каталога.
  if (activeMin !== undefined || processingMin !== undefined) {
    await db
      .update(schema.serviceItems)
      .set({
        ...(activeMin !== undefined ? { activeMin } : {}),
        ...(processingMin !== undefined ? { processingMin } : {}),
      })
      .where(eq(schema.serviceItems.id, serviceItemId));
  }
  revalidate();
  return { ok: true as const };
```

- [ ] **Step 3: Build-проверка**

Run: `npm run type-check`
Expected: грешка само в `my-services.tsx` ако извиква с нов аргумент (Task 7). Иначе чисто.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/resource-services.ts
git commit -m "feat(staff): updateMyService writes active/processing to catalog"
```

---

## Task 7: /staff UI — престой полета в EditSheet

**Files:**
- Modify: `src/components/staff/my-services.tsx`
- Modify: `src/app/staff/services/page.tsx`

- [ ] **Step 1: `MyServiceOpt` += престой полета** (`my-services.tsx`, в интерфейса)

След `bufferMin: number;` добави:
```ts
  activeMin: number;
  processingMin: number;
```

- [ ] **Step 2: page.tsx — подай ги** (`staff/services/page.tsx`, в обекта на `services.flatMap`)

След `bufferMin: m?.bufferMin ?? i.bufferMin,` добави:
```ts
        activeMin: i.activeMin,
        processingMin: i.processingMin,
```

- [ ] **Step 3: `EditSheet` — state + UI + запис** (`my-services.tsx`)

В `EditSheet`, след `const [durationMin, setDurationMin] = React.useState(service.durationMin);` добави:
```ts
  const [activeMin, setActiveMin] = React.useState(service.activeMin);
  const [processingMin, setProcessingMin] = React.useState(service.processingMin);
```

В `save()`, разшири извикването на `updateMyService` и `onSaved`:
```ts
      await updateMyService(service.id, {
        price,
        priceMax: priceMax === "" ? null : Number(priceMax),
        priceFrom,
        currency,
        durationMin,
        bufferMin: service.bufferMin,
        activeMin,
        processingMin,
      });
      toast.success("Запазено.");
      onSaved({ ...service, price, priceMax: priceMax === "" ? null : Number(priceMax), priceFrom, currency, durationMin, activeMin, processingMin });
```

Преди бутона `Запази` (след блока с „от" цена) добави секцията:
```tsx
        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Паралелни часове</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label>Активни (намазване) мин</Label>
              <Input type="number" min={0} step={5} value={activeMin} onChange={(e) => setActiveMin(Number(e.target.value))} className="h-11 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label>Престой (мин)</Label>
              <Input type="number" min={0} step={5} value={processingMin} onChange={(e) => setProcessingMin(Number(e.target.value))} className="h-11 text-base" />
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Престой &gt; 10 мин отваря паралелен час, докато боята действа. 0 = няма престой. Важи за всички, които предлагат услугата.
          </p>
        </div>
```

- [ ] **Step 4: Build + lint**

Run: `npm run type-check`
Expected: чисто.

- [ ] **Step 5: Commit**

```bash
git add src/components/staff/my-services.tsx src/app/staff/services/page.tsx
git commit -m "feat(staff): edit active/processing (parallel) per service in /staff"
```

---

## Task 8: Цялостна верификация

- [ ] **Step 1: Всички тестове зелени**

Run: `npm run test`
Expected: PASS (вкл. новите parallel + compute-slots).

- [ ] **Step 2: Type-check чист**

Run: `npm run type-check`
Expected: без грешки.

- [ ] **Step 3: Production build зелен** (⚠️ спри dev сървъра първо — pooler gotcha)

Run: `npm run build`
Expected: успешен build.

- [ ] **Step 4: Ръчен click-through (локално, /staff)**

1. /staff → Услуги → „Боядисване (средна коса)" → задай Активни=25, Престой=40 → Запази.
2. /staff → Нов час → „Боядисване (средна коса)" → дата с празен следобед → запиши 17:30.
3. Пак Нов час → същата услуга → същата дата → 17:00 трябва да свети „в престой" (mint) → запиши.
4. Графикът показва двата застъпени часа.

- [ ] **Step 4b: Регресия на публичната форма** (`getDaySlots` е споделена — да не е счупена)

Отвори `/zapazi-chas`, избери услуга → дата → провери, че слотовете се зареждат нормално (свободни/заети). Публичната остава block-based; новата логика е поведенчески еквивалентна за плътни услуги (processing=0).

- [ ] **Step 5: Финален commit (ако има дребни корекции)**

```bash
git add -A
git commit -m "test(booking): verify symmetric parallel end-to-end"
```

---

## Бележки за изпълнителя

- **DRY:** `slotParallelFits`/`pairFits` са единственият източник на истина — ползват се и от слот-визуализацията, и от записната валидация. Не дублирай логиката.
- **Не пипай:** `windowFor` (още се ползва вътре в `pairFits`); публичната форма `/zapazi-chas`; EXCLUDE constraint DDL; admin `service-item-form.tsx`.
- **Без DB миграция** — `service_items.activeMin/processingMin` вече съществуват.
- **Диагностични скриптове** `scripts/diag-snezhana-3006*.ts` са read-only помощници — може да се ползват за проверка след промените, после да се изтрият.
