import { describe, expect, it, vi } from "vitest";

// offering.ts (toEur) внася базата; тук тя не трябва.
vi.mock("@/lib/db", () => ({ db: {}, schema: {} }));

import { lowestPriceInWindow, type PriceLogEntry, type PriceState } from "./price-history";

const AT = new Date("2027-03-01T12:00:00Z");
const daysAgo = (n: number) => new Date(AT.getTime() - n * 24 * 60 * 60 * 1000);
const eur = (price: number, extra: Partial<PriceState> = {}): PriceState => ({
  price,
  priceMax: null,
  priceFrom: false,
  currency: "€",
  ...extra,
});
const e = (event: PriceLogEntry["event"], ago: number, next: PriceState): PriceLogEntry => ({
  event,
  changedAt: daysAgo(ago),
  next,
});

describe("lowestPriceInWindow: пълен дневник (над 30 дни)", () => {
  it("цена без смяна 40 дни → може намаление, предишната е сегашната", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 40, eur(30))],
      current: { ...eur(30), createdAt: daysAgo(200), updatedAt: daysAgo(100) },
    });
    expect(r).toMatchObject({ lowestEur: 30, historyComplete: true, discountAllowed: true, reason: "ok" });
  });

  it("смяна преди 31 дни → ниската в 30-те дни е новата, смяната е извън прозореца", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 60, eur(25)), e("update", 31, eur(35))],
      current: { ...eur(35), createdAt: daysAgo(200), updatedAt: daysAgo(31) },
    });
    expect(r.lowestEur).toBe(35);
    expect(r.discountAllowed).toBe(true);
  });

  it("вдигната цена в 30-те дни: най-ниската е старата, но намаление не може до 30 дни след смяната", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 60, eur(25)), e("update", 10, eur(35))],
      current: { ...eur(35), createdAt: daysAgo(200), updatedAt: daysAgo(10) },
    });
    expect(r.lowestEur).toBe(25);
    expect(r.reason).toBe("changed_recently");
    expect(r.discountAllowedFrom).toEqual(new Date(daysAgo(10).getTime() + 30 * 24 * 60 * 60 * 1000));
  });

  it("цена «от» или «X до Y» в прозореца → намаление не може", () => {
    const from = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 60, eur(40, { priceFrom: true }))],
      current: { ...eur(40, { priceFrom: true }), updatedAt: daysAgo(100) },
    });
    expect(from).toMatchObject({ discountAllowed: false, reason: "price_not_fixed", lowestEur: 40 });
    const range = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 60, eur(30, { priceMax: 45 }))],
      current: { ...eur(30, { priceMax: 45 }), updatedAt: daysAgo(100) },
    });
    expect(range.reason).toBe("price_not_fixed");
  });

  it("цена в лева се смята в евро по курса", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 60, eur(20, { currency: "лв" }))],
      current: { ...eur(20, { currency: "лв" }), updatedAt: daysAgo(100) },
    });
    expect(r.lowestEur).toBe(10.23);
  });

  it("смени след `at` не се броят", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 60, eur(30)), e("update", -5, eur(10))],
      current: { ...eur(30), updatedAt: daysAgo(60) },
    });
    expect(r).toMatchObject({ lowestEur: 30, discountAllowed: true });
  });
});

describe("lowestPriceInWindow: дневник под 30 дни (правилото по updatedAt)", () => {
  it("при специалист: updatedAt преди 45 дни, дневник от 5 дни → може", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 5, eur(30))],
      current: { ...eur(30), createdAt: daysAgo(300), updatedAt: daysAgo(45) },
    });
    expect(r).toMatchObject({ historyComplete: false, discountAllowed: true, lowestEur: 30, reason: "ok" });
  });

  it("при специалист: сменена преди 12 дни по updatedAt → не може до 30 дни след нея", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("start", 5, eur(30))],
      current: { ...eur(30), createdAt: daysAgo(300), updatedAt: daysAgo(12) },
    });
    expect(r.reason).toBe("changed_recently");
    expect(r.discountAllowedFrom).toEqual(new Date(daysAgo(12).getTime() + 30 * 24 * 60 * 60 * 1000));
  });

  it("добавена преди 3 дни → не може", () => {
    const r = lowestPriceInWindow({
      at: AT,
      entries: [e("insert", 3, eur(30))],
      current: { ...eur(30), createdAt: daysAgo(3), updatedAt: daysAgo(3) },
    });
    expect(r).toMatchObject({ reason: "changed_recently", discountAllowed: false });
  });

  it("каталожна цена (няма updatedAt) с дневник от 10 дни → чака 30 дни дневник", () => {
    const r = lowestPriceInWindow({ at: AT, entries: [e("start", 10, eur(30))], current: eur(30) });
    expect(r.reason).toBe("history_short");
    expect(r.discountAllowedFrom).toEqual(new Date(daysAgo(10).getTime() + 30 * 24 * 60 * 60 * 1000));
  });

  it("без ред и без цена → no_data", () => {
    expect(lowestPriceInWindow({ at: AT, entries: [], current: null }).reason).toBe("no_data");
  });
});
