import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Badge } from "@/components/ui/badge";
import { getPublishedPosts } from "@/lib/data/blog-store";

export const metadata: Metadata = {
  title: "Журнал",
  description:
    "Статии за грижа за коса, козметика и маникюр от Euphoria Hair & Beauty Bar, кв. Левски, Варна.",
};

const dateFormatter = new Intl.DateTimeFormat("bg-BG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function BlogPage() {
  // getPublishedPosts вече връща статиите сортирани по publishedAt desc.
  const sorted = await getPublishedPosts();
  const [featured, ...rest] = sorted;

  if (!featured) {
    return (
      <section className="relative pt-32 pb-24 lg:pt-40">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Журнал</p>
          <p className="text-muted-foreground">Очаквайте първите статии скоро.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Журнал</p>
          </Reveal>
          <BlurText
            as="h1"
            text="Експертно за косата, кожата и грижата за себе си"
            className="max-w-3xl font-display text-5xl font-medium text-balance md:text-6xl lg:text-7xl"
          />
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid gap-0 overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/30 md:grid-cols-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto md:h-full">
                {featured.cover && (
                  <Image
                    src={featured.cover}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                )}
                <Badge variant="secondary" className="absolute left-4 top-4 rounded-md bg-background/95 backdrop-blur">
                  Препоръчано
                </Badge>
              </div>
              <div className="flex flex-col justify-center p-8 md:p-12">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {dateFormatter.format(new Date(featured.date))} · {featured.readingMinutes} мин четене
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight font-medium text-balance group-hover:text-primary md:text-4xl lg:text-5xl">
                  {featured.title}
                </h2>
                <p className="mt-4 text-muted-foreground">{featured.excerpt}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Прочети статията <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, idx) => (
              <Reveal key={post.slug} delay={idx * 0.06}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border/60 bg-secondary">
                    {post.cover && (
                      <Image
                        src={post.cover}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <Badge variant="secondary" className="absolute left-4 top-4 rounded-md bg-background/95 backdrop-blur">
                      {post.category}
                    </Badge>
                  </div>
                  <div className="mt-5">
                    <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>{dateFormatter.format(new Date(post.date))}</span>
                      <span className="text-border">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {post.readingMinutes} мин
                      </span>
                    </p>
                    <h3 className="mt-2 font-display text-xl leading-tight font-medium text-balance group-hover:text-primary md:text-2xl">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
