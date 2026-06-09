"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";

/**
 * Публикува чернова (status: draft → published) и презрева публичните
 * страници, за да се появи статията веднага в /blog.
 */
export async function publishBlogPost(id: string) {
  await requireAdmin();
  await db
    .update(schema.blogPosts)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(schema.blogPosts.id, id));

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
}

/** Връща публикувана статия в чернова (published → draft) и презрева страниците. */
export async function unpublishBlogPost(id: string) {
  await requireAdmin();
  await db
    .update(schema.blogPosts)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(schema.blogPosts.id, id));

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
}
