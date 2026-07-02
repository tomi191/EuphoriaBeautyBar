import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { getAnyPost } from "@/lib/data/blog-store";
import { PostRenderer } from "@/components/blog/post-renderer";
import { BlogAudioPlayer } from "@/components/blog/blog-audio-player";

export const dynamic = "force-dynamic";

/**
 * Admin преглед на статия НЕЗАВИСИМО от статуса (вкл. чернови). Публичният
 * /blog/[slug] показва само published → „Виж черновата" от генератора водеше до 404.
 * Този route изисква admin и рендерира със същия PostRenderer.
 */
export default async function BlogPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const post = await getAnyPost(slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Към статиите
        </Link>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          Преглед · статус: {post.status === "published" ? "публикувана" : "чернова"}
        </span>
      </div>

      <p className="text-xs uppercase tracking-wider text-primary">{post.category}</p>
      <h1 className="mt-1 font-display text-3xl font-medium md:text-4xl">{post.title}</h1>
      <p className="mt-3 text-muted-foreground">{post.excerpt}</p>

      {post.audioUrl && (
        <div className="mt-5">
          <BlogAudioPlayer url={post.audioUrl} />
        </div>
      )}

      <article className="mt-8">
        <PostRenderer blocks={post.content} />
      </article>
    </div>
  );
}
