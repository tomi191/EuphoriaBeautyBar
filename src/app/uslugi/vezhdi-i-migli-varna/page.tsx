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
  // Локална money страница — „оформяне на вежди варна" (100) + „вежди варна" (90)
  // + „ламиниране на мигли варна" (50–70) + „ламиниране на вежди варна" (30).
  title: "Вежди и мигли във Варна — ламиниране и оформяне, цени",
  description:
    "Оформяне и боядисване на вежди, ламиниране на вежди и мигли във Варна, кв. Левски. Реални цени и онлайн записване на час в салон Euphoria.",
  alternates: { canonical: "/uslugi/vezhdi-i-migli-varna" },
  openGraph: {
    title: "Вежди и мигли във Варна — салон Euphoria, кв. Левски",
    description:
      "Ламиниране на вежди и мигли, оформяне и боядисване на вежди в кв. Левски, Варна. Реални цени, онлайн записване.",
    images: ["/og-image.png"],
  },
};

// Групите/редовете от каталога, които страницата показва (цени на живо от БД).
const LAMINATION_GROUP = "Ламиниране";
const BROWS_GROUP = "Кола маска и оформяне на вежди";
const BROW_ITEMS = ["Оформяне вежди", "Боядисване вежди"];

const faq = [
  {
    question: "Какво е ламиниране на мигли?",
    answer:
      "Ламинирането повдига и извива естествените мигли и ги фиксира в тази форма. Резултатът е отворен поглед без изкуствени мигли и без ежедневно навиване: ефектът се носи, докато миглите се сменят естествено.",
  },
  {
    question: "Колко издържа ламинирането на вежди и мигли?",
    answer:
      "Обикновено между шест и осем седмици, колкото е и естественият цикъл на косъма. После процедурата може да се повтори.",
  },
  {
    question: "Какво прави ламинирането на вежди?",
    answer:
      "Подрежда косъмчетата в желаната посока и ги задържа така: веждата изглежда по-плътна, по-широка и „сресана“ без ежедневен гел. Подходящо е за непокорни или редки на места вежди.",
  },
  {
    question: "Колко струва оформянето на вежди във Варна?",
    answer:
      "Актуалните цени за оформяне, боядисване и ламиниране са в таблицата по-горе: тя се обновява директно от каталога на салона. Оформянето и боядисването често се комбинират в едно посещение.",
  },
  {
    question: "Къде се правят процедурите?",
    answer:
      "В салон Euphoria, кв. Левски, ул. Петър Райчев 18, Варна. Час запазваш онлайн, по телефон или във Viber.",
  },
];

export default async function VezhdiIMigliVarnaPage() {
  const category = await getCatalogCategory("kozmetika");
  const lamination = category?.groups.find((g) => g.title === LAMINATION_GROUP);
  const browsSource = category?.groups.find((g) => g.title === BROWS_GROUP);
  const groups = [
    ...(lamination ? [{ title: "Ламиниране на вежди и мигли", items: lamination.items }] : []),
    ...(browsSource
      ? [{ title: "Оформяне и боядисване на вежди", items: browsSource.items.filter((i) => BROW_ITEMS.includes(i.name)) }]
      : []),
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate min-h-[70svh] overflow-hidden bg-cream lg:min-h-[76svh]">
        <Image
          src="/images/services/unique/laminirane-migli.webp"
          alt="Ламиниране на мигли в салон Euphoria, кв. Левски, Варна"
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
            <span className="text-foreground">Вежди и мигли във Варна</span>
          </nav>

          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              Козметика · кв. Левски, Варна
            </p>
            <BlurText
              as="h1"
              text="Вежди и мигли във Варна — рамката на лицето"
              className="max-w-3xl font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
              stagger={0.02}
            />
            <p className="mt-7 max-w-xl font-serif text-xl italic text-foreground/80">
              Оформяне и боядисване на вежди, ламиниране на вежди и мигли: малките процедури с най-видимия ефект.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запиши час
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

      {/* КАКВО ПРАВИМ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Процедурите</p>
            <h2 className="font-display text-3xl leading-[1.1] font-medium md:text-4xl">
              Три процедури, <span className="gradient-text">един поглед</span>.
            </h2>
            <div className="mt-6 space-y-4 text-foreground/80 md:text-lg">
              <p>
                Оформянето на вежди сваля излишните косъмчета и дава чиста линия, съобразена с формата на лицето.
                Боядисването запълва редките участъци и прави веждата видима без молив. А ламинирането подрежда и
                задържа косъмчетата в посока: при веждите дава плътна, „сресана" форма, а при миглите дава извивка и
                отворен поглед без изкуствени мигли.
              </p>
              <p>
                Процедурите са кратки и се комбинират добре: най-често правим оформяне и боядисване в едно посещение,
                а ламинирането на вежди и мигли върви отлично заедно. Можеш да ги добавиш и към час за{" "}
                <Link href="/uslugi/pochistvane-na-litse-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                  почистване на лице
                </Link>{" "}
                или{" "}
                <Link href="/uslugi/kola-maska-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                  кола маска
                </Link>
                .
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
              Вежди и мигли — <span className="gradient-text">цени</span>.
            </h2>
            <p className="mt-4 max-w-2xl text-foreground/75">
              Цените са от живия ни каталог и се обновяват заедно с него.
            </p>
          </Reveal>
          <div className="mt-10">
            <PricingTable groups={groups} categorySlug="kozmetika" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Често задавани въпроси</p>
            <h2 className="font-display text-3xl font-medium md:text-4xl">
              Вежди и мигли — <span className="gradient-text">въпроси</span>.
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
              Погледът започва от <em className="font-serif italic text-mint">веждите</em>.
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
            { name: "Вежди и мигли във Варна", url: `${siteConfig.url}/uslugi/vezhdi-i-migli-varna` },
          ]),
          serviceSchema({
            name: "Вежди и мигли",
            description:
              "Оформяне и боядисване на вежди, ламиниране на вежди и мигли във Варна, кв. Левски — с реални цени от каталога на салон Euphoria.",
            url: `${siteConfig.url}/uslugi/vezhdi-i-migli-varna`,
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
