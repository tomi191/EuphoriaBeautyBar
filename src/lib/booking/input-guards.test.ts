import { describe, it, expect } from "vitest";
import { isValidDateStr, isValidTimeStr, isOutsideHours, isNarrowed, conflictMessage } from "./input-guards";

describe("input-guards", () => {
  it("validates real dates and times", () => {
    expect(isValidDateStr("2026-10-15")).toBe(true);
    expect(isValidDateStr("2026-02-30")).toBe(false);
    expect(isValidDateStr("2026-13-01")).toBe(false);
    expect(isValidDateStr("15.10.2026")).toBe(false);
    expect(isValidTimeStr("09:30")).toBe(true);
    expect(isValidTimeStr("24:00")).toBe(false);
    expect(isValidTimeStr("9:30")).toBe(false);
  });
  it("detects bookings outside hours", () => {
    const h = { closed: false, openTime: "09:00", closeTime: "18:00" };
    expect(isOutsideHours("10:00", "11:00", h)).toBe(false);
    expect(isOutsideHours("08:30", "09:30", h)).toBe(true);
    expect(isOutsideHours("17:30", "18:30", h)).toBe(true);
    expect(isOutsideHours("10:00", "11:00", { closed: true, openTime: null, closeTime: null })).toBe(true);
  });
  it("detects narrowing", () => {
    const a = { closed: false, openTime: "09:00", closeTime: "18:00" };
    expect(isNarrowed(a, { ...a, closeTime: "17:00" })).toBe(true);
    expect(isNarrowed(a, { ...a, closeTime: "19:00" })).toBe(false);
    expect(isNarrowed(a, { closed: true, openTime: null, closeTime: null })).toBe(true);
    expect(isNarrowed({ closed: true, openTime: null, closeTime: null }, a)).toBe(false);
  });
  it("pluralises the conflict message", () => {
    expect(conflictMessage(3)).toContain("3 записани часа");
  });
});
