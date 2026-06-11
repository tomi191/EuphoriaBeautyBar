import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { galleryImages } from "@/lib/data/gallery";

/**
 * FeaturedGallery — секция „резултати" на началната страница. Изведена нагоре,
 * защото доказателството (реални работи) печели доверие рано. Подбрани 6 кадъра
 * в 100% качество; пълната галерия е на /galeriya.
 */
export function FeaturedGallery() {
  const shots = galleryImages.slice(0, 6);

  return (
    <section id="gallery" className="relative overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <Reveal>
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Нашата работа
              </span>
              <h2 className="mt-5 font-display text-5xl leading-[1] font-medium text-balance md:text-7xl">
                Реални работи от <em className="font-serif italic text-primary">салона</em>.
              </h2>
            </div>
            <div className="md:col-span-4 md:text-right">
              <Link
                href="/galeriya"
                className="group inline-flex items-center gap-2 font-medium text-foreground"
              >
                <span className="border-b border-foreground/30 transition-colors group-hover:border-foreground">
                  Виж цялата галерия
                </span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {shots.map((img) => (
              <Link
                key={img.id}
                href="/galeriya"
                aria-label="Виж галерията"
                className="group relative aspect-[4/5] overflow-hidden rounded-md bg-secondary"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  quality={75}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
