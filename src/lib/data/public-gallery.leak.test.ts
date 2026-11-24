import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Т. 7 (№8 В1а): чакаща или върната снимка не излиза в публична страница, метаданни или карта на сайта.
// Всяко четене на gallery_images извън администрацията и действията трябва да минава през
// listPublicGalleryImages (само одобрените). Тук се търси в кода всяко друго пряко четене.
const ROOT = path.resolve(__dirname, "../..");
const ALLOWED = new Set(
  [
    "lib/data/public-gallery.ts", // единственият публичен четец (status = approved)
    "lib/db/schema.ts",
    "lib/actions/gallery.ts", // администрацията
    "lib/actions/gallery-review.ts", // администрацията
    "lib/actions/staff-gallery.ts", // само своите снимки на влезлия специалист
    "lib/gallery/review.ts", // одобрението при Снежана: администрацията и бутоните в админ канала на Telegram
    "lib/data/gallery.ts", // статичният списък отпреди базата (не чете базата)
  ].map((p) => path.normalize(p)),
);

function walk(dir: string, out: string[] = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.ts$|\.testkit\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("галерията: няма публично четене покрай одобрените", () => {
  it("извън администрацията никой файл не чете gallery_images пряко", () => {
    const offenders = walk(ROOT)
      .map((f) => path.relative(ROOT, f))
      .filter((rel) => !ALLOWED.has(rel) && !rel.startsWith(path.normalize("app/admin/")))
      .filter((rel) => /galleryImages|gallery_images/.test(fs.readFileSync(path.join(ROOT, rel), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("публичните страници с галерия, картата на сайта и картите за споделяне ползват само одобрените", () => {
    for (const rel of ["app/galeriya/page.tsx", "app/zapazi-chas/page.tsx", "components/sections/featured-gallery.tsx", "components/sections/instagram-section.tsx"]) {
      expect(fs.readFileSync(path.join(ROOT, rel), "utf8")).toContain("listPublicGalleryImages");
    }
    const seo = ["lib/seo/sitemap.ts", "app/galeriya/opengraph-image.tsx"].map((rel) => fs.readFileSync(path.join(ROOT, rel), "utf8"));
    for (const src of seo) expect(src).not.toMatch(/galleryImages|gallery_images|gallery-originals/);
  });

  it("началната няма снимки от галерията, записани в кода: скритата в базата не може да остане там", () => {
    // Регресия от 24.11.2026: блокът Instagram държеше /images/gallery/g-21.webp в кода и скриването
    // по решение 30 (status = rejected) не го стигаше. Всяка снимка от галерията на началната идва
    // от listPublicGalleryImages.
    const page = fs.readFileSync(path.join(ROOT, "app/page.tsx"), "utf8");
    const parts = [...page.matchAll(/from "@\/(components\/sections\/[\w-]+)"/g)].map((m) => `${m[1]}.tsx`);
    expect(parts).toContain("components/sections/instagram-section.tsx");
    for (const rel of ["app/page.tsx", ...parts]) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      expect(src, rel).not.toMatch(/\/images\/gallery\/|\/object\/public\/gallery\//);
    }
  });

  it("частното хранилище се споменава само в кода на сървъра", () => {
    const users = walk(ROOT)
      .map((f) => path.relative(ROOT, f))
      .filter((rel) => /gallery-originals|ORIGINALS_BUCKET/.test(fs.readFileSync(path.join(ROOT, rel), "utf8")));
    expect(users.sort()).toEqual(
      ["lib/actions/gallery.ts", "lib/actions/staff-gallery.ts", "lib/db/schema.ts", "lib/gallery/review.ts", "lib/gallery/storage.ts"].map((p) => path.normalize(p)).sort(),
    );
  });
});
