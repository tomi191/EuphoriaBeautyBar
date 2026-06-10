import Image from "next/image";
import { Quote, Star } from "lucide-react";
import { db } from "@/lib/db";
import { Reveal } from "@/components/reactbits/reveal";
import { Marquee } from "@/components/reactbits/marquee";
import { testimonials as fallbackTestimonials } from "@/lib/data/testimonials";

const dateFmt = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" });

export async function ReviewsSplit() {
  const [google, manual] = await Promise.all([
    db.query.googleReviews.findMany({ orderBy: (r, { desc }) => [desc(r.publishedAt)], limit: 8 }),
    db.query.testimonials.findMany({
      where: (t, { eq }) => eq(t.approved, true),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
      limit: 6,
    }),
  ]);

  const manualList = manual.length > 0 ? manual : fallbackTestimonials.map((t, i) => ({ ...t, id: `m-${i}` }));
  const hasGoogle = google.length > 0;
  const avgRating = hasGoogle ? google.reduce((s, r) => s + r.rating, 0) / google.length : 0;

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
                <div className="inline-flex items-center gap-3 rounded-full border border-foreground/15 bg-cream px-4 py-2">
                  <span className="font-display text-2xl font-medium">{avgRating.toFixed(1)}</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-3.5 ${i < Math.round(avgRating) ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    · {google.length} отзива от Google
                  </span>
                </div>
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
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50">Google ревюта</p>
                    <h3 className="mt-1 font-display text-2xl">От Google Business Profile</h3>
                  </div>
                  <a
                    href="https://www.google.com/search?q=Euphoria+Hair+Beauty+Bar+Varna"
                    target="_blank"
                    rel="noopener"
                    className="text-sm text-foreground/70 underline decoration-dotted underline-offset-4 hover:text-foreground"
                  >
                    Виж в Google →
                  </a>
                </header>
                <ul className="space-y-5">
                  {google.slice(0, 3).map((r) => (
                    <li key={r.id} className="border-b border-foreground/10 pb-5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-full bg-mint font-medium">
                          {r.authorName[0]}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{r.authorName}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex">
                              {Array.from({ length: r.rating }).map((_, i) => (
                                <Star key={i} className="size-3 fill-foreground text-foreground" />
                              ))}
                            </div>
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
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50">Лични отзиви</p>
                  <h3 className="mt-1 font-display text-2xl">Споделени директно с нас</h3>
                </div>
              </header>

              <ul className="space-y-5">
                {manualList.slice(0, 3).map((t) => (
                  <li key={t.id} className="relative border-b border-foreground/10 pb-5 last:border-0">
                    <Quote className="absolute -top-1 right-0 size-5 text-foreground/30" strokeWidth={1.4} />
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-background text-sm font-medium">
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

        {/* Marquee на още отзиви отдолу — по 1 ред */}
        {manualList.length > 3 && (
          <div className="mt-12 border-y border-foreground/10 py-4">
            <Marquee pauseOnHover>
              {manualList.map((t) => (
                <span
                  key={t.id}
                  className="mx-6 inline-flex items-center gap-2 font-serif text-sm italic text-muted-foreground"
                >
                  <Star className="size-3.5 fill-foreground text-foreground" />
                  &ldquo;{t.quote.slice(0, 80)}{t.quote.length > 80 ? "…" : ""}&rdquo;
                  <span className="text-foreground/50">— {t.name}</span>
                </span>
              ))}
            </Marquee>
          </div>
        )}
      </div>
    </section>
  );
}
