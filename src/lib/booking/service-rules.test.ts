import { describe, it, expect } from "vitest";
import { validateServiceTiming, validatePrice } from "./service-rules";

const ok = { durationMin: 120, bufferMin: 10, activeMin: 30, processingMin: 60 };

describe("validateServiceTiming", () => {
  it("приема валидна комбинация", () => {
    expect(validateServiceTiming(ok)).toBeNull();
    expect(validateServiceTiming({ durationMin: 30, bufferMin: 0, activeMin: 0, processingMin: 0 })).toBeNull();
  });
  it("не-кратно на 5", () => {
    expect(validateServiceTiming({ ...ok, bufferMin: 7 })).toBe("Минутите се въвеждат на стъпки от 5.");
    expect(validateServiceTiming({ ...ok, durationMin: 122 })).toBe("Минутите се въвеждат на стъпки от 5.");
  });
  it("изчистено времетраене", () => {
    expect(validateServiceTiming({ ...ok, durationMin: 0 })).toBe("Въведи минути на стъпки от 5.");
  });
  it("граници", () => {
    expect(validateServiceTiming({ ...ok, durationMin: 605 })).toMatch(/600/);
    expect(validateServiceTiming({ ...ok, bufferMin: 125 })).toMatch(/120/);
  });
  it("престой 1..10", () => {
    for (const p of [5, 10]) {
      expect(validateServiceTiming({ ...ok, activeMin: 0, processingMin: p })).toMatch(/не отваря паралелен/);
    }
    expect(validateServiceTiming({ ...ok, activeMin: 30, processingMin: 15 })).toBeNull();
  });
  it("активни без престой", () => {
    expect(validateServiceTiming({ ...ok, processingMin: 0 })).toBe("Активни минути се ползват само заедно с престой.");
  });
  it("активни + престой > времетраене", () => {
    expect(validateServiceTiming({ ...ok, durationMin: 60 })).toMatch(/най-много колкото времетраенето \(60 мин\)/);
  });
});

describe("validatePrice", () => {
  it("валидни", () => {
    expect(validatePrice(25)).toBeNull();
    expect(validatePrice(25, 40)).toBeNull();
    expect(validatePrice(25, 25)).toBeNull();
  });
  it("невалидни", () => {
    expect(validatePrice(0)).not.toBeNull();
    expect(validatePrice(5001)).not.toBeNull();
    expect(validatePrice(30, 20)).not.toBeNull();
    expect(validatePrice(NaN)).not.toBeNull();
  });
});
