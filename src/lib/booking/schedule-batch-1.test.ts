/**
 * Решение 4, първа партида: една пауза при няколко услуги, престоят остава, само :00 и :30 онлайн,
 * «веднага след предишния». Само сметката (без база); пътят през базата е в schedule-batch-1.proba.test.ts.
 */
import { describe, it, expect } from "vitest";
import { combineServices } from "./selection-summary";
import { computeDaySlots, roundStartsOnly, startsAfterBookings, type DaySlot } from "./compute-slots";
import type { SlotNeighbor } from "./parallel-window";

const H = (hhmm: string) => Date.UTC(2026, 10, 27, +hhmm.slice(0, 2), +hhmm.slice(3));
const iso = (hhmm: string) => new Date(H(hhmm)).toISOString();
const MIN = 60000;

const cut = { durationMin: 30, bufferMin: 10, activeMin: 0, processingMin: 0 };
const botox = { durationMin: 60, bufferMin: 15, activeMin: 0, processingMin: 0 };
const color = { durationMin: 120, bufferMin: 10, activeMin: 30, processingMin: 45 };

describe("една пауза при няколко услуги", () => {
  it("времето е сборът, паузата е една и е най-дългата", () => {
    expect(combineServices([botox, cut])).toMatchObject({ durationMin: 90, bufferMin: 15 });
    expect(combineServices([cut, cut, cut])).toMatchObject({ durationMin: 90, bufferMin: 10 });
    expect(combineServices([cut])).toMatchObject({ durationMin: 30, bufferMin: 10 });
  });

  it("блокът е с 25 мин по-къс от стария сбор на паузите и последният час на деня се връща", () => {
    const combo = combineServices([botox, cut, cut]); // 120 мин работа, пауза 15 (беше 15+10+10)
    const old = (120 + 35) * MIN;
    const now = (combo.durationMin + combo.bufferMin) * MIN;
    expect(now).toBe(135 * MIN);
    const base = { open: H("07:00"), close: H("17:00"), neighbors: [], activeMin: 120, processingMin: 0, minStart: H("07:00"), stepMs: 15 * MIN, allowParallel: false };
    const before = computeDaySlots({ ...base, blockMs: old }).map((s) => s.start);
    const after = computeDaySlots({ ...base, blockMs: now }).map((s) => s.start);
    expect(after).toEqual(expect.arrayContaining(before)); // нищо свободно не изчезва
    expect(before).not.toContain(iso("14:45"));
    expect(after).toContain(iso("14:45")); // 14:45 + 2 ч 15 мин = 17:00
  });
});

describe("престоят остава при няколко услуги", () => {
  it("услугата с престой дава фазите; услугите преди нея влизат в активното време", () => {
    expect(combineServices([color, cut])).toEqual({ durationMin: 150, bufferMin: 10, activeMin: 30, processingMin: 45 });
    expect(combineServices([cut, color])).toEqual({ durationMin: 150, bufferMin: 10, activeMin: 60, processingMin: 45 });
    expect(combineServices([cut, botox])).toEqual({ durationMin: 90, bufferMin: 15, activeMin: 0, processingMin: 0 });
  });

  it("в престоя на боядисване + подстригване се записва друг клиент (кратка услуга)", () => {
    const c = combineServices([color, cut]); // 13:00, работа 150, пауза 10 → до 15:40
    const host: SlotNeighbor = { start: H("13:00"), end: H("13:00") + (c.durationMin + c.bufferMin) * MIN, activeMin: c.activeMin, processingMin: c.processingMin };
    const slots = computeDaySlots({
      open: H("09:00"), close: H("19:00"), neighbors: [host], blockMs: 25 * MIN, activeMin: 25, processingMin: 0,
      minStart: H("09:00"), stepMs: 15 * MIN, allowParallel: true,
    });
    const status = (t: string) => slots.find((s) => s.start === iso(t))?.status;
    expect(status("13:35")).toBe("parallel"); // престоят 13:30–14:15, с 5 мин отстояние от двете страни
    expect(status("13:45")).toBe("parallel");
    expect(status("13:15")).toBe("busy"); // нанасянето
    expect(status("14:00")).toBe("busy"); // не се събира до края на престоя
  });

  it("старият запис на комбинацията (без фази) е плътен и не приема никого", () => {
    const host: SlotNeighbor = { start: H("13:00"), end: H("15:40"), activeMin: 0, processingMin: 0 };
    const slots = computeDaySlots({
      open: H("09:00"), close: H("19:00"), neighbors: [host], blockMs: 25 * MIN, activeMin: 25, processingMin: 0,
      minStart: H("09:00"), stepMs: 15 * MIN, allowParallel: true,
    });
    expect(slots.some((s) => s.status === "parallel")).toBe(false);
  });
});

describe(":00 и :30 онлайн", () => {
  const day: DaySlot[] = ["09:00", "09:15", "09:30", "09:45", "13:35", "14:00"].map((t) => ({ start: iso(t), status: "free" as const }));
  it("включено: само :00 и :30, и паралелните извън тях отпадат", () => {
    expect(roundStartsOnly(day).map((s) => s.start)).toEqual([iso("09:00"), iso("09:30"), iso("14:00")]);
  });
  it("изключено: графикът е същият (функцията не се вика)", () => {
    expect(day).toHaveLength(6);
  });
  it("в зимно и лятно време минутата на стената е минутата в UTC", () => {
    const summer = { start: new Date(Date.UTC(2026, 6, 1, 7, 30)).toISOString(), status: "free" as const }; // 10:30 в София
    const winter = { start: new Date(Date.UTC(2026, 0, 15, 8, 15)).toISOString(), status: "free" as const }; // 10:15 в София
    expect(roundStartsOnly([summer, winter])).toEqual([summer]);
  });
});

describe("веднага след предишния", () => {
  const n = (s: string, e: string): SlotNeighbor => ({ start: H(s), end: H(e), activeMin: 0, processingMin: 0 });
  const base = { open: H("09:00"), close: H("19:00"), minStart: H("09:00") };

  it("началото е краят на часа (с паузата), където услугата се събира", () => {
    const neighbors = [n("11:00", "11:40"), n("13:00", "15:10"), n("16:05", "16:45")];
    const r = startsAfterBookings({ ...base, ends: neighbors.map((x) => x.end), neighbors, blockMs: 40 * MIN });
    expect(r).toEqual([iso("11:40"), iso("15:10"), iso("16:45")]);
  });

  it("не предлага край, след който услугата се блъска в следващия час, излиза от деня или е минал", () => {
    const neighbors = [n("11:00", "11:40"), n("12:00", "12:30"), n("18:00", "18:40")];
    const ends = neighbors.map((x) => x.end);
    expect(startsAfterBookings({ ...base, ends, neighbors, blockMs: 40 * MIN })).toEqual([iso("12:30")]);
    expect(startsAfterBookings({ ...base, minStart: H("12:31"), ends, neighbors, blockMs: 20 * MIN })).toEqual([iso("18:40")]);
  });
});
