import { describe, expect, it } from "vitest";
import { renderPromoImage } from "@/lib/og/promo";

// satori пада на CSS, което не поддържа (напр. dotted), едва при четенето на тялото: картината трябва да се
// изрисува докрай и в двата размера.
describe("renderPromoImage", () => {
  for (const square of [false, true]) {
    it(`рисува PNG ${square ? "1080×1080" : "1080×1350"}`, async () => {
      const res = renderPromoImage({ who: "при специалиста по маникюр", titleLines: ["Маникюр с гел лак"], until: "до 15 декември", square });
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.subarray(1, 4).toString()).toBe("PNG");
      expect(buf.readUInt32BE(16)).toBe(1080);
      expect(buf.readUInt32BE(20)).toBe(square ? 1080 : 1350);
    }, 30000);
  }
});
