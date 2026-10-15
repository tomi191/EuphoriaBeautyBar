import Link from "next/link";
import { getPublishedPosts } from "@/lib/data/blog-store";
import { postMatchesLanding } from "@/lib/seo/related-links";

const dateFormatter = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric" });

/**
 * „От журнала" за landing страниците: до 3 публикувани статии по тема (най-новите първи).
 * Server component, без клиентски JS. Ако DB липсва (build без DATABASE_URL) или няма
 * съвпадение и не е поискан fallback, не рендира нищо вместо да чупи страницата.
 */
export async function JournalPosts({
  landingHref,
  fallbackLatest = false,
}: {
  landingHref: string;
  /** За хъб/общи страници без тясна тема: при липса на съвпадение показва най-новите. */
  fallbackLatest?: boolean;
}) {
  let posts: Awaited<ReturnType<typeof getPublishedPosts>> = [];
  try {
    // getPublishedPosts вече сортира по publishedAt desc.
    posts = await getPublishedPosts();
  } catch {
    return null;
  }
  let picked = posts.filter((p) => postMatchesLanding(p, landingHref)).slice(0, 3);
  if (picked.length === 0 && fallbackLatest) picked = posts.slice(0, 3);
  if (picked.length === 0) return null;

  return (
    <section aria-labelledby="ot-zhurnala" className="border-t border-border/40 py-14 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="ot-zhurnala" className="font-display text-2xl font-medium md:text-3xl">
            От журнала
          </h2>
          <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
            Всички статии
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {picked.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group block rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-soft"
            >
              <p className="text-xs text-muted-foreground">
                {dateFormatter.format(new Date(p.date))} · {p.readingMinutes} мин
              </p>
              <h3 className="mt-2 font-display text-lg font-medium text-balance group-hover:text-primary">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
