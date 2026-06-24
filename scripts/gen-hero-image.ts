/**
 * Еднократен генератор на hero снимка през KIE.ai (gpt-image-2-text-to-image).
 * Ползва се за замяна на слаби/AI-неподходящи hero изображения с фотореалистични.
 *
 * Пускане:
 *   npx tsx --env-file=.env.local scripts/gen-hero-image.ts <output-name> "<scene prompt>"
 *
 * Пример:
 *   npx tsx --env-file=.env.local scripts/gen-hero-image.ts frizorski-terapii-hero \
 *     "glossy freshly treated healthy long hair after a keratin treatment..."
 *
 * Запазва в public/images/services/<output-name>.png. След това обнови heroImage в DB/каталога.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

function buildPrompt(scene: string): string {
  return [
    scene,
    // Силни фотографски cue-ове — карат image модела да върне СНИМКА, не рисунка.
    "This MUST be a photorealistic professional photograph — shot on a full-frame DSLR camera, 50mm lens, f/2.0, shallow depth of field, true-to-life detail, realistic skin and hair texture, natural soft daylight.",
    "NOT an illustration, NOT a drawing, NOT a painting, NOT a 3D render, NOT cartoon, NOT digital art, NOT vector. A real photo only.",
    "16:9 horizontal hero banner. Editorial composition: the subject sits on the RIGHT side of the frame, with soft, calm, gently out-of-focus negative space on the LEFT third for text overlay.",
    "Color palette: warm sage green, soft nude and beige tones, creamy off-white background, gentle natural light. Calm, premium, feminine — modern beauty salon aesthetic. Absolutely no purple or violet anywhere.",
    "ABSOLUTELY NO text anywhere in the image — no labels, no captions, no logos, no signs, no readable writing of any kind.",
    "Tasteful, trustworthy, real — for a premium beauty salon website hero.",
  ].join(" ");
}

async function main() {
  const [, , outName, sceneArg] = process.argv;
  if (!outName || !sceneArg) {
    throw new Error('Usage: gen-hero-image.ts <output-name> "<scene prompt>"');
  }
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey) throw new Error("KIE_AI_API_KEY липсва (зареди .env.local с --env-file)");

  const prompt = buildPrompt(sceneArg);
  console.log("→ Генерирам:", outName);

  // 1. createTask
  const createRes = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2-text-to-image",
      input: { prompt, aspectRatio: "16:9", resolution: "1K" },
    }),
  });
  const createJson = await createRes.json();
  if (createJson.code !== 200 || !createJson.data?.taskId) {
    throw new Error(`KIE createTask failed: ${createJson.msg ?? createJson.code} :: ${JSON.stringify(createJson)}`);
  }
  const taskId: string = createJson.data.taskId;
  console.log("  taskId:", taskId);

  // 2. poll
  let urls: string[] = [];
  const startedAt = Date.now();
  let delay = 4000;
  while (Date.now() - startedAt < 5 * 60 * 1000) {
    const res = await fetch(`${KIE_POLL_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await res.json();
    const d = json.data;
    if (d?.state === "success") {
      urls = JSON.parse(d.resultJson).resultUrls as string[];
      break;
    }
    if (d?.state === "fail") throw new Error(`KIE task failed: ${d.failMsg ?? d.failCode}`);
    process.stdout.write(`  state: ${d?.state ?? "queued"}\r`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 12000);
  }
  if (!urls.length) throw new Error("KIE върна 0 result URLs (timeout)");
  console.log("\n  resultUrl:", urls[0]);

  // 3. download → public/images/services
  const dl = await fetch(urls[0]);
  if (!dl.ok) throw new Error(`download failed: ${dl.status}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  const out = path.join(process.cwd(), "public", "images", "services", `${outName}.png`);
  await writeFile(out, buf);
  console.log(`✓ Запазено: ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
