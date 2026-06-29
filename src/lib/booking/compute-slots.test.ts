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
    // боя 10:00 (active=25, proc=40 → престой 10:30-11:00); нова услуга active=20, proc=0, блок 25
    const neighbors: SlotNeighbor[] = [{ start: H("10:00"), end: H("10:00") + 100 * 60000, activeMin: 25, processingMin: 40 }];
    const slots = computeDaySlots({
      ...base, neighbors, blockMs: 25 * 60000, activeMin: 20, processingMin: 0, allowParallel: true,
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

  it("SNAP: добавя слот в началото на тесен престой прозорец (извън 15-мин мрежа)", () => {
    // боя 10:00 (active=15, proc=40 → престой [10:20, 10:50]); кратка услуга блок=25, active=20, proc=0
    const neighbors: SlotNeighbor[] = [{ start: H("10:00"), end: H("10:00") + 100 * 60000, activeMin: 15, processingMin: 40 }];
    const slots = computeDaySlots({
      ...base, neighbors, blockMs: 25 * 60000, activeMin: 20, processingMin: 0, allowParallel: true,
    });
    // 10:20 НЕ е на 15-мин мрежата (09:00,…,10:15,10:30), но престоят започва точно там → snap, parallel
    const at1020 = slots.find((s) => s.start === new Date(H("10:20")).toISOString());
    expect(at1020?.status).toBe("parallel");
    // слотовете остават сортирани по време след вмъкване на snap-а
    const times = slots.map((s) => s.start);
    expect(times).toEqual([...times].sort());
  });
});
