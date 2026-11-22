import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { galleryCategoryForService, sniffImageType } from "./upload-rules";

describe("видът на снимката по байтовете", () => {
  it("JPG, PNG и WebP се познават по съдържанието", async () => {
    const img = sharp({ create: { width: 8, height: 8, channels: 3, background: "#c99" } });
    expect(sniffImageType(await img.clone().jpeg().toBuffer())?.mime).toBe("image/jpeg");
    expect(sniffImageType(await img.clone().png().toBuffer())?.mime).toBe("image/png");
    expect(sniffImageType(await img.clone().webp().toBuffer())?.mime).toBe("image/webp");
  });

  it("SVG, текст, GIF и празен файл не са снимка", async () => {
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'))).toBeNull();
    expect(sniffImageType(Buffer.from("hello"))).toBeNull();
    expect(sniffImageType(await sharp({ create: { width: 4, height: 4, channels: 3, background: "#000" } }).gif().toBuffer())).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe("категорията в галерията по услугата", () => {
  it.each([
    [{ name: "Гел маникюр", categorySlug: "manikyur-i-pedikyur" }, "manikyur"],
    [{ name: "Педикюр с гел лак" }, "manikyur"],
    [{ name: "Балаяж", groupTitle: "Боядисване", categorySlug: "frizorski-uslugi" }, "boyadisvane"],
    [{ name: "Официална прическа", categorySlug: "frizorski-uslugi" }, "pricheski"],
    [{ name: "Сватбена прическа", categorySlug: "frizorski-uslugi" }, "svatbeni"],
    [{ name: "Дамско подстригване", categorySlug: "frizorski-uslugi" }, "podstrigvane"],
    [{ name: "Вечерен грим", categorySlug: "kozmetika" }, "grim"],
  ])("%o → %s", (svc, cat) => {
    expect(galleryCategoryForService(svc)).toBe(cat);
  });
});
