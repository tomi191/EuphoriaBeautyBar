import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { GooeyBlobs } from "@/components/reactbits/gooey-blobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { team } from "@/lib/data/team";

export function TeamSection() {
  const founder = team[0];

  return (
    <section className="relative overflow-hidden py-24 lg:py-36">
      <GooeyBlobs intensity="subtle" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-x-10 gap-y-12 px-4 lg:grid-cols-12 lg:px-10">
        {/* line-art SVG accent — върху mid scroll */}
        <Image
          src="/illustrations/woman-profile.svg"
          alt=""
          aria-hidden
          width={400}
          height={500}
          className="pointer-events-none absolute -top-12 right-4 hidden h-72 w-auto opacity-25 mix-blend-multiply lg:block"
        />

        <Reveal className="lg:col-span-5 lg:col-start-1 lg:row-span-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
            Снежана
          </span>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] font-medium text-balance md:text-7xl">
            Двадесет и пет
            <br />
            години
            <br />
            зад стола.
          </h2>
          <p className="mt-8 max-w-md font-serif text-lg italic text-foreground/75">
            Снежана подстригва и боядисва лично, без да я гони часовникът. За маникюра, педикюра и козметиката в салона работят отделни специалисти.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full bg-foreground px-7 text-background hover:bg-primary">
              <Link href="/zapazi-chas">
                Запиши се при Снежана <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-foreground/30 bg-transparent px-7">
              <Link href="/za-nas">Прочети историята</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7 lg:col-start-6 lg:row-span-2" delay={0.15}>
          <div className="relative">
            {/* блед mint backdrop, изместен — magazine cover ефект */}
            <div aria-hidden className="absolute inset-x-6 -bottom-6 top-12 -z-10 rounded-md bg-mint" />
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-secondary lg:aspect-[4/5]">
              <Image
                src={founder.image}
                alt={founder.name}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover object-top"
              />
            </div>
            {/* издадена signature таб */}
            <div className="absolute -bottom-3 left-6 rounded-md border border-border bg-background px-5 py-3 soft-shadow">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">
                {founder.experience} опит
              </p>
              <p className="mt-1 font-display text-xl">{founder.name}</p>
              <p className="text-xs text-muted-foreground">{founder.role}</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5 lg:col-start-1" delay={0.25}>
          <figure className="relative max-w-md pt-10">
            <span aria-hidden className="absolute -left-4 top-0 font-display text-7xl leading-none text-primary/30">&ldquo;</span>
            <blockquote className="font-serif text-2xl leading-snug italic text-foreground/85 md:text-3xl">
              Никога не правя прическа &lsquo;по принцип&rsquo;. Гледам формата на лицето, типа на косата и начина на живот. После предлагам.
            </blockquote>
            <figcaption className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              — Снежана Саблева
            </figcaption>
          </figure>
        </Reveal>

        <Reveal className="lg:col-span-7 lg:col-start-6" delay={0.3}>
          <div className="border-t border-foreground/10 pt-6 lg:pt-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Специализации</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {founder.specialties.map((s) => (
                <Badge key={s} variant="secondary" className="rounded-full bg-blush-soft px-3 py-1.5 text-xs font-normal text-foreground hover:bg-blush">
                  {s}
                </Badge>
              ))}
            </div>

            <Link
              href="/karieri"
              className="group mt-10 flex flex-wrap items-center justify-between gap-4 rounded-md border border-dashed border-foreground/30 bg-background/50 p-5 text-sm transition-colors hover:border-foreground/60 hover:bg-background"
            >
              <span className="flex items-center gap-3">
                <Briefcase className="size-4 text-foreground/60" strokeWidth={1.6} />
                <span>
                  <strong className="font-medium">Свободно място под наем.</strong>{" "}
                  <span className="text-muted-foreground">Търсим маникюрист или козметик за салона.</span>
                </span>
              </span>
              <span className="text-sm font-medium transition-transform group-hover:translate-x-1">
                Виж позициите →
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
