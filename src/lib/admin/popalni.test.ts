import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {}, schema: {} }));
vi.mock("@/lib/data/tenant-consent", () => ({ adminResourceUserIds: vi.fn(), getConsentMap: vi.fn() }));

import { adminPopalni, popalniTelegram, runPopalniCron, sofiaHour, staffDots, staffPopalni, type PopalniData } from "./popalni";

const ADMIN_USER = "u-admin";

/** Всичко попълнено: Снежана (админ) и един наемател със снимка, съгласие, часове, цени. */
function full(): PopalniData {
  return {
    resources: [
      { id: "snezhana", name: "Снежана", active: true, image: null, userId: ADMIN_USER },
      { id: "elena", name: "Елена", active: true, image: "/e.jpg", userId: "u-elena" },
      { id: "old", name: "Стара", active: false, image: null, userId: null },
    ],
    adminUserIds: new Set([ADMIN_USER]),
    consent: { elena: { at: "2026-11-24T09:00:00.000Z" } },
    catalog: [{ id: "cut", name: "Подстригване", categoryId: "hair", price: 30, durationMin: 45 }],
    offers: [
      { resourceId: "elena", serviceName: "Маникюр", price: 25, durationMin: 60 },
      { resourceId: "snezhana", serviceName: "Боя", price: 60, durationMin: 90 },
    ],
    ownHours: [{ resourceId: "elena", closed: false, openTime: "10:00", closeTime: "18:00" }],
  };
}

describe("adminPopalni", () => {
  it("няма липси → празно (картата и съобщението изчезват)", () => {
    expect(adminPopalni(full())).toEqual([]);
  });

  it("неактивен специалист без нищо не е липса", () => {
    const d = full();
    d.offers.push({ resourceId: "old", serviceName: "Х", price: 0, durationMin: 0 });
    expect(adminPopalni(d)).toEqual([]);
  });

  it("наемател без снимка → ред към формата му", () => {
    const d = full();
    d.resources[1].image = null;
    const rows = adminPopalni(d);
    expect(rows.map((r) => r.key)).toEqual(["photo"]);
    expect(rows[0].title).toBe("1 специалист без снимка");
    expect(rows[0].href).toBe("/admin/resources?edit=elena");
  });

  it("Снежана без снимка и без съгласие не е липса", () => {
    const d = full();
    expect(d.resources[0].image).toBeNull();
    expect(d.consent.snezhana).toBeUndefined();
    expect(adminPopalni(d).find((r) => r.key === "photo" || r.key === "consent")).toBeUndefined();
  });

  it("наемател без писмено съгласие → ред към формата му", () => {
    const d = full();
    d.consent = {};
    const rows = adminPopalni(d);
    expect(rows.map((r) => r.key)).toEqual(["consent"]);
    expect(rows[0].href).toBe("/admin/resources?edit=elena");
  });

  it("услуга в каталога без цена → ред към редакцията на услугата", () => {
    const d = full();
    d.catalog[0].price = 0;
    const rows = adminPopalni(d);
    expect(rows.map((r) => r.key)).toEqual(["catalog"]);
    expect(rows[0].title).toBe("1 услуга без цена");
    expect(rows[0].href).toBe("/admin/services/hair?edit=cut");
  });

  it("услуга в каталога без продължителност", () => {
    const d = full();
    d.catalog[0].durationMin = 0;
    expect(adminPopalni(d)[0].title).toBe("1 услуга без продължителност");
  });

  it("услуга при специалист без цена → към «Изпълнители»; при Снежана → към приложението", () => {
    const d = full();
    d.offers[0].price = 0;
    let rows = adminPopalni(d);
    expect(rows.map((r) => r.key)).toEqual(["offers"]);
    expect(rows[0].href).toBe("/admin/resources#r-elena");
    d.offers[0].price = 25;
    d.offers[1].durationMin = 0;
    rows = adminPopalni(d);
    expect(rows[0].title).toBe("1 услуга на специалист без продължителност");
    expect(rows[0].href).toBe("/staff/services");
  });

  it("наемател без свое работно време (или само затворени дни) → ред; Снежана не", () => {
    const d = full();
    d.ownHours = [{ resourceId: "elena", closed: true, openTime: null, closeTime: null }];
    const rows = adminPopalni(d);
    expect(rows.map((r) => r.key)).toEqual(["hours"]);
    expect(rows[0].title).toBe("1 специалист без работно време");
  });

  it("броят и имената: двама и повече", () => {
    const d = full();
    d.resources.push({ id: "maria", name: "Мария", active: true, image: null, userId: "u-m" });
    d.resources[1].image = null;
    d.consent.maria = { at: "x" };
    d.ownHours.push({ resourceId: "maria", closed: false, openTime: "09:00", closeTime: "17:00" });
    const rows = adminPopalni(d);
    expect(rows[0].title).toBe("2 специалиста без снимка");
    expect(rows[0].detail).toBe("Елена и Мария стоят в «За нас» без снимка.");
  });
});

