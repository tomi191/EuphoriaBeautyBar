/**
 * Оркестратор за генериране на блог пост.
 *
 * Поток:
 *   build prompt → complete() през OpenRouter → parse JSON →
 *   markdown→blocks → slug + reading time → (cover през KIE/Supabase) →
 *   връща структуриран резултат, готов за запис в blog_posts.
 *
 * Cover генерацията е изолирана: ако се провали (липсващ ключ, KIE грешка),
 * постът се връща без cover вместо целият поток да падне.
 */

import { complete } from "./openrouter";
import { parseJSONResponse } from "./response-parser";
import { buildMessages, REQUIRED_FIELDS, BLOG_CATEGORIES } from "./prompts";
import { markdownToBlocks } from "./markdown-to-blocks";
import { generateSlug, calculateReadingTime } from "./slug";
import { generateCoverImage } from "./cover-image";
import { generateInlineImages } from "./inline-images";
import { generateBlogAudio } from "./tts";
import type { BlogBlock } from "@/lib/data/blog";

export interface GenerateInput {
  topic: string;
  keywords?: string[];
  category?: string;
}

interface RawModelOutput extends Record<string, unknown> {
  title: string;
  excerpt: string;
  metaDescription: string;
  content: string;
  tags: string[];
  category: string;
}

export interface GenerateResult {
  title: string;
  slug: string;
  excerpt: string;
  metaDescription: string;
  category: string;
  tags: string[];
  /** Реално използваните ключови думи (подадени или авто-изведени от темата). */
  keywords: string[];
  /** Markdown (за справка/бъдеща редакция). */
  contentMarkdown: string;
  /** Typed блокове за contentJson — точният формат на PostRenderer. */
  contentBlocks: BlogBlock[];
  readingMinutes: number;
  cover: string | null;
  /** Публичен URL на TTS озвучаването, или null ако се е провалило/липсват ключове. */
  audioUrl: string | null;
  model: string;
}

/**
 * Извежда SEO ключови думи от темата, ако потребителят не е подал нито една.
 * Лек Gemini Flash call с deterministic JSON. На всякаква грешка връща [] —
 * генерацията продължава без keywords (моделът сам ги вплита от темата).
 */
