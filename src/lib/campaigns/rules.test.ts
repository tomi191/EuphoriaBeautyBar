import { describe, expect, it } from "vitest";
import {
  addDays,
  campaignPhase,
  checkCampaign,
  discountRanUntil,
  displayPercent,
  isOpen,
  priceBounds,
  priceFromPercent,
  whoLabel,
  type CampaignInput,
  type CheckContext,
  type ServiceFacts,
} from "./rules";

const TODAY = "2026-11-24";
const svc = (over: Partial<ServiceFacts> = {}): ServiceFacts => ({
  serviceItemId: "gel",
  name: "Маникюр с гел лак",
  offered: true,
  onlineBookable: true,
  priceEur: 25,
  priceFrom: false,
  priceMax: null,
  openCampaignUntil: null,
  lastDiscountRanUntil: null,
  lowest: { lowestEur: 25, discountAllowed: true, discountAllowedFrom: null, reason: "ok", lastChangeOn: null, createdOn: "2026-01-10" },
  lastRaiseOn: null,
  ...over,
});
const input = (over: Partial<CampaignInput> = {}): CampaignInput => ({
  kind: "discount",
  serviceItemIds: ["gel"],
  newPrices: { gel: 20 },
  gift: null,
  reason: "Запознай се с мен преди празниците.",
  startsOn: "2026-12-01",
  endsOn: "2026-12-15",
  slots: 4,
  firstVisitOnly: false,
  ...over,
});
const ctx = (over: Partial<CheckContext> = {}, s: ServiceFacts[] = [svc()]): CheckContext => ({
  today: TODAY,
  services: s,
  pendingCount: 0,
  activeCount: 0,
  hasWorkDay: true,
  ...over,
});
const texts = (i: CampaignInput, c: CheckContext) => checkCampaign(i, c).map((p) => p.text);

describe("checkCampaign: минава", () => {
  it("намаление 25 → 20 € (−20%), 15 дни, 4 места", () => {
    expect(checkCampaign(input(), ctx())).toEqual([]);
  });
  it("подарък с думи", () => {
    expect(checkCampaign(input({ kind: "gift", newPrices: {}, gift: "парафинова терапия" }), ctx())).toEqual([]);
  });
});

describe("процентът от 10 до 30 (решение 24)", () => {
  it("−32% и −8% не минават, с точния текст на Саиф", () => {
    expect(texts(input({ newPrices: { gel: 17 } }), ctx())).toEqual(["За 25 € новата цена е от 17,50 € до 22,50 €."]);
    expect(texts(input({ newPrices: { gel: 23 } }), ctx())).toEqual(["За 25 € новата цена е от 17,50 € до 22,50 €."]);
  });
  it("точно −30% и −10% минават", () => {
    expect(checkCampaign(input({ newPrices: { gel: 17.5 } }), ctx())).toEqual([]);
    expect(checkCampaign(input({ newPrices: { gel: 22.5 } }), ctx())).toEqual([]);
  });
  it("процентът на картата е закръглен надолу; цената от процент", () => {
    expect(displayPercent(25, 20)).toBe(20);
    expect(displayPercent(35, 28)).toBe(20);
    expect(displayPercent(30, 23.5)).toBe(21); // 21,67 → 21
    expect(priceFromPercent(25, 20)).toBe(20);
    expect(priceBounds(25)).toEqual({ min: 17.5, max: 22.5 });
  });
  it("предишната цена е най-ниската от дневника, не сегашната", () => {
    // Сега 30 €, най-ниската за 30 дни 25 €: границите са от 25.
    const s = svc({ priceEur: 30, lowest: { ...svc().lowest, lowestEur: 25 } });
    expect(texts(input({ newPrices: { gel: 24 } }), ctx({}, [s]))).toEqual(["За 25 € новата цена е от 17,50 € до 22,50 €."]);
    expect(checkCampaign(input({ newPrices: { gel: 20 } }), ctx({}, [s]))).toEqual([]);
  });
});

describe("датите: от 1 до 30 дни, поне един работен ден, без минало", () => {
  it("31 дни не минават, с последната позволена дата", () => {
    expect(texts(input({ startsOn: "2026-12-01", endsOn: "2026-12-31" }), ctx())).toEqual([
      "Промоцията е най-много 30 дни. Последната дата е 30.12.",
    ]);
  });
  it("точно 30 дни и 1 ден минават", () => {
    expect(checkCampaign(input({ startsOn: "2026-12-01", endsOn: "2026-12-30" }), ctx())).toEqual([]);
    expect(checkCampaign(input({ startsOn: "2026-12-01", endsOn: "2026-12-01" }), ctx())).toEqual([]);
  });
  it("краят преди началото", () => {
    expect(texts(input({ startsOn: "2026-12-10", endsOn: "2026-12-05" }), ctx())).toEqual(["Краят трябва да е след началото."]);
  });
  it("без работен ден", () => {
    expect(texts(input(), ctx({ hasWorkDay: false }))).toEqual([
      "В тези дати не работиш. Избери ден, в който приемаш часове.",
    ]);
  });
  it("начало в миналото не може; при одобрение може (тръгва веднага), но не и след края", () => {
    expect(texts(input({ startsOn: "2026-11-20", endsOn: "2026-11-30" }), ctx())).toEqual([
      "Началото не може да е в миналото.",
    ]);
    expect(checkCampaign(input({ startsOn: "2026-11-20", endsOn: "2026-11-30" }), ctx({ forApproval: true }))).toEqual([]);
    expect(texts(input({ startsOn: "2026-11-10", endsOn: "2026-11-20" }), ctx({ forApproval: true }))).toEqual([
      "Срокът на промоцията мина.",
    ]);
  });
});

