/**
 * Inline изображения за блог постовете на Euphoria.
 *
 * Моделът вмъква `<!-- image: кратко описание -->` placeholder-и под някои
 * H2 секции (виж prompts.ts). Тази функция намира първите N placeholder-а,
 * генерира за всеки РЕАЛИСТИЧНА снимка през KIE (gpt-image-2-text-to-image,
 * същата палитра като cover-image.ts: салвия/нюд/крем, без лилаво, без текст),
 * качва в Supabase Storage (bucket "blog-images", posts/<slug>/inline-<n>.png)
 * и заменя placeholder-а в markdown с `![alt](url)`.
 *
 * Поколение е ПАРАЛЕЛНО (Promise.all) за скорост. Всеки слот е изолиран: ако
 * една снимка се провали, останалите продължават. Placeholder-и, които не са
 * запълнени (липсващ ключ, fail), се махат graceful от текста — никога не
 * остава суров `<!-- ... -->` коментар на сайта.
 *
 * Graceful fallback: ако KIE_AI_API_KEY или Supabase env vars липсват →
 * връща markdown с премахнати placeholder-и (само текстова статия).
 */

import { createClient } from "@supabase/supabase-js";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

/** Placeholder, който моделът вмъква: <!-- image: описание на сцената -->. */
const PLACEHOLDER_RE = /<!--\s*image:\s*([\s\S]+?)\s*-->/g;

export interface InlineImagesInput {
  /** Slug на поста — за storage path posts/<slug>/inline-<n>.png. */
  slug: string;
  /** Тема/заглавие — задава контекста на снимките. */
  topic: string;
  /** Категория — насочва сцената (коса/маникюр/козметика/wellness). */
  category?: string;
  /** Ключови думи — изострят специфичността. */
  keywords?: string[];
  /** Markdown тялото с placeholder-и, които ще се заменят/премахнат. */
  markdown: string;
  /** Колко inline снимки да се генерират максимум. По подразбиране 3. */
  maxImages?: number;
}

export interface InlineImagesResult {
  /** Markdown с заменени (или премахнати) placeholder-и. */
  markdown: string;
  /** Брой реално генерирани и вмъкнати снимки. */
  count: number;
  durationSeconds: number;
}

interface Slot {
  /** Точният текст на placeholder-а (за .replace). */
  match: string;
  /** Описанието на сцената / alt текст. */
  alt: string;
}

/** Намира първите `max` placeholder-а в реда на появата им. */
function findSlots(markdown: string, max: number): Slot[] {
  const out: Slot[] = [];
  let m: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(markdown)) !== null && out.length < max) {
    out.push({ match: m[0], alt: m[1].trim() });
  }
  return out;
}

/** Сцена според категорията — РЕАЛНА фотография (огледало на cover-image.ts). */
function sceneForCategory(category?: string): string {
  switch (category) {
    case "Маникюр":
      return "Real photograph: a tight close-up of a woman's well-groomed hands with a fresh natural manicure, soft linen surface, a glass bottle of nail polish and a few nail-care tools softly out of focus. Realistic skin texture and natural nail shine.";
    case "Терапии":
      return "Real photograph of a premium hair salon detail: glossy, freshly treated healthy hair catching soft window light, a professional hair-care serum bottle and a folded towel softly out of focus on a clean stone counter. Realistic hair strands, true-to-life reflections.";
    case "Wellness":
      return "Real photograph of a calm spa setting: a softly lit facial-care or relaxation scene with a folded cotton towel, a sprig of fresh sage and a small ceramic bowl on a clean surface. Serene, natural, realistic textures.";
    case "Грижа за коса":
    default:
      return "Real photograph inside a bright premium salon: a hairstyling moment in soft natural daylight, healthy glossy hair, a professional product bottle softly out of focus nearby. Realistic hair detail, natural skin, lifelike lighting.";
  }
}

/**
 * Гради prompt за inline снимка. Описанието на сцената от placeholder-а води
 * кадъра; категорийната сцена и палитрата го заземяват в марковата естетика.
 */
function buildInlinePrompt(input: InlineImagesInput, alt: string): string {
  const keywords = input.keywords ?? [];
  const subjectHint =
    keywords.length > 0 ? `Subject context: ${keywords.slice(0, 3).join(", ")}.` : "";
  const sceneHint = alt ? `Scene to depict: ${alt}.` : "";

  return [
    `Topic of the article: ${input.topic}.`,
    sceneHint,
    subjectHint,
    sceneForCategory(input.category),
    "This MUST be a photorealistic professional photograph — shot on a full-frame DSLR camera, 50mm lens, f/2.0, shallow depth of field, true-to-life detail, realistic skin and hair texture, natural soft daylight.",
    "NOT an illustration, NOT a drawing, NOT a painting, NOT a 3D render, NOT cartoon, NOT digital art, NOT vector. A real photo only.",
    "Horizontal 4:3 editorial composition, magazine-grade.",
    "Color palette: warm sage green, soft nude and beige tones, creamy off-white background, gentle natural light. Calm, premium, feminine — modern beauty salon aesthetic. Absolutely no purple or violet anywhere.",
    "ABSOLUTELY NO text anywhere in the image — no labels, no captions, no logos, no signs, no readable writing of any kind.",
    "Tasteful, trustworthy, real — for a beauty salon journal article.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function kieCreate(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(KIE_CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2-text-to-image",
      input: { prompt, aspectRatio: "4:3", resolution: "1K" },
    }),
  });
  const json = await res.json();
  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(`KIE createTask failed: ${json.msg ?? json.code}`);
  }
  return json.data.taskId as string;
}

