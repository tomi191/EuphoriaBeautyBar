import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, ChevronRight, Phone } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { LineDivider } from "@/components/brand/line-divider";
import { Button } from "@/components/ui/button";
import { PricingTable } from "@/components/service/pricing-table";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { getCatalogCategory } from "@/lib/data/service-catalog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  // Локална money страница — „почистване на лице варна" (150–200/мес, KD0).
  title: "Почистване на лице във Варна — цени, кв. Левски",
  description:
    "Почистване на лице във Варна: ултразвуково, комбинирано, Hydrafacial и медицинско с GIGI Acnon. Кабинет в кв. Левски, реални цени и онлайн записване на час.",
  alternates: { canonical: "/uslugi/pochistvane-na-litse-varna" },
  openGraph: {
    title: "Почистване на лице във Варна — салон Euphoria, кв. Левски",
    description:
      "Ултразвуково, комбинирано и Hydrafacial почистване на лице в кв. Левски, Варна. Реални цени, онлайн записване.",
    images: ["/og-image.png"],
  },
};

// Групата от ценоразписа, която страницата показва (цените идват от БД на живо).
const PRICE_GROUPS = ["Почистване на лице"];

const faq = [
  {
    question: "Колко струва почистване на лице във Варна?",
    answer:
      "Зависи от процедурата: таблицата по-горе показва актуалните цени от каталога ни, от базовото ултразвуково почистване до Hydrafacial и комбинираните протоколи. Ако не си сигурна коя е за теб, започваме с преглед на кожата и препоръчваме една.",
  },
  {
    question: "Коя процедура е подходяща за моята кожа?",
    answer:
      "При замърсена кожа със комедони обикновено тръгваме от комбинирано почистване (ултразвук плюс ръчна екстракция). При склонна към акне кожа работим с медицинското почистване със серията Acnon на GIGI. Ако кожата е по-скоро дехидратирана, Hydrafacial почиства и хидратира едновременно. Финалният избор става след преглед на място.",
  },
  {
    question: "Колко често се прави почистване на лице?",
    answer:
      "За повечето типове кожа е достатъчно веднъж на месец до два. При активни възпаления козметикът може да препоръча по-кратък интервал в началото, а после разредуваме.",
  },
  {
    question: "Боли ли ултразвуковото почистване?",
    answer:
      "Не. Ултразвуковата шпатула работи повърхностно и процедурата е безболезнена. При комбинираното почистване ръчната екстракция може да е лека неприятна на отделни места, но е кратка.",
  },
  {
    question: "Къде се прави почистването на лице?",
    answer:
      "В козметичния кабинет на салон Euphoria, кв. Левски, ул. Петър Райчев 18, Варна. Час запазваш онлайн, по телефон или във Viber.",
  },
];

