import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { generateBlogPost } from "@/lib/blog-writer/generator";

// Генерацията вика външни API (OpenRouter + KIE) — нужен е Node runtime
// и по-дълъг таймаут от default-ния edge лимит.
export const runtime = "nodejs";
export const maxDuration = 300;

const schemaInput = z.object({
  topic: z.string().min(4, "Темата е твърде кратка."),
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
});

/** Гарантира уникален slug — добавя числов суфикс при сблъсък. */
async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || nanoid(8);
  let suffix = 1;
  // Ограничен цикъл — спира при 50 опита.
  while (suffix <= 50) {
    const existing = await db.query.blogPosts.findFirst({
      where: (p) => eq(p.slug, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return `${base}-${nanoid(4)}`;
}

export async function POST(req: Request) {
  await requireAdmin();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалиден JSON" }, { status: 400 });
  }

  const parsed = schemaInput.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалидни данни" },
      { status: 422 },
    );
  }

  const { topic, keywords, category } = parsed.data;

  try {
    const result = await generateBlogPost({ topic, keywords, category });
    const slug = await uniqueSlug(result.slug);

    const id = nanoid();
    const now = new Date();

    await db.insert(schema.blogPosts).values({
      id,
      slug,
      title: result.title,
      excerpt: result.excerpt,
      category: result.category,
      cover: result.cover,
      // contentJson очаква typed блокове (BlogBlock[]) — точният формат на PostRenderer.
      contentJson: result.contentBlocks,
      publishedAt: now,
      readingMinutes: result.readingMinutes,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath("/admin/blog");
    // Новата статия е чернова и не се показва в /blog, но презреваме за консистентност
    // (и при бъдеща промяна на default статуса).
    revalidatePath("/blog");

    return NextResponse.json({
      ok: true,
      post: {
        id,
        slug,
        title: result.title,
        excerpt: result.excerpt,
        category: result.category,
        cover: result.cover,
        readingMinutes: result.readingMinutes,
        tags: result.tags,
        status: "draft",
        blocks: result.contentBlocks.length,
        model: result.model,
        metaDescription: result.metaDescription,
      },
    });
  } catch (err) {
    console.error("[blog/generate] грешка:", err);
    const message =
      err instanceof Error ? err.message : "Неочаквана грешка при генерация.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
