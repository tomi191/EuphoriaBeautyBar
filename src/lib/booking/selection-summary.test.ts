import { describe, it, expect } from "vitest";
import { formatDurationShort, sumPriceLabel } from "./selection-summary";

const fixed = (price: number) => ({ price, priceMax: null, priceFrom: false, currency: "€" });
const from = (price: number) => ({ price, priceMax: null, priceFrom: true, currency: "€" });
const range = (price: number, priceMax: number) => ({ price, priceMax, priceFrom: false, currency: "€" });

describe("formatDurationShort", () => {
  it("formats minutes and hours like Saif's rules, number and unit kept together", () => {
    expect(formatDurationShort(30)).toBe("30\u00a0мин");
    expect(formatDurationShort(45)).toBe("45\u00a0мин");
    expect(formatDurationShort(60)).toBe("1\u00a0ч");
    expect(formatDurationShort(75)).toBe("1\u00a0ч 15\u00a0мин");
    expect(formatDurationShort(100)).toBe("1\u00a0ч 40\u00a0мин");
    expect(formatDurationShort(130)).toBe("2\u00a0ч 10\u00a0мин");
  });
});

describe("sumPriceLabel", () => {
  it("sums fixed prices exactly", () => {
    expect(sumPriceLabel([fixed(25), fixed(20)])).toBe("45 €");
  });

  it("turns the sum into „от“ when one service is „от“", () => {
    // Дамско подстригване (къса коса) 25 € + Боядисване (къса коса) от 45 €
    expect(sumPriceLabel([fixed(25), from(45)])).toBe("от 70 €");
    // + Сешоар (къса коса) от 25 €
    expect(sumPriceLabel([fixed(25), from(45), from(25)])).toBe("от 95 €");
  });

  it("reads a price range as „от“ its lower bound", () => {
    expect(sumPriceLabel([fixed(25), range(40, 60)])).toBe("от 65 €");
  });

  it("keeps cents with a decimal comma", () => {
    expect(sumPriceLabel([fixed(12.5), fixed(10)])).toBe("22,50 €");
  });
});