describe("staffPopalni", () => {
  it("няма липси → празно, без точки", () => {
    const rows = staffPopalni(full(), "elena");
    expect(rows).toEqual([]);
    expect(staffDots(rows)).toEqual([]);
  });

  it("само своите липси: чужда услуга без цена не се вижда", () => {
    const d = full();
    d.offers[1].price = 0; // на Снежана
    expect(staffPopalni(d, "elena")).toEqual([]);
  });

  it("своя услуга без продължителност, снимка и часове → три реда и три точки", () => {
    const d = full();
    d.offers[0].durationMin = 0;
    d.resources[1].image = null;
    d.ownHours = [];
    const rows = staffPopalni(d, "elena");
    expect(rows.map((r) => [r.title, r.href])).toEqual([
      ["Маникюр", "/staff/services"],
      ["Снимка в профила", "/staff/profile"],
      ["Работно време", "/staff/hours"],
    ]);
    expect(rows[0].detail).toBe("Няма продължителност. Попълва се в «Услуги».");
    expect(staffDots(rows).sort()).toEqual(["hours", "profile", "services"]);
  });

  it("Снежана в приложението: само услугите, без снимка и часове", () => {
    const d = full();
    expect(staffPopalni(d, "snezhana")).toEqual([]);
    d.offers[1].price = 0;
    expect(staffPopalni(d, "snezhana").map((r) => r.key)).toEqual(["service-0"]);
  });
});

describe("Telegram", () => {
  const at10 = new Date("2026-11-25T08:00:00Z"); // 10:00 в София (зимно време)
  const at10summer = new Date("2026-07-01T07:00:00Z"); // 10:00 в София (лятно време)

  it("часът в София", () => {
    expect(sofiaHour(at10)).toBe(10);
    expect(sofiaHour(at10summer)).toBe(10);
    expect(sofiaHour(new Date("2026-11-25T07:00:00Z"))).toBe(9);
    expect(sofiaHour(new Date("2026-07-01T08:00:00Z"))).toBe(11);
  });

  it("без липси не праща нищо", async () => {
    const send = vi.fn();
    const r = await runPopalniCron(at10, { load: async () => full(), send, siteUrl: "https://x.eu" });
    expect(r).toEqual({ sent: false, reason: "nothing-missing", rows: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("извън 10 ч в София не праща (второто пускане на деня)", async () => {
    const d = full();
    d.catalog[0].price = 0;
    const send = vi.fn();
    const r = await runPopalniCron(new Date("2026-11-25T07:00:00Z"), { load: async () => d, send, siteUrl: "https://x.eu" });
    expect(r.reason).toBe("not-10");
    expect(send).not.toHaveBeenCalled();
  });

  it("с липси праща едно съобщение с бутон към всяко място", async () => {
    const d = full();
    d.catalog[0].price = 0;
    d.resources[1].image = null;
    d.ownHours = [];
    const send = vi.fn(async () => true);
    const r = await runPopalniCron(at10, { load: async () => d, send, siteUrl: "https://x.eu/" });
    expect(r).toEqual({ sent: true, reason: "sent", rows: 3 });
    expect(send).toHaveBeenCalledTimes(1);
    const [text, keyboard] = send.mock.calls[0] as unknown as [string, { inline_keyboard: { text: string; url: string }[][] }];
    expect(text).toContain("<b>Какво да попълниш на сайта</b>");
    expect(text).toContain("• 1 услуга без цена");
    expect(text).toContain("• 1 специалист без снимка");
    expect(text).toContain("• 1 специалист без работно време");
    expect(keyboard.inline_keyboard.map((row) => row[0].url)).toEqual([
      "https://x.eu/admin/services/hair?edit=cut",
      "https://x.eu/admin/resources?edit=elena",
      "https://x.eu/admin/resources#r-elena",
    ]);
  });

  it("невързан админ канал → не е пратено, без грешка", async () => {
    const d = full();
    d.catalog[0].price = 0;
    const r = await runPopalniCron(at10, { load: async () => d, send: async () => false, siteUrl: "https://x.eu" });
    expect(r).toEqual({ sent: false, reason: "not-linked", rows: 1 });
  });

  it("имената в текста се пазят за HTML", () => {
    const { text } = popalniTelegram([{ key: "k", icon: "price", title: "1 услуга <b>", detail: "", place: "", href: "/a", action: "", tgLabel: "Х" }], "https://x.eu");
    expect(text).toContain("1 услуга &lt;b&gt;");
  });
});
