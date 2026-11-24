import { describe, expect, it } from "vitest";
import { decidePromo, promoDoneLine, promoNotes, promoStaffLine, promoTotals, type PromoFacts } from "./booking-promo";

const promo = (over: Partial<PromoFacts> = {}): PromoFacts => ({
  id: "c1",
  kind: "discount",
  status: "approved",
  startsOn: "2026-12-01",
  endsOn: "2026-12-12",
  slots: null,
  firstVisitOnly: false,
  gift: null,
  services: [{ serviceItemId: "kusa", newEur: 20 }],
  taken: 0,
  ...over,
});
const base = { serviceItemIds: ["kusa"], day: "2026-12-05", today: "2026-12-03", isFirstVisit: null };

describe("decidePromo", () => {
  it("в периода и записан, докато тече: важи", () => {
    const o = decidePromo({ ...base, promos: [promo()] });
    expect(o).toMatchObject({ state: "applied", campaignId: "c1", newEur: 20 });
  });

  it("денят е извън периода: редовна цена с причина", () => {
    const o = decidePromo({ ...base, day: "2026-12-16", promos: [promo()] });
    expect(o).toMatchObject({ state: "refused", reason: "out_of_range", endsOn: "2026-12-12" });
  });

  it("записан преди началото (за ден в периода): редовна цена, без ред", () => {
    const o = decidePromo({ ...base, today: "2026-11-28", promos: [promo()] });
    expect(o).toEqual({ state: "none" });
  });

  it("последният ден важи, денят след края не", () => {
    expect(decidePromo({ ...base, day: "2026-12-12", today: "2026-12-12", promos: [promo()] }).state).toBe("applied");
    expect(decidePromo({ ...base, day: "2026-12-14", today: "2026-12-13", promos: [promo()] })).toEqual({ state: "none" });
  });

  it("свършила или спряна промоция, която клиентът е видял: «приключи»", () => {
    expect(decidePromo({ ...base, today: "2026-12-13", day: "2026-12-14", promoId: "c1", promos: [promo()] })).toMatchObject({
      state: "refused",
      reason: "ended",
    });
    expect(decidePromo({ ...base, promoId: "c1", promos: [promo({ status: "stopped" })] })).toMatchObject({ reason: "ended" });
    expect(decidePromo({ ...base, promos: [promo({ status: "stopped" })] })).toEqual({ state: "none" });
  });

  it("местата: последното място важи, след него не; отказаният час е извън броя (taken го няма)", () => {
    expect(decidePromo({ ...base, promos: [promo({ slots: 4, taken: 3 })] }).state).toBe("applied");
    expect(decidePromo({ ...base, promos: [promo({ slots: 4, taken: 4 })] })).toMatchObject({ state: "refused", reason: "slots" });
  });

  it("само първо посещение: да важи, не е отказ, неизвестно (без телефон и имейл) важи", () => {
    const p = promo({ firstVisitOnly: true });
    expect(decidePromo({ ...base, isFirstVisit: true, promos: [p] }).state).toBe("applied");
    expect(decidePromo({ ...base, isFirstVisit: false, promos: [p] })).toMatchObject({ state: "refused", reason: "not_first" });
    expect(decidePromo({ ...base, isFirstVisit: null, promos: [p] }).state).toBe("applied");
  });

  it("няколко услуги: промоцията е само за своята услуга", () => {
    const o = decidePromo({ ...base, serviceItemIds: ["boya", "kusa"], promos: [promo()] });
    expect(o).toMatchObject({ state: "applied", serviceItemId: "kusa" });
    const t = promoTotals(
      [
        { serviceItemId: "boya", regularEur: 55 },
        { serviceItemId: "kusa", regularEur: 25 },
      ],
      o,
    );
    expect(t).toEqual({ totalEur: 75, regularTotalEur: 80 });
  });

  it("подарък: цената остава редовната, часът пази промоцията", () => {
    const o = decidePromo({ ...base, promos: [promo({ kind: "gift", gift: "ампула Nashi Argan", services: [{ serviceItemId: "kusa", newEur: null }] })] });
    expect(o).toMatchObject({ state: "applied", kind: "gift", gift: "ампула Nashi Argan" });
    expect(promoTotals([{ serviceItemId: "kusa", regularEur: 55 }], o)).toEqual({ totalEur: 55, regularTotalEur: 55 });
  });

  it("услуга без промоция: нищо", () => {
    expect(decidePromo({ ...base, serviceItemIds: ["boya"], promos: [promo()] })).toEqual({ state: "none" });
  });

  it("отказ при първата и важаща при втората услуга: важи втората", () => {
    const full = promo({ id: "c1", slots: 1, taken: 1 });
    const other = promo({ id: "c2", services: [{ serviceItemId: "boya", newEur: 40 }] });
    expect(decidePromo({ ...base, serviceItemIds: ["kusa", "boya"], promos: [full, other] })).toMatchObject({ state: "applied", campaignId: "c2" });
  });
});

