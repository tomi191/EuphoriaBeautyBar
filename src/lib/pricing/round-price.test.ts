import { describe, expect, it } from "vitest";
import { needsRounding, roundRow, roundToHalfEuro } from "./round-price";

// Примерите от решение 28 и средата (x,25 и x,75 нагоре). Math.fround = както ги пази колоната real.
describe("roundToHalfEuro", () => {
  it.each([
    [10.23, 10],
    [7.67, 7.5],
    [51.13, 51],
    [46.02, 46],
    [12.25, 12.5],
    [12.75, 13],
    [12.74, 12.5],
    [12.76, 13],
    [25.5, 25.5],
    [30, 30],
  ])("%s → %s", (from, to) => {
    expect(roundToHalfEuro(from)).toBe(to);
    expect(roundToHalfEuro(Math.fround(from))).toBe(to);
  });
});

describe("needsRounding / roundRow", () => {
  it("цели и половинки не се пипат", () => {
    expect(needsRounding(25)).toBe(false);
    expect(needsRounding(Math.fround(25.5))).toBe(false);
    expect(needsRounding(Math.fround(10.23))).toBe(true);
    expect(roundRow({ price: 25.5, priceMax: null, currency: "€" })).toBeNull();
  });

  it("горната граница се закръглява и сама", () => {
    expect(roundRow({ price: 30, priceMax: Math.fround(45.75), currency: "€" })).toEqual({ price: 30, priceMax: 46 });
  });

  it("редове в лева не се пипат", () => {
    expect(roundRow({ price: 20.3, priceMax: null, currency: "лв" })).toBeNull();
  });
});
