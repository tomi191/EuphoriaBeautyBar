/**
 * Batch генериране на блог статии през проектния engine (OpenRouter текст +
 * KIE cover/inline + TTS) и запис в blog_posts като ЧЕРНОВА (status="draft").
 *
 * ⚠️ Прави реални API заявки (струва токени) + production DB write.
 * Статиите се записват като draft → преглед/редакция/humanizer в /admin/blog,
 * после публикуване. Това е нарочно (anti-slop: човешка редакция = canonical).
 *
 * Пускане:
 *   npx tsx --env-file=.env.local scripts/gen-blog.ts          # всички теми по-долу
 *   npx tsx --env-file=.env.local scripts/gen-blog.ts 0        # само тема с индекс 0 (тест)
 *   PUBLISH=1 npx tsx --env-file=.env.local scripts/gen-blog.ts 0   # директно published
 *
 * Изисква в .env.local: OPENROUTER_API_KEY (задължителен), KIE_AI_API_KEY +
 * Supabase ключове (за covers/inline/audio — иначе статията е без тях, graceful).
 */
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { generateBlogPost, type GenerateInput } from "../src/lib/blog-writer/generator";

// Приоритетни теми от content calendar-а (не дублират съществуващите 2 статии).
const TOPICS: GenerateInput[] = [
  {
    topic: "Летен маникюр 2026: трайни цветове и тенденции за морето и плажа",
    category: "Маникюр",
    keywords: ["летен маникюр", "летен маникюр тенденции", "трайни цветове маникюр", "гел лак лято"],
  },
  {
    topic: "Медицински педикюр: кога е нужен и с какво помага",
    category: "Маникюр",
    keywords: ["медицински педикюр", "медицински педикюр варна", "врастнал нокът", "напукани пети"],
  },
  {
    topic: "Кератин или ботокс за коса: коя терапия е за твоята коса",
    category: "Терапии",
    keywords: ["кератин или ботокс за коса", "кератинова терапия", "ботокс за коса", "възстановяване на коса"],
  },
  {
    topic: "Колко издържа гел лак и как да го запазиш по-дълго",
    category: "Маникюр",
    keywords: ["гел лак колко издържа", "гел лак издръжливост", "грижа за гел лак", "маникюр поддръжка"],
  },
  {
    topic: "Френски маникюр: класика, цветен и омбре варианти",
    category: "Маникюр",
    keywords: ["френски маникюр", "цветен френски маникюр", "омбре маникюр", "френски маникюр идеи"],
  },
  {
    topic: "HydraFacial: какво е, за коя кожа е и какъв е резултатът",
    category: "Wellness",
    keywords: ["hydrafacial", "хидрафейшъл", "дълбоко почистване на лице", "хидратация на кожата"],
  },
];

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || nanoid(8);
  let suffix = 1;
  while (suffix <= 50) {
    const existing = await db.query.blogPosts.findFirst({ where: (p) => eq(p.slug, candidate), columns: { id: true } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return `${base}-${nanoid(4)}`;
}

async function main() {
  const idxArg = process.argv[2];
  const status = process.env.PUBLISH === "1" ? "published" : "draft";
  const topics = idxArg !== undefined ? [TOPICS[Number(idxArg)]].filter(Boolean) : TOPICS;
  if (topics.length === 0) throw new Error(`Невалиден индекс: ${idxArg}`);

  console.log(`→ ${topics.length} тема(и), статус: ${status}\n`);

  for (const t of topics) {
    console.log(`Генерирам: ${t.topic}`);
    const result = await generateBlogPost(t);
    const slug = await uniqueSlug(result.slug);
    const now = new Date();
    await db.insert(schema.blogPosts).values({
      id: nanoid(),
      slug,
      title: result.title,
      excerpt: result.excerpt,
      category: result.category,
      cover: result.cover,
      audioUrl: result.audioUrl,
      contentJson: result.contentBlocks,
      publishedAt: now,
      readingMinutes: result.readingMinutes,
      status,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✓ ${result.title}`);
    console.log(`  slug: ${slug} · блокове: ${result.contentBlocks.length} · cover: ${result.cover ? "да" : "не"} · аудио: ${result.audioUrl ? "да" : "не"} · ${status}\n`);
  }

  console.log("Готово. Прегледай и публикувай в /admin/blog.");
  process.exit(0);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
