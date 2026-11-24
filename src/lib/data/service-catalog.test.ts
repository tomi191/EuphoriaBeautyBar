import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { publicPricesByItem } from "./service-catalog";

const cats = [
  { id: "c-hair", slug: "frizorski-terapii" },
  { id: "c-cos", slug: "kozmetika" },
];
const item = (id: string, categoryId: string, price: number) => ({ id, categoryId, price, priceMax: null, priceFrom: false });
const offer = (serviceItemId: string, resourceId: string, price: number) => ({ serviceItemId, resourceId, price, priceMax: null, priceFrom: false });

describe("publicPricesByItem (the price list price, also used by the booking search)", () => {
  it("one specialist with an own price: that price, not the catalog one", () => {
    const prices = publicPricesByItem([item("lam", "c-cos", 36)], cats, [offer("lam", "r1", 40)], [{ id: "r1", kind: "cosmetics" }]);
    expect(prices.get("lam")).toEqual({ price: 40, priceMax: null, priceFrom: false });
  });

  it("several specialists: range across them, like the price list", () => {
    const prices = publicPricesByItem(
      [item("lam", "c-cos", 36)],
      cats,
      [offer("lam", "r1", 40), offer("lam", "r2", 45)],
      [{ id: "r1", kind: "cosmetics" }, { id: "r2", kind: "cosmetics" }],
    );
    expect(prices.get("lam")).toEqual({ price: 40, priceMax: 45, priceFrom: false });
  });

  it("a specialist without own list charges the catalog price, so it counts", () => {
    const prices = publicPricesByItem(
      [item("lam", "c-cos", 36), item("x", "c-cos", 10)],
      cats,
      [offer("x", "r1", 12)],
      [{ id: "r1", kind: "cosmetics" }, { id: "r2", kind: "cosmetics" }],
    );
    expect(prices.get("x")).toEqual({ price: 10, priceMax: 12, priceFrom: false });
    expect(prices.get("lam")).toEqual({ price: 36, priceMax: null, priceFrom: false });
  });

  it("offers of a specialist who is not ready or not active are ignored", () => {
    const prices = publicPricesByItem([item("w", "c-hair", 7.5)], cats, [offer("w", "gone", 9)], [{ id: "r1", kind: "hair" }]);
    expect(prices.get("w")).toEqual({ price: 7.5, priceMax: null, priceFrom: false });
  });
});
