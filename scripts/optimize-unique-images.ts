/**
 * Конвертира уникалните снимки от едри PNG (KIE 1024px) в компактни WebP 768px.
 * Намалява драстично размера (147MB → ~6MB) — снимките са thumbnails, не им трябва
 * пълна резолюция. Изтрива оригиналните PNG. Пусни след gen-unique-images.
 * Пускане: npx tsx scripts/optimize-unique-images.ts
 */
import sharp from "sharp";
import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const dir = join(process.cwd(), "public", "images", "services", "unique");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));
  console.log(`${files.length} PNG → WebP 768px q82`);
  let done = 0;
  for (const f of files) {
    const src = join(dir, f);
    const out = src.replace(/\.png$/, ".webp");
    await sharp(src).resize(768, 768, { fit: "cover" }).webp({ quality: 82 }).toFile(out);
    await unlink(src);
    done++;
  }
  console.log(`✅ ${done} конвертирани в WebP, PNG изтрити.`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
