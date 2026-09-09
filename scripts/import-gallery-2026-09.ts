/* eslint-disable no-console */
/**
 * Внос на снимките от 09.09.2026 в галерията: 11 фризьорски работи + гримьорският
 * кът (Evagarden). Минава по СЪЩИЯ път като админ качването (uploadGalleryImage):
 * WebP до 1600px → Supabase Storage bucket "gallery" → ред в gallery_images с
 * описание (= alt + lightbox caption) и sortOrder = min − 1 (най-отпред).
 *
 * Описанията са писани по това, което реално се вижда на снимката, не по шаблон.
 * Пропусната нарочно: корицата на брошурата Evagarden (модел на марката, не работа
 * от салона; би подвела като „грим от нас“).
 *
 * Idempotent: снимка със същото описание в БД се прескача.
 *
 * Пускане:  npx tsx scripts/import-gallery-2026-09.ts          (dry-run: само конвертира и показва плана)
 *           npx tsx scripts/import-gallery-2026-09.ts --apply  (качва + записва)
 */
import "./load-env";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { galleryAlt } from "../src/lib/data/gallery";

const APPLY = process.argv.includes("--apply");
const BUCKET = "gallery";
const MAX_EDGE = 1600; // същото като клиентския resize в gallery-upload-form.tsx
const ROOT = join(process.cwd(), "public/images/gallery");
const HAIR = join(ROOT, "9.9.2026");
const MAKEUP = join(ROOT, "Eva-Garden гримове");

type Item = { file: string; category: string; description: string };

// Ред = ред на показване (първият застава най-отпред в галерията).
const ITEMS: Item[] = [
  { file: join(HAIR, "viber_изображение_2026-09-09_18-05-10-861.jpg"), category: "boyadisvane",
    description: "Боядисване в цвят бордо на дълга права коса, снимано пред салона на дневна светлина" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-13-07-090.jpg"), category: "boyadisvane",
    description: "Балеаж от тъмна основа към светли краища, оформен на едри къдрици" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-02-30-619.jpg"), category: "pricheski",
    description: "Официална прическа: вдигната с къдрици и бретон на една страна" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-01-53-557.jpg"), category: "boyadisvane",
    description: "Наситено червено на дълга коса с меки вълни в краищата" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-12-18-095.jpg"), category: "pricheski",
    description: "Полувдигната прическа с висок кок, гофрирани кичури и къдрици по дължината" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-04-15-262.jpg"), category: "boyadisvane",
    description: "Каскада с балеаж в карамелени тонове, изсушена със сешоар на едри вълни" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-13-25-726.jpg"), category: "pricheski",
    description: "Висока опашка на руса коса: гладко прибрана отпред, вълни в краищата" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-07-17-066.jpg"), category: "pricheski",
    description: "Вдигната прическа с плитки и кок за официален повод" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-02-10-782.jpg"), category: "boyadisvane",
    description: "Платинено русо на къса коса с плажни вълни" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-03-27-653.jpg"), category: "podstrigvane",
    description: "Каскадно подстригване на кестенява коса, оформено със сешоар с извити краища" },
  { file: join(HAIR, "viber_изображение_2026-09-09_18-13-57-506.jpg"), category: "pricheski",
    description: "Висока опашка на светло русо, снимана в гръб, с къдрици в краищата" },
  { file: join(MAKEUP, "viber_изображение_2026-09-09_18-14-16-707.jpg"), category: "grim",
    description: "Гримьорският кът в салона: стол, огледало и стенд с продукти Evagarden" },
  { file: join(MAKEUP, "viber_изображение_2026-09-09_18-10-38-058.jpg"), category: "grim",
    description: "Стендът Evagarden: сенки, хайлайтъри, тониращ серум, червила и моливи за очи" },
  { file: join(MAKEUP, "viber_изображение_2026-09-09_18-10-38-103.jpg"), category: "grim",
    description: "Evagarden Skin Tint Serum: лек тониращ серум в няколко нюанса за естествено покритие" },
  { file: join(MAKEUP, "viber_изображение_2026-09-09_18-10-38-119.jpg"), category: "grim",
    description: "Червила и гланцове Evagarden в нюдови, розови и червени нюанси" },
  { file: join(MAKEUP, "viber_изображение_2026-09-09_18-10-38-129.jpg"), category: "grim",
    description: "Evagarden Velvet Stay: дълготраен фон дьо тен в различни нюанси" },
  { file: join(MAKEUP, "viber_изображение_2026-09-09_18-10-38-086.jpg"), category: "grim",
    description: "Продуктите за грим отблизо: тониращ серум, сенки и червила Evagarden" },
];

async function toWebp(path: string) {
  const input = await readFile(path);
  // rotate() без аргумент = прилага EXIF ориентацията (телефонни снимки през Viber).
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Липсват NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const existing = await db.query.galleryImages.findMany({ columns: { description: true } });
  const known = new Set(existing.map((r) => r.description?.trim()).filter(Boolean));

  const prepared: Array<Item & { buffer: Buffer; width: number; height: number }> = [];
  for (const item of ITEMS) {
    if (known.has(item.description)) {
      console.log(`⏭  вече в БД: ${item.description}`);
      continue;
    }
    const img = await toWebp(item.file);
    prepared.push({ ...item, ...img });
    console.log(`${item.category.padEnd(12)} ${img.width}x${img.height} ${(img.buffer.length / 1024).toFixed(0)} KB  ${item.description}`);
  }
  console.log(`\nЗа качване: ${prepared.length} от ${ITEMS.length}`);

  if (!APPLY) {
    console.log("DRY-RUN. Пусни с --apply, за да качи и запише.");
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  // Обратен ред: всяко insert взима min − 1, така първото в ITEMS излиза най-отпред.
  for (const p of [...prepared].reverse()) {
    const id = `gu-${nanoid(10)}`;
    const path = `${id}.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, p.buffer, { contentType: "image/webp" });
    if (error) throw new Error(`Storage upload failed for ${p.description}: ${error.message}`);
    const src = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
    const [{ min }] = await db
      .select({ min: sql<number | null>`min(${schema.galleryImages.sortOrder})` })
      .from(schema.galleryImages);
    await db.insert(schema.galleryImages).values({
      id,
      src,
      alt: galleryAlt(p.category, p.description),
      category: p.category,
      width: p.width,
      height: p.height,
      sortOrder: (min ?? 0) - 1,
      description: p.description,
    });
    console.log(`✓ ${id}  ${p.category}  ${p.description}`);
  }
  console.log("\nГотово. /galeriya е динамична; филтърът „Грим“ се появява след deploy на кода.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
