import type { Metadata } from "next";
import Image from "next/image";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { BlurText } from "@/components/reactbits/blur-text";
import { galleryImages } from "@/lib/data/gallery";

export const metadata: Metadata = {
  title: "Галерия",
  alternates: { canonical: "/galeriya" },
  description:
    "Преди и после: боядисване, прически, маникюри и сватбени стилове от Euphoria Hair & Beauty Bar във Варна.",
};

export default function GalleryPage() {
  return (
    <>
      <section className="relative isolate min-h-[58svh] overflow-hidden bg-cream lg:min-h-[62svh]">
        {/* Фон — реална работа от салона */}
        <Image
          src="/images/gallery/g-7.webp"
          alt="Реална работа от салон Euphoria — боядисана коса с обем, кв. Левски, Варна"
          fill
          priority
          fetchPriority="high"
          quality={75}
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        {/* Топъл воал — четим текст отляво, снимката се отваря отдясно */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-background/45 lg:bg-gradient-to-r lg:from-background lg:via-background/80 lg:to-transparent"
        />

        <div className="relative z-10 mx-auto flex min-h-[58svh] max-w-7xl flex-col justify-center px-4 pt-28 pb-12 lg:min-h-[62svh] lg:px-8 lg:pt-32">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Нашата работа
          </p>
          <BlurText
            as="h1"
            text="Преди и после"
            className="max-w-3xl font-display text-5xl font-medium text-balance md:text-6xl lg:text-7xl"
          />
          <p className="mt-6 max-w-xl font-serif text-xl italic text-foreground/80">
            Реални работи от салона: боядисване, прически и маникюр.
          </p>
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
