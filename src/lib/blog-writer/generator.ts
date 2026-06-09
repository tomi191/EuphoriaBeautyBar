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
  /** Markdown (за справка/бъдеща редакция). */
  contentMarkdown: string;
  /** Typed блокове за contentJson — точният формат на PostRenderer. */
  contentBlocks: BlogBlock[];
  readingMinutes: number;
  cover: string | null;
  model: string;
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

  const model = process.env.BLOG_OPENROUTER_MODEL || "google/gemini-2.5-flash";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://euphoriabar.bg";

  // 1. Текстова генерация
  const messages = buildMessages(input);
  const completion = await complete({
    apiKey,
    model,
    siteUrl,
    siteName: "Euphoria Hair & Beauty Bar",
    messages,
    temperature: 0.75,
    maxTokens: 8000,
    json: true,
  });

  // 2. Парсване
  const parsed = parseJSONResponse<RawModelOutput>(
    completion.content,
    REQUIRED_FIELDS as unknown as string[],
  );

  const title = String(parsed.title).trim();
  const contentMarkdown = String(parsed.content);
  const category = normalizeCategory(parsed.category, input.category);
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((t) => String(t)).filter(Boolean).slice(0, 6)
    : [];

  // 3. Деривати
  const slug = generateSlug(title);
  const contentBlocks = markdownToBlocks(contentMarkdown);
  const readingMinutes = calculateReadingTime(contentMarkdown);

  // 4. Cover (изолиран — провалът не чупи поста)
  let cover: string | null = null;
  try {
    const coverResult = await generateCoverImage({
      slug,
      topic: title,
      category,
      keywords: input.keywords,
    });
    cover = coverResult?.url ?? null;
  } catch (err) {
    console.warn(
      "[BlogWriter] Cover генерация се провали (постът се записва без cover):",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    title,
    slug,
    excerpt: String(parsed.excerpt).trim(),
    metaDescription: String(parsed.metaDescription).trim(),
    category,
    tags,
    contentMarkdown,
    contentBlocks,
    readingMinutes,
    cover,
    model: completion.model,
  };
}