describe("намаление само при точна цена", () => {
  it("цена «от» → само подарък", () => {
    const p = checkCampaign(input(), ctx({}, [svc({ priceFrom: true })]));
    expect(p).toMatchObject([
      { text: "Цената е „от“, затова крайната сума не е известна. За тази услуга има само подарък.", giftOk: true },
    ]);
  });
  it("цена «X до Y» → само подарък; подаръкът при «от» минава", () => {
    expect(texts(input(), ctx({}, [svc({ priceMax: 35 })]))).toHaveLength(1);
    expect(checkCampaign(input({ kind: "gift", gift: "ампула Nashi Argan" }), ctx({}, [svc({ priceFrom: true })]))).toEqual([]);
  });
});

describe("смяна на цената и дневникът", () => {
  it("дневникът не покрива 30 дни: текстът с дните и датата, подарък може сега", () => {
    const s = svc({
      lowest: { lowestEur: 30, discountAllowed: false, discountAllowedFrom: "2026-12-12", reason: "changed_recently", lastChangeOn: "2026-11-12", createdOn: "2025-05-01" },
    });
    const p = checkCampaign(input(), ctx({}, [s]));
    expect(p).toMatchObject([
      { text: "Цената е сменена преди 12 дни. Намаление може от 12.12, подарък може сега.", from: "2026-12-12", giftOk: true },
    ]);
    expect(checkCampaign(input({ kind: "gift", gift: "оформяне вежди" }), ctx({}, [s]))).toEqual([]);
  });
  it("нова услуга (добавена в последните 30 дни)", () => {
    const s = svc({
      lowest: { lowestEur: 30, discountAllowed: false, discountAllowedFrom: "2026-12-12", reason: "changed_recently", lastChangeOn: "2026-11-12", createdOn: "2026-11-12" },
    });
    expect(texts(input(), ctx({}, [s]))).toEqual(["Услугата е добавена преди 12 дни. Намаление може от 12.12, подарък може сега."]);
  });
  it("1 ден", () => {
    const s = svc({
      lowest: { lowestEur: 30, discountAllowed: false, discountAllowedFrom: "2026-12-23", reason: "changed_recently", lastChangeOn: "2026-11-23", createdOn: "2025-05-01" },
    });
    expect(texts(input(), ctx({}, [s]))[0]).toBe("Цената е сменена преди 1 ден. Намаление може от 23.12, подарък може сега.");
  });
});

describe("подарък само при цена, която не е вдигана 30 дни", () => {
  it("вдигната преди 12 дни → подарък от датата", () => {
    expect(texts(input({ kind: "gift", gift: "оформяне вежди" }), ctx({}, [svc({ lastRaiseOn: "2026-11-12" })]))).toEqual([
      "Цената е вдигната преди 12 дни. Подарък може от 13.12.",
    ]);
  });
  it("подарък, който започва след 30-те дни, минава", () => {
    expect(
      checkCampaign(input({ kind: "gift", gift: "оформяне вежди", startsOn: "2026-12-13", endsOn: "2026-12-20" }), ctx({}, [svc({ lastRaiseOn: "2026-11-12" })])),
    ).toEqual([]);
  });
  it("без сума, «на стойност», «безплатно»; до 40 знака", () => {
    const g = (gift: string) => texts(input({ kind: "gift", gift }), ctx());
    expect(g("ампула на стойност 10 €")).toEqual(["Подаръкът се описва с думи: без сума, без „на стойност“ и без „безплатно“."]);
    expect(g("безплатна маска")).toHaveLength(1);
    expect(g("маска за 5 лв")).toHaveLength(1);
    expect(g("а".repeat(41))).toEqual(["Подаръкът е до 40 знака."]);
    expect(g("2 ампули Nashi Argan")).toEqual([]);
  });
});