async function deriveKeywords(
  topic: string,
  apiKey: string,
  model: string,
  siteUrl: string,
): Promise<string[]> {
  const sys = `Ти си SEO специалист за салон за красота в кв. Левски, Варна (коса, боядисване, балаяж, кератинови терапии, маникюр, козметика). От подадена ТЕМА върни 5-7 SEO ключови думи на български, които реални жени от Варна търсят в Google. Първата е primary. Включи поне 1 локален ("...варна") и 1 intent keyword ("цена"/"поддръжка"/"колко издържа") където е уместно. БЕЗ английски освен имена на марки. Върни СТРОГО JSON: {"keywords": ["...", "..."]}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl,
        "X-Title": "Euphoria keyword derive",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `ТЕМА: ${topic}` },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}") as {
      keywords?: unknown;
    };
    return Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .slice(0, 7)
      : [];
  } catch {
    return [];
  }
}

/**
 * Гарантира 2 inline image placeholder-а, ако моделът не е сложил нито един
 * (недетерминизъм). Инжектира ги след 2-рото и след последното H2 заглавие,
 * с генерична сцена по категория — по-добре типова снимка, отколкото никаква.
 */
function ensureImagePlaceholders(md: string, category: string): string {
  if (md.includes("<!-- image:")) return md;
  const scenes: Record<string, [string, string]> = {
    "Грижа за коса": [
      "фризьор разресва дълга здрава коса в светъл салон",
      "професионални продукти за коса подредени на рафт в салон",
    ],
    Терапии: [
      "фризьор нанася подхранваща терапия върху кичур коса",
      "жена с гладка лъскава коса след терапия в салона",
    ],
    Маникюр: [
      "близък план на ръце със свеж нюдов маникюр",
      "маникюристка работи прецизно върху нокти в салон",
    ],
    Wellness: [
      "спокойна процедура за лице в светла козметична стая",
      "козметични продукти и кърпи в топла салонна обстановка",
    ],
  };
  const [s1, s2] = scenes[category] ?? scenes["Грижа за коса"];
  const lines = md.split("\n");
  const h2 = lines.reduce<number[]>((acc, l, i) => (l.startsWith("## ") ? [...acc, i] : acc), []);
  if (h2.length < 3) return md;
  // След заглавието на 2-рата секция и след заглавието на последната.
  const insertions: Array<[number, string]> = [
    [h2[1] + 1, `\n<!-- image: ${s1} -->\n`],
    [h2[h2.length - 1] + 1, `\n<!-- image: ${s2} -->\n`],
  ];
  // Вмъкваме отзад напред, за да не изместим индексите.
  for (const [idx, text] of insertions.sort((a, b) => b[0] - a[0])) {
    lines.splice(idx, 0, text);
  }
  return lines.join("\n");
}

/** Нормализира категорията до позволените стойности; fallback "Грижа за коса". */
function normalizeCategory(raw: string | undefined, requested?: string): string {
  const all = BLOG_CATEGORIES as readonly string[];
  if (requested && all.includes(requested)) return requested;
  if (raw && all.includes(raw)) return raw;
  // Толерантен match по подниз
  if (raw) {
    const hit = all.find((c) => c.toLowerCase() === raw.trim().toLowerCase());
    if (hit) return hit;
  }
  return "Грижа за коса";
}

export async function generateBlogPost(
  input: GenerateInput,
): Promise<GenerateResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не е зададен — генерацията изисква ключ.");
  }

  const model = process.env.BLOG_OPENROUTER_MODEL || "google/gemini-3.5-flash";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.euphoriabeauty.eu";

  // 0. Ако не са подадени ключови думи — изведи ги автоматично от темата,
  //    за да са оптимизирани и статията, и cover промптът. Провал → [].
  let keywords = input.keywords?.filter((k) => k.trim().length > 0) ?? [];
  if (keywords.length === 0) {
    keywords = await deriveKeywords(input.topic, apiKey, model, siteUrl);
  }
  // Локалните "…варна" keywords са ценни за meta/tags, но подадени на текстовия
  // модел той ги лепи дословно в изреченията ("балаяж варна изисква…") —
  // най-явният stuffing маркер. Затова текстът ги НЕ получава; останалите да.
  const proseKeywords = keywords.filter((k) => !/варна/i.test(k));
  const effectiveInput: GenerateInput = { ...input, keywords: proseKeywords };

  // 1. Текстова генерация
  const messages = buildMessages(effectiveInput);
  const completion = await complete({
    apiKey,
    model,
    siteUrl,
    siteName: "Euphoria Hair & Beauty Bar",
    messages,
    temperature: 0.75,
    // gemini-3.5-flash при дълги статии връщаше truncated JSON при 8000 токена
    // (липсваща затваряща кавичка → parse fail). 16000 дава достатъчно резерв.
    maxTokens: 16000,
    json: true,
  });

  // 2. Парсване
  const parsed = parseJSONResponse<RawModelOutput>(
    completion.content,
    REQUIRED_FIELDS as unknown as string[],
  );

  const title = String(parsed.title).trim();
  const category = normalizeCategory(parsed.category, input.category);
  // Гарантирани inline изображения: ако моделът пропусна placeholder-ите,
  // инжектираме генерични по категория (LLM недетерминизъм).
  const rawMarkdown = ensureImagePlaceholders(String(parsed.content), category);
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((t) => String(t)).filter(Boolean).slice(0, 6)
    : [];

  // 3. Slug (нужен и за storage пътищата на изображенията)
  const slug = generateSlug(title);

  // 4. Изображения — cover + inline се генерират ПАРАЛЕЛНО. Inline резолвът
  //    заменя `<!-- image: ... -->` placeholder-ите в markdown с `![alt](url)`,
  //    или ги маха graceful при провал. И двете са изолирани: провал на
  //    изображения не чупи поста (статията се записва само с текст).
  const [cover, resolvedMarkdown] = await Promise.all([
    generateCoverImage({
      slug,
      topic: title,
      category,
      keywords: effectiveInput.keywords,
    })
      .then((r) => r?.url ?? null)
      .catch((err) => {
        console.warn(
          "[BlogWriter] Cover генерация се провали (постът се записва без cover):",
          err instanceof Error ? err.message : err,
        );
        return null;
      }),
    generateInlineImages({
      slug,
      topic: title,
      category,
      keywords: effectiveInput.keywords,
      markdown: rawMarkdown,
      maxImages: 3,
    })
      .then((r) => r.markdown)
      // generateInlineImages не хвърля, но пазим се за всеки случай — при
      // неочаквана грешка падаме към суровия markdown без placeholder-и.
      .catch((err) => {
        console.warn(
          "[BlogWriter] Inline генерация се провали (статия без inline снимки):",
          err instanceof Error ? err.message : err,
        );
        return rawMarkdown.replace(/<!--\s*image:[\s\S]*?-->/g, "");
      }),
  ]);

  // 5. Деривати (върху резолвнатия markdown — с реални image URL-и)
  const contentMarkdown = resolvedMarkdown;
  const contentBlocks = markdownToBlocks(contentMarkdown);
  const readingMinutes = calculateReadingTime(contentMarkdown);

  // 6. TTS озвучаване — върху финалните typed блокове (без image alt текстове).
  //    Изолирано като cover-а: провал (липсващи Supabase ключове, Edge TTS
  //    грешка) НЕ чупи поста — статията се записва без аудио.
  const audioUrl = await generateBlogAudio(slug, title, contentBlocks)
    .then((r) => r.url)
    .catch((err) => {
      console.warn(
        "[BlogWriter] TTS озвучаване се провали (постът се записва без аудио):",
        err instanceof Error ? err.message : err,
      );
      return null;
    });

  return {
    title,
    slug,
    excerpt: String(parsed.excerpt).trim(),
    metaDescription: String(parsed.metaDescription).trim(),
    category,
    tags,
    keywords,
    contentMarkdown,
    contentBlocks,
    readingMinutes,
    cover,
    audioUrl,
    model: completion.model,
  };
}
