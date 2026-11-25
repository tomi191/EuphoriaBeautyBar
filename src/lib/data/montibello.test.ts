import { describe, expect, it } from "vitest";
import {
  getMontibelloProduct,
  montibelloCopy,
  montibelloForSale,
  montibelloNeeds,
  montibelloProducts,
  sameSeries,
} from "./montibello";

describe("Montibello, посока А", () => {
  it("38 продукта за вкъщи, всеки в поне една нужда; групите 7+4+5+3+3+6+3+7, «За мъже» 1", () => {
    expect(montibelloForSale).toHaveLength(38);
    expect(montibelloNeeds.map((n) => n.products.length)).toEqual([7, 4, 5, 3, 3, 6, 3, 7, 1]);
    const inNeeds = new Set(montibelloNeeds.flatMap((n) => n.products));
    for (const p of montibelloForSale) expect(inNeeds.has(p.slug), p.slug).toBe(true);
    for (const s of inNeeds) expect(getMontibelloProduct(s)?.professional, s).toBeFalsy();
  });

  it("«От същата рутина» при Colour Last Shampoo показва само Colour Last (backlog: друга серия)", () => {
    expect(sameSeries("colour-last-shampoo").map((p) => p.slug)).toEqual(["colour-last-rinse", "colour-last-mask"]);
  });

  it("всеки продукт за вкъщи има серия, а серията е само от продукти за вкъщи", () => {
    for (const p of montibelloForSale) {
      const sib = sameSeries(p.slug);
      expect(sib.length, p.slug).toBeGreaterThan(0);
      for (const s of sib) expect(s.professional, s.slug).toBeFalsy();
    }
  });

  it("текстовете на Саиф: 12 продукта, без цена и без «Запиши консултация»", () => {
    expect(Object.keys(montibelloCopy)).toHaveLength(12);
    for (const [slug, c] of Object.entries(montibelloCopy)) {
      expect(montibelloProducts.some((p) => p.slug === slug), slug).toBe(true);
      const all = JSON.stringify(c);
      expect(all).not.toMatch(/XX,XX|€|консултация/);
      expect(c.metaTitle.length, slug).toBeLessThanOrEqual(60);
      expect(c.faq.length, slug).toBeGreaterThanOrEqual(4);
    }
  });
});
