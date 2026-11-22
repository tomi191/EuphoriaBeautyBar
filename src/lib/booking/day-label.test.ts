import { describe, it, expect } from "vitest";
import { addDays, humanDay, onHumanDay, capitalize, findFirstFreeDay, weekdayOf } from "./day-label";

describe("human dates", () => {
  it("formats long and short Bulgarian day labels", () => {
    expect(humanDay("2026-11-26", { currentYear: 2026 })).toBe("четвъртък, 26 ноември");
    expect(humanDay("2026-11-24", { short: true, currentYear: 2026 })).toBe("вт, 24 ноември");
  });

  it("adds the year only when it is not the current one", () => {
    expect(humanDay("2027-01-07", { currentYear: 2026 })).toBe("четвъртък, 7 януари 2027 г.");
    expect(humanDay("2027-01-07", { currentYear: 2027 })).toBe("четвъртък, 7 януари");
  });

  it("uses „във“ before вторник and „в“ before the other days", () => {
    expect(capitalize(onHumanDay("2026-11-22", 2026))).toBe("В неделя, 22 ноември");
    expect(capitalize(onHumanDay("2026-11-24", 2026))).toBe("Във вторник, 24 ноември");
    expect(onHumanDay("2026-11-25", 2026)).toBe("в сряда, 25 ноември");
  });

  it("never prints an ISO date", () => {
    expect(humanDay("2026-11-26")).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("crosses month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(weekdayOf("2026-11-22")).toBe(0);
  });
});

describe("findFirstFreeDay", () => {
  // Неделя 22.11 и понеделник 23.11: затворено; вторник 24.11: пълен ден; сряда 25.11: има място.
  const closed = new Set(["2026-11-22", "2026-11-23"]);
  const full = new Set(["2026-11-24"]);
  const hasFree = async (d: string) => !closed.has(d) && !full.has(d);

  it("skips a closed day and a full day", async () => {
    expect(await findFirstFreeDay("2026-11-22", 60, hasFree)).toBe("2026-11-25");
  });

  it("returns the start day when it already has a free slot", async () => {
    expect(await findFirstFreeDay("2026-11-25", 60, hasFree)).toBe("2026-11-25");
  });

  it("finds a day in the next month at the end of the month", async () => {
    const onlyDecember = async (d: string) => d >= "2026-12-01";
    expect(await findFirstFreeDay("2026-11-28", 60, onlyDecember)).toBe("2026-12-01");
  });

  it("returns null when nothing is free in the range and stops at the limit", async () => {
    const asked: string[] = [];
    const never = async (d: string) => {
      asked.push(d);
      return false;
    };
    expect(await findFirstFreeDay("2026-11-22", 3, never)).toBeNull();
    expect(asked).toEqual(["2026-11-22", "2026-11-23", "2026-11-24"]);
  });

  it("stops asking after the first free day", async () => {
    let calls = 0;
    await findFirstFreeDay("2026-11-22", 60, async (d) => {
      calls++;
      return d === "2026-11-23";
    });
    expect(calls).toBe(2);
  });
});
