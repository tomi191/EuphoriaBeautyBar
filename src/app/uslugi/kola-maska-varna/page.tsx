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
  // Локална money страница — „кола маска варна" (150–200/мес, KD0).
  title: "Кола маска във Варна — цени по зони, кв. Левски",
  description:
    "Кола маска във Варна по зони: крака, ръце, подмишници, горна устна. Салон в кв. Левски с реални цени за всяка зона и онлайн записване на час.",
  alternates: { canonical: "/uslugi/kola-maska-varna" },
  openGraph: {
    title: "Кола маска във Варна — салон Euphoria, кв. Левски",
    description:
      "Кола маска по зони в кв. Левски, Варна. Реални цени за всяка зона, онлайн записване.",
    images: ["/og-image.png"],
  },
};

// Редовете „Кола маска — ..." от групата в каталога (цените идват от БД на живо).
const GROUP_TITLE = "Кола маска и оформяне на вежди";
const ITEM_PREFIX = "Кола маска";

const faq = [
  {
    question: "Колко струва кола маска във Варна?",
    answer:
      "Цената е по зони: таблицата по-горе показва актуалните цени за половин и цели крака, ръце, подмишници и горна устна. Ако комбинираш няколко зони в едно посещение, кажи го при запазването, за да ти заделим достатъчно време.",
  },
  {
    question: "Колко издържа резултатът от кола маската?",
    answer:
      "Обикновено между три и четири седмици, според това колко бързо расте косъмът при теб. С редовни процедури косъмчетата изтъняват и растат по-бавно, така че интервалът често се удължава.",
  },
  {
    question: "Боли ли кола маската?",
    answer:
      "Дръпването щипе за момент, най-осезаемо на първата процедура. При редовна епилация усещането отслабва, защото косъмът става по-тънък. Работим бързо и по зони, за да е максимално кратко.",
  },
  {
    question: "Как да се подготвя за процедурата?",
    answer:
      "Косъмчетата трябва да са поне 5–6 мм, за да ги хване восъкът. Ден по-рано е добре кожата да е ексфолирана, а в самия ден: без масла и лосиони върху зоната.",
  },
  {
    question: "Къде правите кола маска във Варна?",
    answer:
      "В салон Euphoria, кв. Левски, ул. Петър Райчев 18 — близо до центъра на Варна. Час запазваш онлайн, по телефон или във Viber.",
  },
];

export default async function KolaMaskaVarnaPage() {
  const category = await getCatalogCategory("kozmetika");
  const sourceGroup = category?.groups.find((g) => g.title === GROUP_TITLE);
  const groups = sourceGroup
    ? [{ title: "Кола маска — цени по зони", items: sourceGroup.items.filter((i) => i.name.startsWith(ITEM_PREFIX)) }]
    : [];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate min-h-[70svh] overflow-hidden bg-cream lg:min-h-[76svh]">
        <Image
          src="/images/services/unique/kola-maska-tseli-kraka.webp"
          alt="Кола маска на цели крака в салон Euphoria, кв. Левски, Варна"
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
            <span className="text-foreground">Кола маска във Варна</span>
          </nav>

          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              Козметика · кв. Левски, Варна
            </p>
            <BlurText
              as="h1"
              text="Кола маска във Варна — гладка кожа за седмици, не за дни"
              className="max-w-3xl font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
              stagger={0.02}
            />
            <p className="mt-7 max-w-xl font-serif text-xl italic text-foreground/80">
              Епилация с восък по зони: бързо, хигиенично и с ясна цена за всяка зона, преди да седнеш.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запиши час за кола маска
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

      {/* ЗАЩО ВОСЪК */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Какво представлява</p>
            <h2 className="font-display text-3xl leading-[1.1] font-medium md:text-4xl">
              Восъкът хваща косъма <span className="gradient-text">от корена</span>.
            </h2>
            <div className="mt-6 space-y-4 text-foreground/80 md:text-lg">
              <p>
                Кола маската е епилация с топъл восък: восъкът обхваща косъма и го изтегля от корена, а не го реже
                на повърхността като самобръсначката. Затова кожата остава гладка седмици, а не дни, и няма
                твърдо набождащо израстване.
              </p>
              <p>
                Работим по зони, с ясна цена за всяка: половин или цели крака, ръце, подмишници, горна устна.
                Можеш да комбинираш зони в едно посещение и да добавиш оформяне на вежди към същия час.
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
              Кола маска — <span className="gradient-text">цени по зони</span>.
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
              Ако търсиш и грижа за веждите — виж{" "}
              <Link href="/uslugi/vezhdi-i-migli-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                оформяне и ламиниране на вежди и мигли
              </Link>
              , или всички{" "}
              <Link href="/uslugi/kozmetika" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                козметични услуги и цени
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
              Кола маска — <span className="gradient-text">въпроси</span>.
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
              Гладка кожа <em className="font-serif italic text-mint">до дни</em>?
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
            { name: "Кола маска във Варна", url: `${siteConfig.url}/uslugi/kola-maska-varna` },
          ]),
          serviceSchema({
            name: "Кола маска",
            description:
              "Кола маска (епилация с восък) във Варна, кв. Левски — по зони: крака, ръце, подмишници, горна устна. Реални цени за всяка зона.",
            url: `${siteConfig.url}/uslugi/kola-maska-varna`,
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
