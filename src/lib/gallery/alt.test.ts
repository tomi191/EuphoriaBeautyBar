import { describe, expect, it } from "vitest";
import { ALT_MAX, buildGalleryAlt, cleanServiceName, cleanStaffNote } from "./alt";

// Датата на часа в примерите на Саиф: 21 ноември (текущата година).
const DATE = new Date("2026-11-21T12:00:00Z");
const NOW = new Date("2026-11-22T10:00:00Z");

describe("описанието (alt) по правилото на Саиф", () => {
  it.each([
    ["Гел маникюр", "бледорозов, бадемова форма", "Гел маникюр: бледорозов, бадемова форма"],
    ["Педикюр с гел лак", "червен лак, чисти кантове", "Педикюр с гел лак: червен лак, чисти кантове"],
    ["Боядисване (дълга коса)", "наситено кестеняво, гладка коса", "Боядисване: наситено кестеняво, гладка коса"],
    ["Балаяж", "медено русо, меки вълни, снимано отзад", "Балаяж: медено русо, меки вълни, снимано отзад"],
    ["Официална прическа", "Нисък кок с оплетена кичурка.", "Официална прическа: нисък кок с оплетена кичурка"],
    ["Вечерен грим", "опушено око, топли тонове", "Вечерен грим: опушено око, топли тонове"],
  ])("пример: %s + «%s»", (serviceName, note, want) => {
    expect(buildGalleryAlt({ serviceName, note, date: DATE, now: NOW })).toBe(want);
  });

  it("без думи: вариантът с датата; втора такава в същия ден получава «, кадър 2»", () => {
    const first = buildGalleryAlt({ serviceName: "Балаяж", note: "", date: DATE, now: NOW });
    expect(first).toBe("Балаяж: готова работа от 21 ноември");
    const second = buildGalleryAlt({ serviceName: "Балаяж", note: null, date: DATE, now: NOW, existingAlts: [first] });
    expect(second).toBe("Балаяж: готова работа от 21 ноември, кадър 2");
    expect(buildGalleryAlt({ serviceName: "Балаяж", date: DATE, now: NOW, existingAlts: [first, second] })).toBe(
      "Балаяж: готова работа от 21 ноември, кадър 3",
    );
  });

  it("годината се пише само ако не е текущата", () => {
    expect(buildGalleryAlt({ serviceName: "Балаяж", date: new Date("2025-11-21T12:00:00Z"), now: NOW })).toBe(
      "Балаяж: готова работа от 21 ноември 2025",
    );
  });

  it("дълга услуга: скобата пада, реже се на цяла дума до 55 (примерът на Саиф, 105 знака)", () => {
    const alt = buildGalleryAlt({
      serviceName: "Кератинова терапия с възстановяване на много изтощена коса (дълга коса)",
      note: "гладка, лъскава коса след терапия, дневна светлина",
      date: DATE,
      now: NOW,
    });
    expect(alt).toBe("Кератинова терапия с възстановяване на много изтощена: гладка, лъскава коса след терапия, дневна светлина");
    expect([...alt].length).toBe(105);
  });

  it("таван 125 знака: режат се само думите, на цяла дума, без многоточие; «, кадър N» остава", () => {
    const service = "Кератинова терапия с възстановяване на много изтощена коса";
    const note = "много дълъг текст за снимката с още думи и още думи и още думи и още";
    const existing = buildGalleryAlt({ serviceName: service, note, date: DATE, now: NOW });
    const alt = buildGalleryAlt({ serviceName: service, note, date: DATE, now: NOW, existingAlts: [existing] });
    expect([...existing].length).toBeLessThanOrEqual(ALT_MAX);
    expect([...alt].length).toBeLessThanOrEqual(ALT_MAX);
    expect(alt.endsWith(", кадър 2")).toBe(true);
    expect(alt.startsWith("Кератинова терапия с възстановяване на много изтощена: ")).toBe(true);
    expect(alt).not.toContain("…");
  });

  it("чистене на думите: линк, @, #, телефон и емоджи излизат", () => {
    expect(cleanStaffNote("Бледорозов 💅 @nails_by_x #manikyur 0888 123 456 https://ig.me/x, ")).toBe("бледорозов");
    expect(cleanStaffNote("LED втвърдяване")).toBe("LED втвърдяване");
    expect(cleanStaffNote("   ")).toBe("");
    expect(cleanServiceName("Боядисване (дълга коса)")).toBe("Боядисване");
  });

  it("описанието няма «Euphoria» и «Варна»", () => {
    const alt = buildGalleryAlt({ serviceName: "Гел маникюр", note: "бледорозов", date: DATE, now: NOW });
    expect(alt).not.toMatch(/Euphoria|Варна/);
  });
});
