/**
 * Генерира УНИКАЛНА реалистична снимка за всяка услуга през KIE (gpt-image-2) от
 * сцените, дефинирани от Workflow-а. Чете scenes JSON [{slug, scene}], сваля в
 * public/images/services/unique/<slug>.png. Idempotent (прескача съществуващи).
 * Пускане: npx tsx --env-file=.env.local scripts/gen-unique-images.ts <scenes.json>
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

// Anti-slop, фотореалистичен стил — добавя се към всяка сцена за консистентност.
const STYLE =
  "Editorial photorealistic photograph, full-frame DSLR with an 85mm lens, natural soft window light, " +
  "shallow depth of field, realistic skin texture with subtle natural imperfections, authentic candid unstaged moment. " +
  "Soft sage-green and warm cream color palette, calm premium beauty-salon atmosphere. " +
  "Absolutely NOT an illustration, NOT a drawing, NOT a 3D render, NOT CGI, NOT cartoon, NOT an AI-looking image — a real photo only. " +
  "Square 1:1 composition. No text, no words, no labels, no logos, no watermarks. No purple or violet.";

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
  if (!apiKey) { console.error("✗ KIE_AI_API_KEY липсва"); process.exit(1); }
  const scenesPath = process.argv[2];
  if (!scenesPath) { console.error("✗ Подай път до scenes.json"); process.exit(1); }
  const scenes: { slug: string; scene: string }[] = JSON.parse(await readFile(scenesPath, "utf8"));
  const outDir = join(process.cwd(), "public", "images", "services", "unique");
  await mkdir(outDir, { recursive: true });
  console.log(`${scenes.length} сцени → ${outDir}\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const { slug, scene } of scenes) {
    const path = join(outDir, `${slug}.png`);
    // Прескачаме ако вече има PNG ИЛИ оптимизирания WebP (optimize изтрива PNG-а).
    if (existsSync(path) || existsSync(join(outDir, `${slug}.webp`))) { skipped++; continue; }
    try {
      const taskId = await kieCreate(apiKey, `${scene} ${STYLE}`);
      const urls = await kiePoll(apiKey, taskId);
      if (!urls?.length) throw new Error("няма resultUrls");
      const dl = await fetch(urls[0]);
      if (!dl.ok) throw new Error(`download ${dl.status}`);
      await writeFile(path, Buffer.from(await dl.arrayBuffer()));
      done++;
      console.log(`  ✓ [${done + skipped}/${scenes.length}] ${slug}`);
    } catch (e: unknown) {
      failed++;
      console.error(`  ✗ ${slug}: ${(e as Error).message}`);
    }
  }
  console.log(`\n✅ Готово: ${done} нови, ${skipped} прескочени, ${failed} грешки. Re-run за повторен опит на грешките.`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
