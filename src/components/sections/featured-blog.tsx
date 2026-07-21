import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublishedPosts } from "@/lib/data/blog-store";

const dateFormatter = new Intl.DateTimeFormat("bg-BG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export async function FeaturedBlog() {
  const posts = await getPublishedPosts();
  // Няма публикувани статии → скрий секцията елегантно, за да не показва празно.
  if (posts.length === 0) return null;

  // getPublishedPosts вече връща най-новите първи, но сортираме за сигурност.
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const [feature, ...rest] = sorted;
  const sidePosts = rest.slice(0, 3);

  return (
    <section id="blog" className="relative overflow-hidden bg-background py-24 lg:py-32">
      <Image
        src="/illustrations/dots.svg"
        alt=""
        aria-hidden
        width={120}
        height={80}
        className="pointer-events-none absolute right-12 top-12 hidden h-12 w-auto opacity-50 lg:block"
      />

      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <Reveal>
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Журнал
              </span>
              <h2 className="mt-5 font-display text-5xl leading-[1] font-medium text-balance md:text-7xl">
                За косата и кожата — <em className="font-serif italic text-primary">от практиката</em>.
              </h2>
            </div>
            <div className="flex justify-start md:col-span-5 md:justify-end">
              <Button asChild variant="ghost" className="group inline-flex">
                <Link href="/blog">
                  Виж всички статии
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Link href={`/blog/${feature.slug}`} className="group block overflow-hidden rounded-md border border-foreground/10 bg-cream">
              <div className="relative aspect-[4/3] overflow-hidden">
                {feature.cover && (
                  <Image
                    src={feature.cover}
                    alt={feature.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  />
                )}
                <Badge variant="secondary" className="absolute left-5 top-5 rounded-md bg-background/95 backdrop-blur">
                  Препоръчано · {feature.category}
                </Badge>
              </div>
              <div className="p-7 md:p-9">
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span>{dateFormatter.format(new Date(feature.date))}</span>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {feature.readingMinutes} мин
                  </span>
                </p>
                <h3 className="mt-3 font-display text-3xl leading-tight font-medium text-balance group-hover:text-primary md:text-4xl lg:text-5xl">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-xl text-base text-muted-foreground">{feature.excerpt}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-medium text-foreground">
                  <span className="border-b border-foreground/40 pb-0.5 transition-colors group-hover:border-foreground">
                    Прочети статията
                  </span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </Reveal>

          <div className="flex flex-col gap-4 lg:col-span-5">
            {sidePosts.map((post, idx) => (
              <Reveal key={post.slug} delay={0.1 + idx * 0.06}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex items-stretch gap-5 overflow-hidden rounded-md border border-foreground/10 bg-cream transition-colors hover:border-foreground/30"
                >
                  <div className="relative aspect-square w-32 shrink-0 overflow-hidden md:w-40">
                    {post.cover && (
                      <Image
                        src={post.cover}
                        alt={post.title}
                        fill
                        sizes="160px"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-center pr-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
                      {post.category} · {post.readingMinutes} мин
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 font-display text-lg leading-tight font-medium text-balance group-hover:text-primary md:text-xl">
                      {post.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(post.date))}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
