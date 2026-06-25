import { describe, it, expect } from "vitest";
import { windowFor, PARALLEL_SAFETY_MIN } from "./parallel-window";

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
