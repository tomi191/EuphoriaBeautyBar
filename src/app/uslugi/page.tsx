import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ServiceCard } from "@/components/service/service-card";
import { Reveal } from "@/components/reactbits/reveal";
import { Button } from "@/components/ui/button";
import { getServiceCatalog } from "@/lib/data/service-catalog";

export const metadata: Metadata = {
  title: "Услуги — коса, нокти и козметика във Варна",
  alternates: { canonical: "/uslugi" },
  description:
    "Пълен каталог услуги в Euphoria Beauty Bar — фризьорство, терапии, маникюр, педикюр и козметика с премиум продукти.",
  openGraph: {
    title: "Услуги — коса, нокти и козметика във Варна",
    description: "Пълен каталог услуги в Euphoria Beauty Bar с прозрачни цени.",
    url: "/uslugi",
  },
};

export default async function UslugiPage() {
  const serviceCategories = await getServiceCatalog();
  return (
    <>
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <div className="max-w-3xl">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">
                Каталог услуги
              </p>
              <h1 className="font-display text-5xl font-medium text-balance md:text-6xl lg:text-7xl">
                Всичко, от което <span className="gradient-text">красотата</span> ти има нужда.
              </h1>
              <p className="mt-6 max-w-xl font-serif text-xl italic text-muted-foreground">
                Четири направления и над 60 услуги, с прозрачни цени и професионални марки.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
            {serviceCategories.map((category, idx) => (
              <Reveal key={category.slug} delay={idx * 0.08}>
                <ServiceCard category={category} index={idx} priority={idx === 0} />
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.4}>
            <div className="mt-16 rounded-3xl border border-border/60 bg-mint/30 p-10 text-center md:p-16">
              <h2 className="font-display text-3xl font-medium md:text-4xl">
                Не намираш услугата, която търсиш?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                Свържи се с нас — често правим персонализирани комбинации и пакети.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                  <Link href="/contacts">Свържи се <ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
