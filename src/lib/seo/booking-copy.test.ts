import { describe, expect, it } from "vitest";
import { fillBooking, onlineItemIds, phoneOnlyCopy } from "./booking-copy";
import { SERVICE_FAQ, SERVICE_INTRO } from "@/lib/data/service-faq";
import { SERVICE_CONTENT } from "@/lib/data/service-content";
import { answerQuestion, type BotContext } from "@/lib/bot/engine";

const PHONE = "+359 898 66 33 15";
const cats = [
  { id: "c-nails", slug: "manikyur-i-pedikyur" },
  { id: "c-hair", slug: "frizorski-uslugi" },
];
const items = [
  { id: "gel", categoryId: "c-nails" },
  { id: "med", categoryId: "c-nails" },
  { id: "cut", categoryId: "c-hair" },
];
const hair = { id: "r-hair", kind: "hair" };
const hairOffers = [{ serviceItemId: "cut", resourceId: "r-hair", onlineBookable: true }];

describe("onlineItemIds (правилото на формата в /zapazi-chas)", () => {
  it("без специалист по нокти: ноктите не са онлайн, косата е", () => {
    expect([...onlineItemIds(items, cats, hairOffers, [hair])]).toEqual(["cut"]);
  });
  it("специалист по нокти с онлайн график: само услугите с включен онлайн запис", () => {
    const offers = [
      ...hairOffers,
      { serviceItemId: "gel", resourceId: "r-nails", onlineBookable: true },
      { serviceItemId: "med", resourceId: "r-nails", onlineBookable: false },
    ];
    const ids = onlineItemIds(items, cats, offers, [hair, { id: "r-nails", kind: "nails" }]);
    expect(ids.has("gel")).toBe(true);
    expect(ids.has("med")).toBe(false);
  });
  it("специалист по нокти, който приема всичко само по телефона: нищо за нокти онлайн", () => {
    const offers = [...hairOffers, { serviceItemId: "gel", resourceId: "r-nails", onlineBookable: false }];
    const ids = onlineItemIds(items, cats, offers, [hair, { id: "r-nails", kind: "nails" }]);
    expect(ids.has("gel") || ids.has("med")).toBe(false);
  });
  it("специалист без свои оферти записва по каталога (онлайн), както формата", () => {
    expect(onlineItemIds(items, cats, [], [{ id: "r-nails", kind: "nails" }]).has("gel")).toBe(true);
  });
});

describe("текстовете за ноктите (решение 43)", () => {
  const intro = SERVICE_INTRO["manikyur-i-pedikyur"].join(" ");
  const faq = SERVICE_FAQ["manikyur-i-pedikyur"].find((f) => f.question.includes("онлайн"))!.answer;
  const meta = SERVICE_CONTENT["meditsinski-pedikyur"].metaDescription;

  it("без онлайн график: «по телефона» с номера и нито дума «онлайн»", () => {
    for (const t of [intro, faq, meta]) {
      const out = fillBooking(t, false);
      expect(out).toContain(`по телефона`);
      expect(out).toContain(PHONE);
      expect(out).not.toMatch(/онлайн|zapazi-chas|\{book:/);
    }
  });
  it("с онлайн график: старият текст с връзката към записването", () => {
    expect(fillBooking(intro, true)).toContain("Час запазваш [онлайн](/zapazi-chas) или по телефона на салона: +359 898 66 33 15.");
    expect(fillBooking(faq, true)).toMatch(/^Да, през \[записването\]\(\/zapazi-chas\)\./);
    expect(fillBooking(meta, true)).toMatch(/Запази час онлайн\.$/);
  });
  it("смяната важи само за ноктите", () => {
    expect(phoneOnlyCopy("manikyur-i-pedikyur", false)).toBe(true);
    expect(phoneOnlyCopy("manikyur-i-pedikyur", true)).toBe(false);
    expect(phoneOnlyCopy("frizorski-uslugi", false)).toBe(false);
    expect(phoneOnlyCopy("kozmetika", false)).toBe(false);
  });
  it("текст без {book:…} не се пипа", () => {
    expect(fillBooking("Час запазваш онлайн.", false)).toBe("Час запазваш онлайн.");
  });
});

describe("ботът: бутонът за записване", () => {
  const ctx = (online: boolean): BotContext => ({
    services: [
      { name: "Маникюр с гел лак", price: 25, priceFrom: false, currency: "€", group: "Маникюр", categorySlug: "manikyur-i-pedikyur", categoryTitle: "Маникюр и педикюр", online },
      { name: "Балаяж (средна коса)", price: 77, priceFrom: true, currency: "€", group: "Балаяж", categorySlug: "frizorski-uslugi", categoryTitle: "Фризьорски услуги", online: true },
    ],
    faq: [],
    rentalOpen: false,
    positions: [],
  });
  it("маникюр без онлайн график: «Запази час по телефона» и номерът", () => {
    const r = answerQuestion("маникюр с гел лак", ctx(false));
    expect(r.links?.map((l) => l.label)).toContain("Запази час по телефона");
    expect(r.links?.map((l) => l.label)).not.toContain("Запази час онлайн");
    expect(r.text).toContain(PHONE);
  });
  it("маникюр с онлайн график и балаяж: онлайн бутонът както досега", () => {
    expect(answerQuestion("маникюр с гел лак", ctx(true)).links?.map((l) => l.label)).toContain("Запази час онлайн");
    expect(answerQuestion("балаяж средна коса", ctx(false)).links?.map((l) => l.label)).toContain("Запази час онлайн");
  });
});
