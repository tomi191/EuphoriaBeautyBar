import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { Reveal } from "@/components/reactbits/reveal";
import { Marquee } from "@/components/reactbits/marquee";

const dateFmt = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" });

/** Официалното многоцветно Google „G" — източникът личи веднага (авторитет). */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

/** Реална профилна снимка от Google (native <img> → директно от Google CDN, без
 *  Vercel optimizer/429); инициалът отдолу е fallback при липса/грешка. */
function ReviewAvatar({ name, photo }: { name: string; photo: string | null }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-mint text-sm font-medium">
      {name[0]}
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
}

/** Реден от 5 звезди в Google-златисто, `count` запълнени. */
function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < count ? "size-3 fill-amber-400 text-amber-400" : "size-3 fill-transparent text-amber-400/40"}
        />
      ))}
    </div>
  );
}

interface ReviewRow {
  id: string;
  authorName: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  publishedAt: Date;
}

/** Компактна карта-отзив за marquee реда. */
function ReviewCard({ r }: { r: ReviewRow }) {
  return (
    <figure className="mx-3 flex h-full w-[300px] shrink-0 flex-col rounded-2xl border border-foreground/10 bg-cream p-5 sm:w-[340px]">
      <div className="flex items-center gap-3">
        <ReviewAvatar name={r.authorName} photo={r.authorPhoto} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{r.authorName}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Stars count={r.rating} />
            <span className="truncate">· {dateFmt.format(r.publishedAt)}</span>
          </div>
        </div>
        <GoogleG className="size-4 shrink-0 opacity-90" />
      </div>
      <blockquote className="mt-3 line-clamp-4 text-sm leading-relaxed text-foreground/80">{r.text}</blockquote>
    </figure>
  );
}

export async function ReviewsSplit() {
  const [google, summaryRow] = await Promise.all([
    db.query.googleReviews.findMany({ orderBy: (r, { desc }) => [desc(r.publishedAt)], limit: 50 }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "google_reviews_summary") }),
  ]);

  if (google.length === 0) return null;

  // Реалните брой/рейтинг са от целия Google профил (вкл. отзивите само със
  // звезди), а не от заредените карти — иначе би показвало 5,0 вместо реалните 4,8.
  const summary = summaryRow?.value as { rating: number; total: number; placeUrl?: string } | undefined;
  const avgRating = summary?.rating ?? google.reduce((s, r) => s + r.rating, 0) / google.length;
  const totalCount = summary?.total ?? google.length;
  const placeUrl = summary?.placeUrl ?? "https://www.google.com/search?q=Euphoria+Hair+Beauty+Bar+Varna";

  // Два хоризонтални реда (компактно — височината не расте с броя отзиви).
  const half = Math.ceil(google.length / 2);
  const top = google.slice(0, half);
  const bottom = google.slice(half);

  return (
    <section id="reviews" className="relative overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Отзиви</span>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] font-medium text-balance md:text-6xl">
              Какво казват клиентите.
            </h2>
            <a
              href={placeUrl}
              target="_blank"
              rel="noopener"
              className="mt-6 inline-flex items-center gap-3 rounded-full border border-foreground/15 bg-cream px-5 py-2.5 transition hover:border-foreground/30"
            >
              <GoogleG className="size-5" />
              <span className="font-display text-2xl font-medium leading-none">{avgRating.toFixed(1)}</span>
              <Stars count={Math.round(avgRating)} />
              <span className="text-sm text-muted-foreground">· {totalCount} отзива</span>
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="mt-12 flex flex-col gap-4">
          <Marquee pauseOnHover>
            {top.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </Marquee>
          {bottom.length > 0 && (
            <Marquee reverse pauseOnHover>
              {bottom.map((r) => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </Marquee>
          )}
        </div>
      </Reveal>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent lg:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent lg:w-32" />

      <div className="mt-10 text-center">
        <a
          href={placeUrl}
          target="_blank"
          rel="noopener"
          className="text-sm text-foreground/70 underline decoration-dotted underline-offset-4 hover:text-foreground"
        >
          Виж всички {totalCount} отзива в Google →
        </a>
      </div>
    </section>
  );
}
