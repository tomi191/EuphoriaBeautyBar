/**
 * Генерира реалистична снимка за всеки визуален АРХЕТИП услуга през KIE.ai
 * (gpt-image-2). Сваля в public/images/services/<key>.png. Прескача съществуващи.
 * Архетипите се map-ват към услуги чрез src/lib/booking/length-icon.ts.
 *
 * Пускане: npx tsx --env-file=.env.local scripts/gen-service-images.ts
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

const STYLE =
  "Soft sage-green and creamy off-white tones, gentle natural daylight, calm premium beauty-salon aesthetic. " +
  "Photorealistic professional photograph, full-frame DSLR, realistic texture, shallow depth of field. " +
  "NOT an illustration, NOT a drawing, NOT a 3D render, NOT cartoon, NOT digital art. A real photo only. " +
  "Square 1:1 composition, subject centered. Absolutely no text, no labels, no logos. No purple or violet anywhere.";

const ARCHETYPES: { key: string; scene: string }[] = [
  { key: "styling", scene: "Real photograph from behind of a woman with an elegant glamorous blowout — voluminous, glossy, bouncy styled waves, beautifully finished." },
  { key: "curls", scene: "Real photograph from behind of a woman with bouncy, defined, healthy permed curls cascading in soft spirals." },
  { key: "braids", scene: "Real photograph from behind and slightly to the side of a woman with an intricate, elegant fishtail braid, neatly woven, healthy hair." },
  { key: "hairtreatment", scene: "Real photograph: extremely glossy, healthy, freshly treated smooth shiny hair catching soft light, with a professional hair-serum glass bottle softly out of focus on a clean stone surface." },
  { key: "manicure", scene: "Real photograph close-up of well-groomed elegant female hands with a fresh, natural, glossy manicure resting gracefully on soft folded linen, a nail-polish bottle softly out of focus. Realistic skin and natural nail shine." },
  { key: "pedicure", scene: "Real photograph close-up of well-groomed female feet with a fresh, clean, glossy pedicure, resting on a soft towel in a serene clean spa setting. Realistic skin." },
  { key: "facial", scene: "Real photograph of a woman lying relaxed during a professional facial skincare treatment, glowing clean fresh skin, eyes gently closed, soft serene spa setting with a small sprig of fresh sage nearby. Realistic skin texture." },
  { key: "lashesbrows", scene: "Real photograph, extreme macro close-up of a woman's eye area showing beautifully laminated, long, lifted lashes and perfectly shaped, groomed eyebrows. Crisp realistic detail." },
  { key: "waxing", scene: "Real photograph of smooth, flawless, freshly waxed skin on a woman's lower leg, soft serene clean spa setting, realistic glowing skin." },
];

async function kieCreate(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2-text-to-image", input: { prompt, aspectRatio: "1:1", resolution: "1K" } }),
  });
  const json = await res.json();
  if (json.code !== 200 || !json.data?.taskId) throw new Error(`KIE createTask failed: ${json.msg ?? json.code}`);
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
    if (d?.state === "fail") throw new Error(`KIE task failed: ${d.failMsg ?? d.failCode}`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 12000);
  }
  throw new Error(`KIE task ${taskId} timed out`);
}

async function main() {
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey) { console.error("✗ KIE_AI_API_KEY липсва в .env.local"); process.exit(1); }
  const outDir = join(process.cwd(), "public", "images", "services");
  await mkdir(outDir, { recursive: true });

  for (const a of ARCHETYPES) {
    const path = join(outDir, `${a.key}.png`);
    if (existsSync(path)) { console.log(`  ↪ прескачам (има) ${a.key}`); continue; }
    console.log(`\n🎨 Генерирам „${a.key}"…`);
    const taskId = await kieCreate(apiKey, `${a.scene} ${STYLE}`);
    console.log(`  taskId=${taskId} — изчаквам…`);
    const urls = await kiePoll(apiKey, taskId);
    if (!urls?.length) throw new Error("KIE не върна resultUrls");
    const dl = await fetch(urls[0]);
    if (!dl.ok) throw new Error(`download ${dl.status}`);
    await writeFile(path, Buffer.from(await dl.arrayBuffer()));
    console.log(`  ✓ ${path}`);
  }
  console.log("\n✅ Готово — архетип снимки в public/images/services/");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
