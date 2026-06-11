import { db } from "@/lib/db";
import type { BlogPost, BlogBlock } from "@/lib/data/blog";
import type { BlogPost as DbBlogPost } from "@/lib/db/schema";

/**
 * Чете публикуваните статии от БД и ги мапва към презентационния тип `BlogPost`,
 * който публичните страници (/blog, /blog/[slug]) и `PostRenderer` очакват.
 *
 * Презентационни полета, които ги няма в БД, получават разумни default-и:
 *  - cover: ако постът няма корица, fallback към брандово изображение, за да не
 *    остане празно място в hero/картите.
 */

const COVER_FALLBACK = "/images/interior/salon-1.jpg";

/** DB ред → презентационен `BlogPost` (date като ISO string, contentJson → блокове). */
function toBlogPost(row: DbBlogPost): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    // publishedAt е Date в БД → ISO string за <time> и dateFormatter в страниците.
    date: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
    readingMinutes: row.readingMinutes,
    cover: row.cover ?? COVER_FALLBACK,
    audioUrl: row.audioUrl,
    // contentJson се пази като typed BlogBlock[] (виж blog/generate route + markdown-to-blocks).
    content: (row.contentJson as BlogBlock[]) ?? [],
  };
}

/** Всички публикувани статии, най-новите първи. */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const rows = await db.query.blogPosts.findMany({
    where: (p, { eq }) => eq(p.status, "published"),
    orderBy: (p, { desc }) => [desc(p.publishedAt)],
  });
  return rows.map(toBlogPost);
}

/** Една публикувана статия по slug (или undefined). */
export async function getPublishedPost(slug: string): Promise<BlogPost | undefined> {
  const row = await db.query.blogPosts.findFirst({
    where: (p, { eq, and }) => and(eq(p.slug, slug), eq(p.status, "published")),
  });
  return row ? toBlogPost(row) : undefined;
}