describe("една промоция на услуга и 30 дни пауза между намаления", () => {
  it("друга отворена промоция на услугата", () => {
    expect(texts(input(), ctx({}, [svc({ openCampaignUntil: "2026-12-15" })]))).toContain("Тази услуга вече има промоция до 15.12.");
  });
  it("намаление, текло до 20.11 → следващо от 21.12; подарък може сега", () => {
    const s = svc({ lastDiscountRanUntil: "2026-11-20" });
    expect(checkCampaign(input(), ctx({}, [s]))).toMatchObject([
      { text: "Между две намаления на една услуга минават 30 дни. Следващо: от 21.12. Подарък може сега.", from: "2026-12-21" },
    ]);
    expect(checkCampaign(input({ startsOn: "2026-12-21", endsOn: "2026-12-25" }), ctx({}, [s]))).toEqual([]);
    expect(checkCampaign(input({ kind: "gift", gift: "оформяне вежди" }), ctx({}, [s]))).toEqual([]);
  });
  it("discountRanUntil: текла, спряна докато тече, спряна преди началото, подарък", () => {
    const base = { kind: "discount" as const, startsOn: "2026-11-01", endsOn: "2026-11-15" };
    expect(discountRanUntil({ ...base, status: "approved" }, TODAY)).toBe("2026-11-15");
    expect(discountRanUntil({ ...base, status: "approved", endsOn: "2026-11-30" }, TODAY)).toBe(TODAY);
    expect(discountRanUntil({ ...base, status: "approved", startsOn: "2026-12-01", endsOn: "2026-12-05" }, TODAY)).toBeNull();
    expect(discountRanUntil({ ...base, status: "stopped", stoppedOn: "2026-11-05" }, TODAY)).toBe("2026-11-05");
    expect(discountRanUntil({ ...base, status: "stopped", stoppedOn: "2026-10-30" }, TODAY)).toBeNull();
    expect(discountRanUntil({ ...base, kind: "gift", status: "approved" }, TODAY)).toBeNull();
  });
});

describe("лимитите на специалиста: 2 чакащи и 2 одобрени или течащи", () => {
  it("третата чакаща и третата одобрена не минават", () => {
    expect(texts(input(), ctx({ pendingCount: 2 }))).toEqual(["Имаш 2 промоции, които чакат одобрение. Изчакай отговор."]);
    expect(texts(input(), ctx({ activeCount: 2 }))).toEqual(["Имаш 2 одобрени или течащи промоции. Спри една, за да пуснеш нова."]);
    expect(checkCampaign(input(), ctx({ pendingCount: 1, activeCount: 1 }))).toEqual([]);
  });
  it("при одобрение лимитите не се броят наново", () => {
    expect(checkCampaign(input(), ctx({ pendingCount: 2, activeCount: 2, forApproval: true }))).toEqual([]);
  });
});

describe("услугите", () => {
  it("без онлайн запис; не е негова; повече от 5", () => {
    expect(texts(input(), ctx({}, [svc({ onlineBookable: false })]))).toContain(
      "Услугата е без онлайн запис. Включи го от «Услуги», за да я добавиш.",
    );
    expect(texts(input(), ctx({}, [svc({ offered: false })]))).toEqual(["Услугата не е сред твоите."]);
    const many = ["a", "b", "c", "d", "e", "f"];
    expect(texts(input({ kind: "gift", gift: "маска", serviceItemIds: many }), ctx({}, many.map((id) => svc({ serviceItemId: id }))))).toEqual([
      "Най-много 5 услуги в една промоция.",
    ]);
  });
});

describe("статусът по дата (без крон)", () => {
  const c = (status: "pending" | "returned" | "approved" | "stopped") => ({ status, startsOn: "2026-12-01", endsOn: "2026-12-15" });
  it("одобрена: предстои → тече → свършила; чакаща след края → изтекла", () => {
    expect(campaignPhase(c("approved"), "2026-11-30")).toBe("upcoming");
    expect(campaignPhase(c("approved"), "2026-12-01")).toBe("running");
    expect(campaignPhase(c("approved"), "2026-12-15")).toBe("running");
    expect(campaignPhase(c("approved"), "2026-12-16")).toBe("ended");
    expect(campaignPhase(c("pending"), "2026-12-15")).toBe("pending");
    expect(campaignPhase(c("pending"), "2026-12-16")).toBe("expired");
    expect(campaignPhase(c("stopped"), "2026-12-05")).toBe("stopped");
    expect(campaignPhase(c("returned"), "2026-12-05")).toBe("returned");
  });
  it("заключва цената: чакаща и одобрена до края; върната и спряна не", () => {
    expect(isOpen(c("pending"), "2026-12-15")).toBe(true);
    expect(isOpen(c("approved"), "2026-12-16")).toBe(false);
    expect(isOpen(c("returned"), "2026-12-05")).toBe(false);
    expect(isOpen(c("stopped"), "2026-12-05")).toBe(false);
  });
  it("addDays през края на годината", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("«при кого» (решения 9 и 21)", () => {
  it("Снежана с име; наемател със съгласие с първо име; без съгласие по занаят", () => {
    expect(whoLabel({ name: "Снежана Саблева", kind: "hair", isOwner: true, hasConsent: false })).toBe("при Снежана");
    expect(whoLabel({ name: "Виолета Иванова", kind: "nails", isOwner: false, hasConsent: true })).toBe("при Виолета");
    expect(whoLabel({ name: "Виолета Иванова", kind: "nails", isOwner: false, hasConsent: false })).toBe("при специалиста по маникюр");
    expect(whoLabel({ name: "Х", kind: "cosmetics", isOwner: false, hasConsent: false })).toBe("при специалиста по козметика");
  });
});