export default async function PochistvaneNaLitseVarnaPage() {
  const category = await getCatalogCategory("kozmetika");
  const groups = category?.groups.filter((g) => PRICE_GROUPS.includes(g.title)) ?? [];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate min-h-[70svh] overflow-hidden bg-cream lg:min-h-[76svh]">
        <Image
          src="/images/services/unique/hydrafacial-pochistvane.webp"
          alt="Почистване на лице в козметичния кабинет на Euphoria, кв. Левски, Варна"
          fill
          priority
          fetchPriority="high"
          quality={75}
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-background/45 lg:bg-gradient-to-r lg:from-background lg:via-background/80 lg:to-transparent"
        />

        <div className="relative z-10 mx-auto flex min-h-[70svh] max-w-7xl flex-col px-4 pt-28 pb-12 lg:min-h-[76svh] lg:px-10 lg:pt-32">
          <nav aria-label="Трохи" className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <Link href="/uslugi" className="hover:text-foreground">Услуги</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">Почистване на лице във Варна</span>
          </nav>

          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              Козметика · кв. Левски, Варна
            </p>
            <BlurText
              as="h1"
              text="Почистване на лице във Варна — чиста кожа без експерименти"
              className="max-w-3xl font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
              stagger={0.02}
            />
            <p className="mt-7 max-w-xl font-serif text-xl italic text-foreground/80">
              От ултразвуково до Hydrafacial: процедурата се избира според кожата ти, не по каталог. Работим с GIGI и Montibello.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запиши час за почистване
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/30 bg-background/60 px-8 backdrop-blur">
                <a href={`tel:${siteConfig.contact.phone}`}>
                  <Phone className="size-4" /> {siteConfig.contact.phoneFormatted}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <LineDivider />

      {/* КАКВО ВКЛЮЧВА */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Как избираме процедура</p>
            <h2 className="font-display text-3xl leading-[1.1] font-medium md:text-4xl">
              Кожата решава, <span className="gradient-text">не менюто</span>.
            </h2>
            <div className="mt-6 space-y-4 text-foreground/80 md:text-lg">
              <p>
                Почистването на лице е базовата козметична процедура: премахва натрупаните мъртви клетки, комедоните
                и замърсяванията, които кремовете у дома не стигат. В кабинета ни то се прави в няколко варианта:
                ултразвуково (безболезнено, повърхностно), комбинирано с ръчна екстракция (за по-замърсена кожа),
                Hydrafacial (почистване и хидратация в едно) и медицинско със серията Acnon на GIGI при склонна към
                акне кожа.
              </p>
              <p>
                Кой вариант е за теб решаваме на място, след преглед на кожата. Така не плащаш за по-тежка процедура,
                отколкото ти трябва, и не си тръгваш с по-лека, отколкото кожата иска.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ЦЕНИ — на живо от каталога */}
      <section className="border-y border-border/40 bg-secondary/40 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Цени</p>
            <h2 className="font-display text-3xl font-medium md:text-4xl">
              Почистване на лице — <span className="gradient-text">цени</span>.
            </h2>
            <p className="mt-4 max-w-2xl text-foreground/75">
              Цените са от живия ни каталог и се обновяват заедно с него.
            </p>
          </Reveal>
          <div className="mt-10">
            <PricingTable groups={groups} categorySlug="kozmetika" />
          </div>
          <Reveal delay={0.1}>
            <p className="mt-8 text-foreground/75">
              Търсиш терапия, а не почистване? Виж всички{" "}
              <Link href="/uslugi/kozmetika" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                козметични услуги и цени
              </Link>
              , или{" "}
              <Link href="/uslugi/vezhdi-i-migli-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                ламиниране и оформяне на вежди и мигли
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Често задавани въпроси</p>
            <h2 className="font-display text-3xl font-medium md:text-4xl">
              Почистване на лице — <span className="gradient-text">въпроси</span>.
            </h2>
          </Reveal>
          <div className="mt-10 divide-y divide-border/60">
            {faq.map((item, idx) => (
              <Reveal key={item.question} delay={idx * 0.04}>
                <div className="py-6">
                  <h3 className="font-display text-lg font-medium md:text-xl">{item.question}</h3>
                  <p className="mt-2 leading-relaxed text-foreground/75">{item.answer}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground py-20 text-background lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <Reveal>
            <h2 className="font-display text-4xl font-medium md:text-5xl">
              Кожата ти има нужда от <em className="font-serif italic text-mint">почистване</em>?
            </h2>
            <p className="mt-4 text-background/70">
              Запази час онлайн — виждаш свободните часове в реално време, без обаждане.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-mint px-8 text-foreground hover:bg-mint/80">
                <Link href="/zapazi-chas"><Calendar className="size-4" /> Запиши час онлайн</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-background/30 bg-transparent px-8 text-background hover:bg-background/10">
                <Link href="/uslugi/kozmetika">Всички козметични услуги <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Начало", url: siteConfig.url },
            { name: "Услуги", url: `${siteConfig.url}/uslugi` },
            { name: "Почистване на лице във Варна", url: `${siteConfig.url}/uslugi/pochistvane-na-litse-varna` },
          ]),
          serviceSchema({
            name: "Почистване на лице",
            description:
              "Почистване на лице във Варна, кв. Левски: ултразвуково, комбинирано с ръчна екстракция, Hydrafacial и медицинско със серия Acnon на GIGI.",
            url: `${siteConfig.url}/uslugi/pochistvane-na-litse-varna`,
            category: "Козметични услуги",
            catalog: groups.flatMap((g) =>
              g.items.map((i) => ({ name: i.name, price: i.price, priceCurrency: i.currency === "€" ? "EUR" : "BGN" })),
            ),
          }),
          faqSchema(faq),
        ]}
      />
    </>
  );
}
