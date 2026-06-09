import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const tiles = [
  { src: "/images/gallery/g-1.webp", span: "row-span-2" },
  { src: "/images/gallery/g-7.webp", span: "" },
  { src: "/images/gallery/g-14.webp", span: "" },
  { src: "/images/gallery/g-21.webp", span: "row-span-2" },
  { src: "/images/gallery/g-28.webp", span: "" },
  { src: "/images/blog/post-2.webp", span: "" },
];

export function InstagramSection() {
  return (
    <section className="relative overflow-hidden bg-cream py-24 lg:py-32">
      <Image
        src="/illustrations/squiggle.svg"
        alt=""
        aria-hidden
        width={400}
        height={60}
        className="pointer-events-none absolute -top-2 right-12 h-10 w-1/3 text-foreground/15"
      />

      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <Reveal>
          <div className="grid items-end gap-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Зад кадър
              </span>
              <h2 className="mt-5 font-display text-5xl leading-[1] font-medium text-balance md:text-7xl">
                Виж салона <em className="font-serif italic text-primary">през обектива</em>.
              </h2>
            </div>
            <Link
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener"
              className="group inline-flex items-center gap-3 self-end md:col-span-5 md:justify-self-end"
            >
              <span className="grid size-11 place-items-center rounded-full border border-foreground/30 transition-colors group-hover:bg-foreground group-hover:text-background">
                <Instagram className="size-4" strokeWidth={1.6} />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em]">
                {siteConfig.social.instagramHandle}
              </span>
            </Link>
          </div>
        </Reveal>

        {/* Asymmetric mosaic — 6 tiles, 2 големи */}
        <div className="mt-12 grid auto-rows-[140px] grid-cols-2 gap-3 md:auto-rows-[180px] md:grid-cols-4 lg:gap-4">
          {tiles.map((tile, i) => (
            <Reveal key={tile.src} delay={i * 0.05}>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener"
                className={cn(
                  "group relative block h-full overflow-hidden rounded-md border border-foreground/10 bg-secondary",
                  tile.span,
                )}
                aria-label={`Instagram пост ${i + 1}`}
              >
                <Image
                  src={tile.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/30" />
                <div className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-background/80 opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100">
                  <ArrowUpRight className="size-4" strokeWidth={1.6} />
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
