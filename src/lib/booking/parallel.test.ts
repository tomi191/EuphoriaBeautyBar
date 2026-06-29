import { describe, it, expect } from "vitest";
import { windowFor, PARALLEL_SAFETY_MIN, pairFits, slotParallelFits, type SlotNeighbor } from "./parallel-window";

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
    // стрижка 18:00 (active=20, proc=0, блок 25) се събира в престоя на боя 17:30 (windowFor=[18:00,18:30])
    const ok = pairFits(
      M("18:00"), block("18:00", 25), 20, 0,
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
