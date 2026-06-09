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

/** Сцена според категорията — РЕАЛНА фотография (не илюстрация/рисунка). */
function sceneForCategory(category?: string): string {
  switch (category) {
    case "Маникюр":
      return "Real photograph: a close-up of a woman's well-groomed hands with a fresh, natural manicure resting on a soft linen surface; a few professional nail-care tools and a glass bottle of nail polish sit softly out of focus nearby. Realistic skin texture and natural nail shine.";
    case "Терапии":
      return "Real photograph of a premium hair salon detail: glossy, freshly treated healthy hair catching soft window light, with a professional hair-care serum bottle and a folded towel softly out of focus on a clean stone counter. Realistic hair strands, true-to-life reflections.";
    case "Wellness":
      return "Real photograph of a calm spa setting: a softly lit facial-care or relaxation scene with a folded cotton towel, a sprig of fresh sage and a small ceramic bowl on a clean surface. Serene, natural, realistic textures.";
    case "Грижа за коса":
    default:
      return "Real photograph of a woman with healthy, glossy, beautifully styled hair in soft natural daylight inside a bright premium salon; a hair-care product bottle sits softly out of focus beside her. Realistic hair detail, natural skin, lifelike lighting.";
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
    // Силни фотографски cue-ове — карат image модела да върне СНИМКА, не рисунка.
    "This MUST be a photorealistic professional photograph — shot on a full-frame DSLR camera, 50mm lens, f/2.0, shallow depth of field, true-to-life detail, realistic skin and hair texture, natural soft daylight.",
    "NOT an illustration, NOT a drawing, NOT a painting, NOT a 3D render, NOT cartoon, NOT digital art, NOT vector. A real photo only.",
    "16:9 horizontal cover image, magazine-grade editorial composition.",
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
