import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { Marquee } from "@/components/reactbits/marquee";
import { Reveal } from "@/components/reactbits/reveal";

export async function GoogleReviewsSection() {
  const [reviews, summaryRow] = await Promise.all([
    db.query.googleReviews.findMany({
      orderBy: (r, { desc }) => [desc(r.publishedAt)],
      limit: 24,
    }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "google_reviews_summary") }),
  ]);

  if (reviews.length === 0) return null;

  // Реалните брой/рейтинг идват от целия Google профил (вкл. отзивите само със
  // звезди), не от визуализираните карти — иначе header-ът би лъгал (5,0 / 24
  // вместо реалните 4,8 / 43). Fallback на изчисленото, ако summary липсва.
  const summary = summaryRow?.value as { rating: number; total: number; placeUrl?: string } | undefined;
  const avgRating = summary?.rating ?? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const totalCount = summary?.total ?? reviews.length;
  const placeUrl = summary?.placeUrl;

  const half = Math.ceil(reviews.length / 2);
  const top = reviews.slice(0, half);
  const bottom = reviews.slice(half);
  const dateFmt = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" });

  return (
    <section className="relative overflow-hidden bg-secondary/30 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">/ Google ревюта</p>
            <h2 className="font-display text-4xl font-medium md:text-5xl lg:text-6xl">
              <span className="gradient-text">{avgRating.toFixed(1)}</span> от 5 звезди.
            </h2>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-sm">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={"size-4 " + (i < Math.round(avgRating) ? "fill-foreground text-foreground" : "text-muted-foreground/30")} />
                ))}
              </div>
              <span className="font-medium">{totalCount} реални отзива</span>
            </div>
            {placeUrl && (
              <p className="mt-4 text-sm text-muted-foreground">
                <a
                  href={placeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
                >
                  Вижте всички {totalCount} отзива в Google →
                </a>
              </p>
            )}
          </div>
        </Reveal>
      </div>

      <div className="mt-12 flex flex-col gap-4">
        <Marquee pauseOnHover>
          {top.map((r) => (
            <ReviewCard key={r.id} {...r} dateFmt={dateFmt} />
          ))}
        </Marquee>
        {bottom.length > 0 && (
          <Marquee reverse pauseOnHover>
            {bottom.map((r) => (
              <ReviewCard key={r.id} {...r} dateFmt={dateFmt} />
            ))}
          </Marquee>
        )}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-secondary/30 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-secondary/30 to-transparent" />
    </section>
  );
}

function ReviewCard({
  authorName,
  rating,
  text,
  publishedAt,
  dateFmt,
}: {
  authorName: string;
  rating: number;
  text: string;
  publishedAt: Date;
  dateFmt: Intl.DateTimeFormat;
}) {
  return (
    <figure className="w-[360px] shrink-0 rounded-2xl border border-border/60 bg-background p-6 sm:w-[420px]">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-mint font-medium">
          {authorName[0]}
        </div>
        <div>
          <p className="text-sm font-medium">{authorName}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex">
              {Array.from({ length: rating }).map((_, i) => (
                <Star key={i} className="size-3 fill-foreground text-foreground" />
              ))}
            </div>
            <span>· {dateFmt.format(publishedAt)}</span>
          </div>
        </div>
      </div>
      <blockquote className="mt-4 line-clamp-5 text-sm leading-relaxed text-foreground/85">
        {text}
      </blockquote>
    </figure>
  );
}
