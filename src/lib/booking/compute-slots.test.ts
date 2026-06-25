import { describe, it, expect } from "vitest";
import { computeDaySlots } from "./compute-slots";

const H = (hhmm: string) => Date.UTC(2026, 5, 25, +hhmm.slice(0, 2), +hhmm.slice(3)); // "09:00" → ms
const STEP = 15 * 60000;

describe("computeDaySlots", () => {
  const base = {
    open: H("09:00"),
    close: H("19:00"),
    busy: [] as Array<[number, number]>,
    wins: [] as Array<{ start: number; end: number }>,
    blockMs: 30 * 60000,
    activeMs: 30 * 60000,
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
    const slots = computeDaySlots({ ...base, busy: [[H("10:00"), H("11:00")]] });
    expect(slots.find((s) => s.start === new Date(H("10:00")).toISOString())!.status).toBe("busy");
  });

  it("НЕ показва паралел когато allowParallel=false", () => {
    const slots = computeDaySlots({
      ...base,
      busy: [[H("10:00"), H("12:00")]],
      wins: [{ start: H("10:00"), end: H("12:00") }],
    });
    expect(slots.find((s) => s.start === new Date(H("10:30")).toISOString())!.status).toBe("busy");
  });

  it("паралел по АКТИВНО време: дълъг блок се вмъква ако активното се събира в прозореца", () => {
    // host боя 10:00-11:30 busy; прозорец 10:30-11:15; втора услуга blockMs=90 (overflow), activeMs=25
    const slots = computeDaySlots({
      ...base,
      busy: [[H("10:00"), H("11:30")]],
      wins: [{ start: H("10:30"), end: H("11:15") }],
      blockMs: 90 * 60000,
      activeMs: 25 * 60000,
      allowParallel: true,
    });
    // 10:30: активното 10:30-10:55 е в прозореца 10:30-11:15 → parallel (макар блокът да излиза)
    expect(slots.find((s) => s.start === new Date(H("10:30")).toISOString())!.status).toBe("parallel");
    // 11:00: активното 11:00-11:25 излиза от прозореца (11:15) → busy
    expect(slots.find((s) => s.start === new Date(H("11:00")).toISOString())!.status).toBe("busy");
  });

  it("пропуска слотове, чийто блок излиза извън работното време и не са паралел", () => {
    // близо до края: activeMs се събира, blockMs не → не се показва (както досега)
    const slots = computeDaySlots({ ...base, blockMs: 60 * 60000, activeMs: 20 * 60000, open: H("18:30") });
    // 18:30: block до 19:30 > close, не паралел → пропуснат
    expect(slots.find((s) => s.start === new Date(H("18:30")).toISOString())).toBeUndefined();
  });
});
