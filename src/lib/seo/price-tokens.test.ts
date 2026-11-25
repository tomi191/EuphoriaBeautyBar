import { describe, expect, it } from "vitest";
import { fillPrices } from "./price-tokens";
import { faqFromBlocks } from "@/lib/data/blog";
import { faqSchema } from "@/lib/schema";
import type { ServiceCategory } from "@/lib/data/services";

const cat = {
  groups: [
    {
      title: "Балаяж",
      items: [
        { name: "Балаяж (средна коса)", price: 77, priceFrom: true, currency: "€", durationMin: 150 },
        { name: "Маникюр с гел лак", price: 25, currency: "€", durationMin: 75 },
      ],
    },
  ],
} as unknown as ServiceCategory;

describe("fillPrices", () => {
  it("слага цената и минутите от ценоразписа", () => {
    expect(fillPrices("е {price:Балаяж (средна коса)} за средна", [cat])).toBe("е от 77 € за средна");
    expect(fillPrices("{Price:Балаяж (средна коса)} за средна", [cat])).toBe("От 77 € за средна");
    expect(fillPrices("{price:Маникюр с гел лак}, {min:Маникюр с гел лак} минути", [cat])).toBe("25 €, 75 минути");
  });
  it("без услугата в ценоразписа връща null (цена не се измисля)", () => {
    expect(fillPrices("от {price:Няма такава}", [cat])).toBeNull();
  });
  it("текст без знаци остава същият", () => {
    expect(fillPrices("Колко издържа гел лак?", [cat])).toBe("Колко издържа гел лак?");
  });
});

describe("faqFromBlocks + faqSchema", () => {
  it("взима само заглавията с faq и абзаците под тях; schema е без markdown", () => {
    const faq = faqFromBlocks([
      { type: "h2", text: "Обикновено заглавие" },
      { type: "p", text: "не е въпрос" },
      { type: "h3", text: "Колко струва?", faq: true },
      { type: "p", text: "От 77 €, виж [балаяж](/uslugi/balayazh-varna)." },
      { type: "h3", text: "Колко трае?", faq: true },
      { type: "p", text: "3 до 5 часа." },
      { type: "h2", text: "Още" },
      { type: "p", text: "извън въпросите" },
    ]);
    expect(faq).toEqual([
      { question: "Колко струва?", answer: "От 77 €, виж [балаяж](/uslugi/balayazh-varna)." },
      { question: "Колко трае?", answer: "3 до 5 часа." },
    ]);
    expect(faqSchema(faq).mainEntity[0].acceptedAnswer.text).toBe("От 77 €, виж балаяж.");
  });
});
