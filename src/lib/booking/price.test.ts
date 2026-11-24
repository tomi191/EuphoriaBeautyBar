import { describe, it, expect } from "vitest";
import { formatAmount, formatEuro, formatServicePrice } from "./price";

describe("formatEuro", () => {
  it("shows a Bulgarian price: decimal comma with cents, whole number without", () => {
    expect(formatEuro(7.5)).toBe("7,50 €");
    expect(formatEuro(13)).toBe("13 €");
    expect(formatEuro(0.5)).toBe("0,50 €");
    expect(formatEuro(61.5)).toBe("61,50 €");
  });

  it("never shows a dot", () => {
    for (const v of [7.5, 30.5, 10.23, 0.5, 199.99]) expect(formatEuro(v)).not.toContain(".");
  });
});

describe("formatServicePrice uses the same amount", () => {
  it("fixed, from and range", () => {
    expect(formatServicePrice({ price: 7.5, priceMax: null, priceFrom: false, currency: "€" })).toBe("7,50 €");
    expect(formatServicePrice({ price: 30.5, priceMax: null, priceFrom: true, currency: "€" })).toBe("от 30,50 €");
    expect(formatServicePrice({ price: 36, priceMax: 40, priceFrom: false, currency: "€" })).toBe("36–40 €");
    // как го показва ценоразписът: «от» и пред интервала
    expect(formatServicePrice({ price: 5, priceMax: 7, priceFrom: true, currency: "€" })).toBe("от 5–7 €");
    expect(formatAmount(13)).toBe("13");
  });
});
