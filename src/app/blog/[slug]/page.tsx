import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Clock } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/json-ld";
import { PostRenderer } from "@/components/blog/post-renderer";
import { BlogAudioPlayer } from "@/components/blog/blog-audio-player";
import { AuthorBio } from "@/components/blog/author-bio";
import { ShareButtons } from "@/components/blog/share-buttons";
import { getPublishedPosts, getPublishedPost } from "@/lib/data/blog-store";
import { siteConfig } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { robots: { index: false } };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

const dateFormatter = new Intl.DateTimeFormat("bg-BG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  // Свързани статии по категория измежду публикуваните.
  const allPosts = await getPublishedPosts();
  const related = allPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  return (
    <>
      <article>
        <header className="relative pt-32 pb-12 lg:pt-40 lg:pb-16">
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <nav aria-label="Трохи" className="mb-8 flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Начало</Link>
              <ChevronRight className="size-3" />
              <Link href="/blog" className="hover:text-foreground">Журнал</Link>
              <ChevronRight className="size-3" />
              <span className="text-foreground">{post.category}</span>
            </nav>

            <Badge variant="secondary" className="rounded-md">{post.category}</Badge>
            <BlurText
              as="h1"
              text={post.title}
              className="mt-5 font-display text-4xl leading-[1.1] font-medium text-balance md:text-6xl"
              stagger={0.03}
            />
            <Reveal delay={0.4}>
              <div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="size-3.5" /> {dateFormatter.format(new Date(post.date))}
                </span>
                <span aria-hidden className="text-border">·</span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="size-3.5" /> {post.readingMinutes} мин четене
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.5}>
              <ShareButtons title={post.title} className="mt-6" />
            </Reveal>
            {post.audioUrl && (
              <Reveal delay={0.6}>
                <BlogAudioPlayer url={post.audioUrl} />
              </Reveal>
            )}
          </div>

          {post.cover && (
            <div className="mx-auto mt-12 max-w-5xl px-4 lg:px-8">
              <Reveal delay={0.2}>
                <div className="relative aspect-[16/9] overflow-hidden rounded-md border border-border bg-secondary">
                  <Image
                    src={post.cover}
                    alt={post.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 80vw"
                    className="object-cover"
                    priority
                  />
                </div>
              </Reveal>
            </div>
          )}
        </header>

        <section>
          <div className="mx-auto max-w-3xl px-4 pb-24 lg:px-8">
            <PostRenderer blocks={post.content} />

            <div className="mt-12 border-t border-border/40 pt-8">
              <ShareButtons title={post.title} />
            </div>

            <AuthorBio />
          </div>
        </section>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border/40 bg-secondary/20 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <Reveal>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-display text-3xl font-medium md:text-4xl">Свързани статии</h2>
                <Button asChild variant="ghost">
                  <Link href="/blog">
                    Към блога <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.08}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group block rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-soft"
                  >
                    <p className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(p.date))} · {p.readingMinutes} мин
                    </p>
                    <h3 className="mt-2 font-display text-xl font-medium text-balance group-hover:text-primary">
                      {p.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Button asChild variant="ghost">
            <Link href="/blog">
              <ArrowLeft className="size-4" /> Всички статии
            </Link>
          </Button>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Начало", url: siteConfig.url },
            { name: "Блог", url: `${siteConfig.url}/blog` },
            { name: post.title, url: `${siteConfig.url}/blog/${post.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            dateModified: post.date,
            ...(post.cover && { image: `${siteConfig.url}${post.cover}` }),
            mainEntityOfPage: { "@type": "WebPage", "@id": `${siteConfig.url}/blog/${post.slug}` },
            author: {
              "@type": "Person",
              name: "Снежана Саблева",
              jobTitle: "Собственик и фризьор-стилист",
              url: `${siteConfig.url}/za-nas`,
              worksFor: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
            },
            publisher: {
              "@type": "Organization",
              name: siteConfig.name,
              url: siteConfig.url,
              logo: { "@type": "ImageObject", url: `${siteConfig.url}/images/brand/logo-black.png` },
            },
          },
        ]}
      />
    </>
  );
}
