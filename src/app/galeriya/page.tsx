import type { Metadata } from "next";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { galleryImages } from "@/lib/data/gallery";

export const metadata: Metadata = {
  title: "Галерия",
  description:
    "Преди и след трансформации, прически, маникюри и сватбени стилове от Euphoria Hair & Beauty Bar във Варна.",
};

export default function GalleryPage() {
  return (
    <>
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Нашата работа
            </p>
            <BlurText
              as="h1"
              text="Галерия с трансформации"
              className="max-w-3xl font-display text-5xl font-medium text-balance md:text-6xl lg:text-7xl"
            />
            <p className="mt-6 max-w-xl font-serif text-xl italic text-muted-foreground">
              Реални работи от салона: боядисване, прически и маникюр.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <GalleryGrid images={galleryImages} />
        </div>
      </section>
    </>
  );
}
