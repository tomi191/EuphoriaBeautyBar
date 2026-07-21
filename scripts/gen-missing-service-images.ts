/* eslint-disable no-console */
/**
 * АВТОМАТИЧНО генерира снимки за услуги БЕЗ такава: чете каталога от DB, намира
 * липсващите public/images/services/unique/<slug>.webp, строи сцена по категорията
 * и я генерира през KIE (gpt-image-2), после конвертира до WebP 768px (sharp).
 * Idempotent — пускай след всяка нова услуга; съществуващите се прескачат.
 * Пускане: npx tsx --env-file=.env.local scripts/gen-missing-service-images.ts
 * (снимките влизат в repo-то → git add + commit + deploy, за да стигнат до сайта)
 */
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { db } from "../src/lib/db";
import { slugify } from "../src/lib/utils";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

// Същият anti-slop стил като gen-unique-images.ts — консистентност с 88-те съществуващи.
const STYLE =
  "Editorial photorealistic photograph, full-frame DSLR with an 85mm lens, natural soft window light, " +
  "shallow depth of field, realistic skin texture with subtle natural imperfections, authentic candid unstaged moment. " +
  "Soft sage-green and warm cream color palette, calm premium beauty-salon atmosphere. " +
  "Absolutely NOT an illustration, NOT a drawing, NOT a 3D render, NOT CGI, NOT cartoon, NOT an AI-looking image — a real photo only. " +
  "Square 1:1 composition. No text, no words, no labels, no logos, no watermarks. No purple or violet.";

// Сцена по подразбиране per категория — за нови услуги без ръчно написана сцена.
const CATEGORY_SCENES: Record<string, string> = {
  "frizorski-uslugi":
    "A hairdresser working on a client's hair in a salon chair — scissors, comb and focused hands mid-motion, hair partly styled.",
  "frizorski-terapii":
    "Close-up of a hairdresser's hands applying a rich creamy treatment mask to long damp hair, section by section, glossy strands catching the light.",
  "manikyur-i-pedikyur":
    "Close-up over a manicure table: a specialist's gloved hands working precisely on a client's nails, tools neatly arranged nearby.",
  "kozmetika":
    "A client relaxing on a treatment bed while an aesthetician applies a facial treatment with gentle hands, soft towels and clean bottles around.",
};

async function kieCreate(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2-text-to-image", input: { prompt, aspectRatio: "1:1", resolution: "1K" } }),
  });
  const json = await res.json();
  if (json.code !== 200 || !json.data?.taskId) throw new Error(`createTask: ${json.msg ?? json.code}`);
  return json.data.taskId as string;
}

async function kiePoll(apiKey: string, taskId: string, timeoutMs = 5 * 60 * 1000): Promise<string[]> {
  const startedAt = Date.now();
  let delay = 4000;
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(`${KIE_POLL_URL}?taskId=${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const json = await res.json();
    const d = json.data;
    if (d?.state === "success") return JSON.parse(d.resultJson).resultUrls as string[];
    if (d?.state === "fail") throw new Error(`fail: ${d.failMsg ?? d.failCode}`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 12000);
  }
  throw new Error(`timeout ${taskId}`);
}

async function main() {
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey) { console.error("✗ KIE_AI_API_KEY липсва (.env.local)"); process.exit(1); }

  const items = await db.query.serviceItems.findMany();
  const cats = await db.query.serviceCategories.findMany();
  const outDir = join(process.cwd(), "public", "images", "services", "unique");
  await mkdir(outDir, { recursive: true });

  const missing = items
    .map((i) => ({ item: i, slug: slugify(i.name), catSlug: cats.find((c) => c.id === i.categoryId)?.slug ?? "" }))
    .filter(({ slug }) => !existsSync(join(outDir, `${slug}.webp`)));

  if (missing.length === 0) {
    console.log(`✅ Всички ${items.length} услуги имат снимка — нищо за генериране.`);
    process.exit(0);
  }
  console.log(`${missing.length} услуги без снимка:\n${missing.map((m) => `  · ${m.item.name} (${m.slug})`).join("\n")}\n`);

  let done = 0, failed = 0;
  for (const { item, slug, catSlug } of missing) {
    const base = CATEGORY_SCENES[catSlug] ?? CATEGORY_SCENES["frizorski-uslugi"];
    const scene = `${base} Service context (loose inspiration only, do not render text): "${item.name}" — ${item.groupTitle}.`;
    try {
      const taskId = await kieCreate(apiKey, `${scene} ${STYLE}`);
      const urls = await kiePoll(apiKey, taskId);
      if (!urls?.length) throw new Error("няма resultUrls");
      const dl = await fetch(urls[0]);
      if (!dl.ok) throw new Error(`download ${dl.status}`);
      const png = join(outDir, `${slug}.png`);
      await writeFile(png, Buffer.from(await dl.arrayBuffer()));
      await sharp(png).resize(768, 768, { fit: "cover" }).webp({ quality: 82 }).toFile(join(outDir, `${slug}.webp`));
      await unlink(png);
      done++;
      console.log(`  ✓ ${slug}.webp`);
    } catch (e: unknown) {
      failed++;
      console.error(`  ✗ ${slug}: ${(e as Error).message}`);
    }
  }
  console.log(`\n✅ ${done} генерирани, ${failed} грешки. Не забравяй: git add public/images/services/unique + commit + deploy.`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
