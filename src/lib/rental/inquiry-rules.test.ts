import { describe, expect, it } from "vitest";
import {
  formatBgPhone,
  inquiryBellDetail,
  inquiryPurgeCutoff,
  inquiryTelegramLines,
  parseBgPhone,
  specialtyForCategory,
  validateInquiry,
  INQUIRY_COPY,
} from "./inquiry-rules";

describe("parseBgPhone", () => {
  it.each([
    ["0888 000 000", "+359888000000"],
    ["0888123456", "+359888123456"],
    ["+359 888 123 456", "+359888123456"],
    ["00359888123456", "+359888123456"],
    ["359888123456", "+359888123456"],
    ["0898-66-33-15", "+359898663315"],
    ["(052) 123 456", "+35952123456"],
    ["02 987 6543", "+35929876543"],
  ])("приема %s", (raw, want) => {
    expect(parseBgPhone(raw)).toBe(want);
  });

  it.each([
    "",
    "   ",
    "0888",
    "088812345",
    "08881234567",
    "0888 12a 456",
    "888123456",
    "+44 20 7946 0958",
    "+359 0888 123 456",
    "0188 123 456",
    "1234567890",
  ])("отказва %j", (raw) => {
    expect(parseBgPhone(raw)).toBeNull();
  });

  it("форматира обратно за известието", () => {
    expect(formatBgPhone("+359888000000")).toBe("0888 000 000");
    expect(formatBgPhone("+35952123456")).toBe("052 123 456");
  });
});

describe("validateInquiry", () => {
  const ok = { name: " Проба  Тест ", phone: "0888 000 000", specialty: " Маникюр ", message: "", consent: true };

  it("чисти полетата", () => {
    const r = validateInquiry(ok);
    expect(r).toEqual({ ok: true, value: { name: "Проба Тест", phone: "+359888000000", specialty: "Маникюр", message: null } });
  });

  it("без съгласие не минава", () => {
    const r = validateInquiry({ ...ok, consent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ consent: INQUIRY_COPY.errConsent });
  });

  it("празно име и лош телефон дават грешка по всяко поле", () => {
    const r = validateInquiry({ ...ok, name: " ", phone: "123" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ name: INQUIRY_COPY.errName, phone: INQUIRY_COPY.errPhone });
  });
});

describe("текстовете", () => {
  it("Telegram: три реда по Саиф", () => {
    expect(
      inquiryTelegramLines({ position: "маникюрист", name: "Проба", phone: "+359888000000", message: "Завърших курс." }),
    ).toEqual(["Запитване за място под наем: маникюрист", "Проба · 0888 000 000", "„Завърших курс.“"]);
    expect(inquiryTelegramLines({ position: "козметик", name: "П", phone: "+359888000000", message: null })[2]).toBe("Без съобщение.");
  });

  it("камбанката", () => {
    expect(inquiryBellDetail({ name: "Проба", phone: "+359888000000", position: "маникюрист" })).toBe(
      "Проба, 0888 000 000 · маникюрист",
    );
  });

  it("специалността по категорията", () => {
    expect(specialtyForCategory("manikyur-i-pedikyur")).toBe("Маникюр");
    expect(specialtyForCategory("kozmetika")).toBe("Козметика");
    expect(specialtyForCategory("frizorski-uslugi")).toBe("Коса");
    expect(specialtyForCategory("nyama")).toBe("");
    expect(specialtyForCategory(null)).toBe("");
  });

  it("границата за триене е 6 месеца назад", () => {
    expect(inquiryPurgeCutoff(new Date("2026-11-22T10:00:00Z")).toISOString()).toBe("2026-05-22T10:00:00.000Z");
  });
});