async function kiePoll(
  apiKey: string,
  taskId: string,
  timeoutMs = 5 * 60 * 1000,
): Promise<string[]> {
  const startedAt = Date.now();
  let delay = 4000;
  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(`${KIE_POLL_URL}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await res.json();
    const d = json.data;
    if (d?.state === "success") {
      return JSON.parse(d.resultJson).resultUrls as string[];
    }
    if (d?.state === "fail") {
      throw new Error(`KIE task failed: ${d.failMsg ?? d.failCode}`);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 12000);
  }
  throw new Error(`KIE task ${taskId} timed out`);
}

/** Маха всички (останали) placeholder-и от текста — graceful fallback. */
function stripPlaceholders(markdown: string): string {
  return markdown
    .replace(PLACEHOLDER_RE, "")
    // Празни редове, останали след премахването
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Генерира и вмъква inline снимки. Никога не хвърля: при липсващи ключове или
 * грешка връща markdown с премахнати placeholder-и, така че статията се записва
 * без сурови коментари в тялото.
 */
export async function generateInlineImages(
  input: InlineImagesInput,
): Promise<InlineImagesResult> {
  const t0 = Date.now();
  const maxImages = input.maxImages ?? 3;

  const kieKey = process.env.KIE_AI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const slots = findSlots(input.markdown, maxImages);
  if (slots.length === 0) {
    return { markdown: input.markdown, count: 0, durationSeconds: 0 };
  }

  if (!kieKey || !supabaseUrl || !supabaseServiceKey) {
    console.warn(
      "[BlogWriter] Inline images пропуснати — KIE_AI_API_KEY или Supabase env vars липсват",
    );
    return {
      markdown: stripPlaceholders(input.markdown),
      count: 0,
      durationSeconds: (Date.now() - t0) / 1000,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ПОСЛЕДОВАТЕЛНО генериране с по 2 опита на слот. Паралелните KIE заявки
  // (3 inline + cover едновременно) даваха мрежови "fetch failed" — sequential
  // + retry е по-бавно (~60s повече), но надеждно. Всеки слот е изолиран.
  const results: Array<{ match: string; alt: string; url: string | null }> = [];
  for (let idx = 0; idx < slots.length; idx++) {
    const slot = slots[idx];
    let url: string | null = null;
    for (let attempt = 1; attempt <= 2 && !url; attempt++) {
      try {
        const prompt = buildInlinePrompt(input, slot.alt);
        const taskId = await kieCreate(kieKey, prompt);
        const urls = await kiePoll(kieKey, taskId);
        if (!urls || urls.length === 0) {
          throw new Error("KIE returned no result URLs");
        }
        const downloadRes = await fetch(urls[0]);
        if (!downloadRes.ok) {
          throw new Error(`Inline image download failed: ${downloadRes.status}`);
        }
        const buffer = Buffer.from(await downloadRes.arrayBuffer());

        const path = `posts/${input.slug}/inline-${idx + 1}.png`;
        const { error: uploadErr } = await supabase.storage
          .from("blog-images")
          .upload(path, buffer, { contentType: "image/png", upsert: true });
        if (uploadErr) {
          throw new Error(`Inline upload failed: ${uploadErr.message}`);
        }
        url = `${supabaseUrl}/storage/v1/object/public/blog-images/${path}`;
      } catch (err) {
        console.warn(
          `[BlogWriter] Inline image ${idx + 1} (опит ${attempt}/2) се провали:`,
          err instanceof Error ? err.message : err,
        );
        if (attempt === 1) await new Promise((r) => setTimeout(r, 3000));
      }
    }
    results.push({ match: slot.match, alt: slot.alt, url });
  }

  // Замени успешните placeholder-и с markdown изображение; премахни провалените.
  let markdown = input.markdown;
  let count = 0;
  for (const r of results) {
    if (r.url) {
      markdown = markdown.replace(r.match, `![${r.alt}](${r.url})`);
      count++;
    } else {
      markdown = markdown.replace(r.match, "");
    }
  }
  // Махни всякакви оставащи placeholder-и (над maxImages) + почисти празни редове.
  markdown = stripPlaceholders(markdown);

  return { markdown, count, durationSeconds: (Date.now() - t0) / 1000 };
}
