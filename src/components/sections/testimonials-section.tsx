import { Quote, Star } from "lucide-react";
import { Marquee } from "@/components/reactbits/marquee";
import { Reveal } from "@/components/reactbits/reveal";
import { testimonials } from "@/lib/data/testimonials";
import { cn } from "@/lib/utils";

export function TestimonialsSection() {
  const firstHalf = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const secondHalf = testimonials.slice(Math.ceil(testimonials.length / 2));

  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">
              / Какво казват клиентите
            </p>
            <h2 className="font-display text-4xl font-medium text-balance md:text-5xl lg:text-6xl">
              Думи, които <span className="gradient-text">не оставят равнодушни</span>.
            </h2>
          </div>
        </Reveal>
      </div>

      <div className="relative mt-14 flex flex-col gap-4">
        <Marquee pauseOnHover>
          {firstHalf.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover>
          {secondHalf.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent" />
      </div>
    </section>
  );
}

function TestimonialCard({
  name,
  service,
  quote,
  rating,
  initials,
  className,
}: (typeof testimonials)[number] & { className?: string }) {
  return (
    <figure
      className={cn(
        "relative w-[340px] shrink-0 rounded-2xl border border-border/60 bg-card p-6 shadow-soft sm:w-[400px]",
        className,
      )}
    >
      <Quote className="absolute top-4 right-5 size-6 text-primary/30" strokeWidth={1.5} />
      <div className="flex gap-1 text-primary">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="size-3.5 fill-current" />
        ))}
      </div>
      <blockquote className="mt-4 font-serif text-base leading-relaxed text-foreground/90">
        “{quote}”
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-sm font-medium text-foreground">
          {initials}
        </div>
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{service}</div>
        </div>
      </figcaption>
    </figure>
  );
}
