/**
 * Генерира реалистични снимки за избор по УСЛУГА × ДЪЛЖИНА през KIE.ai
 * (gpt-image-2-text-to-image). Изглед в гръб (без лице), салвия фон.
 * Сваля в public/images/lengths/<kind>-<len>.png. Прескача вече съществуващи.
 *
 * Пускане: npx tsx --env-file=.env.local scripts/gen-length-images.ts
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

// Услуга → как изглежда косата. „color" вече е генериран (color-*.png) и се прескача.
const KINDS = [
  { key: "color", hair: "solid all-over hair color, natural rich glossy brown, perfectly even tone" },
  { key: "balayage", hair: "a balayage: dark brown roots gradually melting into soft sun-kissed caramel-blonde ends, hand-painted dimensional highlights" },
  { key: "haircut", hair: "a fresh precise haircut with clean healthy ends, natural brown hair, neatly styled" },
];

const LENGTHS = [
  { key: "short", desc: "a short chin-length bob" },
  { key: "medium", desc: "medium shoulder-length hair" },
  { key: "long", desc: "long hair falling well below the shoulders, towards the mid-back" },
];

function buildPrompt(hairKind: string, lengthDesc: string): string {
  return [
    `Real photograph, viewed from directly behind: the back of a woman's head and shoulders showing ${lengthDesc} with ${hairKind}.`,
    "Healthy, glossy hair, neatly brushed and styled.",
    "Soft sage-green and creamy off-white studio background, gentle natural daylight, calm premium beauty-salon aesthetic.",
    "Shot strictly from behind — NO face visible, only the back of the head, the hair and the shoulders.",
    "Photorealistic professional photograph, full-frame DSLR, 85mm lens, f/2.2, shallow depth of field, realistic hair texture and natural shine.",
    "NOT an illustration, NOT a drawing, NOT a 3D render, NOT cartoon, NOT digital art. A real photo only.",
    "Square 1:1 composition, subject centered. Absolutely no text, no labels, no logos. No purple or violet anywhere.",
  ].join(" ");
}

async function kieCreate(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2-text-to-image",
      input: { prompt, aspectRatio: "1:1", resolution: "1K" },
    }),
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
  if (!apiKey) {
    console.error("✗ KIE_AI_API_KEY липсва в .env.local");
    process.exit(1);
  }
  const outDir = join(process.cwd(), "public", "images", "lengths");
  await mkdir(outDir, { recursive: true });

  for (const kind of KINDS) {
    for (const len of LENGTHS) {
      const path = join(outDir, `${kind.key}-${len.key}.png`);
      if (existsSync(path)) {
        console.log(`  ↪ прескачам (има) ${kind.key}-${len.key}`);
        continue;
      }
      console.log(`\n🎨 Генерирам „${kind.key}-${len.key}"…`);
      const taskId = await kieCreate(apiKey, buildPrompt(kind.hair, len.desc));
      console.log(`  taskId=${taskId} — изчаквам резултат…`);
      const urls = await kiePoll(apiKey, taskId);
      if (!urls?.length) throw new Error("KIE не върна resultUrls");
      const dl = await fetch(urls[0]);
      if (!dl.ok) throw new Error(`download ${dl.status}`);
      await writeFile(path, Buffer.from(await dl.arrayBuffer()));
      console.log(`  ✓ ${path}`);
    }
  }
  console.log("\n✅ Готово.");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
