import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";
import { getPublishedPost } from "@/lib/data/blog-store";

export const alt = "Журнал — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  return renderOg({
    eyebrow: post?.category ? `Журнал · ${post.category}` : "Журнал",
    title: post?.title ?? "Журнал",
    subtitle: post?.excerpt,
  });
}
