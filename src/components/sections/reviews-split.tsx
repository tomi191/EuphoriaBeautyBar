import Image from "next/image";
import { Quote, Star } from "lucide-react";
import { db } from "@/lib/db";
import { Reveal } from "@/components/reactbits/reveal";
import { Marquee } from "@/components/reactbits/marquee";
import { testimonials as fallbackTestimonials } from "@/lib/data/testimonials";

const dateFmt = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" });

/** Официалното многоцветно Google „G" — източникът на отзивите личи веднага (авторитет). */
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

/** Реална профилна снимка от Google (native <img> → директно от Google CDN, без Vercel
 *  optimizer/429); инициалът отдолу е fallback, ако снимката липсва или не зареди. */
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

/** Реден звезди в Google-златисто (1:1 с източника). */
function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export async function ReviewsSplit() {
  const [google, manual, summaryRow] = await Promise.all([
    db.query.googleReviews.findMany({ orderBy: (r, { desc }) => [desc(r.publishedAt)], limit: 24 }),
    db.query.testimonials.findMany({
      where: (t, { eq }) => eq(t.approved, true),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
      limit: 6,
    }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "google_reviews_summary") }),
  ]);

  const manualList = manual.length > 0 ? manual : fallbackTestimonials.map((t, i) => ({ ...t, id: `m-${i}` }));
  const hasGoogle = google.length > 0;
  // Реалните рейтинг/брой са от целия Google профил (вкл. отзивите само със звезди),
  // а не от заредените карти — иначе би показвало 5,0 / 24 вместо реалните 4,8 / 43.
  const summary = summaryRow?.value as { rating: number; total: number; placeUrl?: string } | undefined;
  const avgRating = summary?.rating ?? (hasGoogle ? google.reduce((s, r) => s + r.rating, 0) / google.length : 0);
  const totalGoogle = summary?.total ?? google.length;
  const placeUrl = summary?.placeUrl ?? "https://www.google.com/search?q=Euphoria+Hair+Beauty+Bar+Varna";

  return (
    <section id="reviews" className="relative overflow-hidden bg-background py-24 lg:py-32">
      <Image
        src="/illustrations/star-burst.svg"
        alt=""
        aria-hidden
        width={160}
        height={160}
        className="pointer-events-none absolute right-12 top-12 hidden h-20 w-auto opacity-50 mix-blend-multiply lg:block"
      />

      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <Reveal>
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Отзиви
              </span>
              <h2 className="mt-6 font-display text-5xl leading-[1] font-medium text-balance md:text-7xl">
                Какво казват клиентите.
              </h2>
            </div>
            {hasGoogle && (
              <div className="md:col-span-5">
                <a
                  href={placeUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-3 rounded-full border border-foreground/15 bg-cream px-4 py-2 transition hover:border-foreground/30"
                >
                  <GoogleG className="size-5" />
                  <span className="font-display text-2xl font-medium leading-none">{avgRating.toFixed(1)}</span>
                  <Stars />
                  <span className="text-sm text-muted-foreground">· {totalGoogle} отзива</span>
                </a>
              </div>
            )}
          </div>
        </Reveal>

        <div className={`mt-14 grid gap-8 ${hasGoogle ? "lg:grid-cols-2" : "lg:mx-auto lg:max-w-3xl"}`}>
          {/* GOOGLE — лява колона. Рендва се само когато има синхронизирани отзиви —
              никога placeholder-инструкция пред публиката. */}
          {hasGoogle && (
            <Reveal>
              <div className="rounded-md border border-foreground/10 bg-cream p-6 md:p-8">
                <header className="mb-6 flex items-center justify-between border-b border-foreground/10 pb-4">
                  <div className="flex items-center gap-3">
                    <GoogleG className="size-7" />
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">Отзиви от Google</p>
                      <h3 className="mt-0.5 font-display text-2xl leading-none">
                        {avgRating.toFixed(1)} от 5 · {totalGoogle} ревюта
                      </h3>
                    </div>
                  </div>
                  <a
                    href={placeUrl}
                    target="_blank"
                    rel="noopener"
                    className="shrink-0 text-sm text-foreground/70 underline decoration-dotted underline-offset-4 hover:text-foreground"
                  >
                    Виж в Google →
                  </a>
                </header>
                <ul className="space-y-5">
                  {google.slice(0, 4).map((r) => (
                    <li key={r.id} className="border-b border-foreground/10 pb-5 last:border-0">
                      <div className="flex items-center gap-3">
                        <ReviewAvatar name={r.authorName} photo={r.authorPhoto} />
                        <div>
                          <p className="text-sm font-medium">{r.authorName}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Stars count={r.rating} />
                            <span>· {dateFmt.format(r.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-foreground/80">{r.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}

          {/* MANUAL — дясна колона (пълна ширина, когато няма Google отзиви) */}
          <Reveal delay={hasGoogle ? 0.15 : 0}>
            <div className="rounded-md border border-foreground/10 bg-blush-soft p-6 md:p-8">
              <header className="mb-6 flex items-center justify-between border-b border-foreground/10 pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">Лични отзиви</p>
                  <h3 className="mt-1 font-display text-2xl">Споделени директно с нас</h3>
                </div>
              </header>

              <ul className="space-y-5">
                {manualList.slice(0, 4).map((t) => (
                  <li key={t.id} className="relative border-b border-foreground/10 pb-5 last:border-0">
                    <Quote className="absolute -top-1 right-0 size-5 text-foreground/30" strokeWidth={1.4} />
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-sm font-medium">
                        {t.initials}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.service}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-4 font-serif italic text-foreground/85">&ldquo;{t.quote}&rdquo;</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Marquee на още отзиви отдолу — реалните Google отзиви (повече от показаните
            4 в колоната се виждат в движение); личните като fallback, ако няма Google. */}
        {hasGoogle ? (
          <div className="mt-12 border-y border-foreground/10 py-4">
            <Marquee pauseOnHover>
              {google.map((r) => (
                <span
                  key={r.id}
                  className="mx-6 inline-flex items-center gap-2 font-serif text-sm italic text-muted-foreground"
                >
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  &ldquo;{r.text.slice(0, 80)}{r.text.length > 80 ? "…" : ""}&rdquo;
                  <span className="text-foreground/70">— {r.authorName}</span>
                </span>
              ))}
            </Marquee>
          </div>
        ) : (
          manualList.length > 3 && (
            <div className="mt-12 border-y border-foreground/10 py-4">
              <Marquee pauseOnHover>
                {manualList.map((t) => (
                  <span
                    key={t.id}
                    className="mx-6 inline-flex items-center gap-2 font-serif text-sm italic text-muted-foreground"
                  >
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    &ldquo;{t.quote.slice(0, 80)}{t.quote.length > 80 ? "…" : ""}&rdquo;
                    <span className="text-foreground/70">— {t.name}</span>
                  </span>
                ))}
              </Marquee>
            </div>
          )
        )}
      </div>
    </section>
  );
}