describe("текстовете (Саиф, точка 3)", () => {
  const today = "2026-11-24";
  const applied = decidePromo({ ...base, today: "2026-12-03", promos: [promo()] });

  it("редът под цената и при няколко услуги", () => {
    expect(promoNotes(applied, { today, regularLabel: "25 €", serviceName: "Маникюр с гел лак", manyServices: false }).under).toEqual([
      "Цена по промоцията, важи до 12 декември.",
    ]);
    expect(promoNotes(applied, { today, regularLabel: "80 €", serviceName: "Маникюр с гел лак", manyServices: true }).under[1]).toBe(
      "Промоцията е за Маникюр с гел лак. Общата сума е с нея.",
    );
  });

  it("трите отказа и «приключи» стоят преди бутона с редовната цена", () => {
    const r = (reason: "out_of_range" | "slots" | "not_first" | "ended") =>
      promoNotes({ ...(applied as Extract<typeof applied, { campaignId: string }>), state: "refused", reason }, {
        today,
        regularLabel: "25 €",
        serviceName: "x",
        manyServices: false,
      }).beforeButton;
    expect(r("out_of_range")).toBe("Промоцията е за часове до 12 декември. За този ден цената е 25 €.");
    expect(r("slots")).toBe("Местата по промоцията свършиха. Цената е 25 €.");
    expect(r("not_first")).toBe("Промоцията е за първо посещение. По тези данни такова вече има, затова цената е 25 €.");
    expect(r("ended")).toBe("Промоцията приключи. Цената е 25 €.");
  });

  it("екранът, писмото и известието до специалиста", () => {
    const t = { totalEur: 20, regularTotalEur: 25 };
    expect(promoDoneLine(applied, t, "screen")).toMatch(/^Нова цена по промоцията: 20\D€ \(предишна цена 25\D€\)\. Остава в часа ти\.$/);
    expect(promoDoneLine(applied, t, "email")).toMatch(/Тя остава записана в часа ти, дори промоцията да спре\.$/);
    expect(promoStaffLine(applied, "Маникюр с гел лак", "четвъртък, 26 ноември, 10:00", 20)).toMatch(
      /^Нов час по промоцията „Маникюр с гел лак“: четвъртък, 26 ноември, 10:00, нова цена 20\D€\.$/,
    );
    expect(promoDoneLine({ state: "none" }, t, "screen")).toBeNull();
    // Част 4, 5а: «само първо посещение» се решава при записа; ако не е първо, редът казва редовната цена.
    if (applied.state === "none") throw new Error("очаква се промоция");
    const notFirst = { ...applied, state: "refused" as const, reason: "not_first" as const };
    expect(promoDoneLine(notFirst, { totalEur: 25, regularTotalEur: 25 }, "email")).toMatch(
      /^Цената е 25.€\. Промоцията е само за първо посещение, затова цената е редовната\.$/,
    );
    expect(promoDoneLine({ ...notFirst, reason: "slots" as const }, { totalEur: 25, regularTotalEur: 25 }, "screen")).toBeNull();
  });
});
