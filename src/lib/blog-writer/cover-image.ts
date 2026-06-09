/**
 * Cover image генерация за блог постове на Euphoria.
 *
 * Поток:
 *   1. Генерира editorial снимка през KIE.ai (gpt-image-2-text-to-image),
 *      16:9, БЕЗ текст/лого в кадъра — image моделите грешат текст.
 *   2. Сваля URL-а (изтича за 24ч) и го качва в Supabase Storage
 *      (bucket "blog-images", path posts/<slug>.png), за да остане траен.
 *
 * Graceful fallback: ако KIE_AI_API_KEY или Supabase env vars липсват →
 * връща null и постът се записва без cover (текстът работи без изображение).
 *
 * Без logo-lockup composite — опционалното брандиране е пропуснато умишлено
 * (KIE снимката се качва директно). Палитрата следва салвия/нюд art
 * direction на марката, не лилаво.
 */

import { createClient } from "@supabase/supabase-js";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

export interface CoverImageInput {
  /** Slug на поста — за storage path. */
  slug: string;
  /** Тема/заглавие — задава съдържанието на снимката. */
  topic: string;
  /** Категория — насочва сцената (коса/маникюр/козметика/wellness). */
  category?: string;
  /** Ключови думи — изострят специфичността. */
  keywords?: string[];
}

export interface CoverImageResult {
  url: string;
  prompt: string;
  durationSeconds: number;
}

/** Сцена според категорията — реалистична салонна/продуктова фотография. */
function sceneForCategory(category?: string): string {
  switch (category) {
    case "Маникюр":
      return "Elegant close-up of well-groomed hands with a fresh natural manicure resting on a soft linen surface, a few professional nail-care tools and a bottle of nail polish softly out of focus.";
    case "Терапии":
      return "Editorial salon scene: glass treatment ampoules and a hair-care serum bottle on a clean stone counter, a soft towel and a strand of healthy glossy hair as composition props.";
    case "Wellness":
      return "Calm spa-like editorial scene: a softly lit massage or facial-care setting with a folded towel, a sprig of fresh sage, and a small ceramic bowl, serene and inviting.";
    case "Грижа за коса":
    default:
      return "Editorial beauty photography of healthy, glossy, well-styled hair in soft natural light, with a premium hair-care product bottle softly out of focus beside it on a clean surface.";
  }
}

function buildPrompt(input: CoverImageInput): string {
  const keywords = input.keywords ?? [];
  const subjectHint =
    keywords.length > 0
      ? `Subject context: ${keywords.slice(0, 3).join(", ")}.`
      : "";

  return [
    `Topic: ${input.topic}.`,
    subjectHint,
    sceneForCategory(input.category),
    "16:9 horizontal cover image, magazine-grade composition, photorealistic, shallow depth of field.",
    "Color palette: warm sage green, soft nude and beige tones, creamy off-white background, gentle natural daylight. Calm, premium, feminine — modern beauty salon aesthetic. Absolutely no purple or violet.",
    "ABSOLUTELY NO text anywhere in the image — no labels, no captions, no logos, no signs, no readable writing of any kind.",
    "Tasteful, editorial, trustworthy — for a beauty salon journal article.",
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
      input: {
        prompt,
        aspectRatio: "16:9",
        resolution: "1K",
      },
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

/**
 * Генерира cover и го качва в Supabase Storage. Връща публичния URL или
 * null ако ключовете липсват (или при тиха грешка — постът оцелява без cover).
 */
export async function generateCoverImage(
  input: CoverImageInput,
): Promise<CoverImageResult | null> {
  const kieKey = process.env.KIE_AI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!kieKey || !supabaseUrl || !supabaseServiceKey) {
    console.warn(
      "[BlogWriter] Cover image пропуснат — KIE_AI_API_KEY или Supabase env vars липсват",
    );
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const prompt = buildPrompt(input);
  const t0 = Date.now();

  // 1. Създай задача + poll
  const taskId = await kieCreate(kieKey, prompt);
  const urls = await kiePoll(kieKey, taskId);
  if (!urls || urls.length === 0) {
    throw new Error("KIE returned no result URLs");
  }

  // 2. Свали (URL-ът изтича за 24ч)
  const downloadRes = await fetch(urls[0]);
  if (!downloadRes.ok) {
    throw new Error(`Cover image download failed: ${downloadRes.status}`);
  }
  const buffer = Buffer.from(await downloadRes.arrayBuffer());

  // 3. Качи в Supabase Storage — bucket "blog-images", posts/<slug>.png
  const path = `posts/${input.slug}.png`;
  const { error: uploadErr } = await supabase.storage
    .from("blog-images")
    .upload(path, buffer, { contentType: "image/png", upsert: true });

  if (uploadErr) {
    throw new Error(
      `Cover upload failed: ${uploadErr.message}. Увери се, че bucket "blog-images" съществува и е public в Supabase.`,
    );
  }

  const url = `${supabaseUrl}/storage/v1/object/public/blog-images/${path}`;
  return { url, prompt, durationSeconds: (Date.now() - t0) / 1000 };
}
