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
  // Локална money страница — „боядисване на коса варна" + „боядисване на коса цена варна".
  title: "Боядисване на коса във Варна — цени, кв. Левски",
  description:
    "Боядисване на коса във Варна при Снежана (25+ г. опит), кв. Левски. Професионални бои Montibello, корекция на цвят, реални цени по дължина. Запази час онлайн.",
  alternates: { canonical: "/uslugi/boyadisvane-na-kosa-varna" },
  openGraph: {
    title: "Боядисване на коса във Варна — салон Euphoria, кв. Левски",
    description:
      "Боядисване и корекция на цвят при Снежана, 25+ г. опит, в кв. Левски, Варна. Реални цени по дължина. Запази час онлайн.",
    images: ["/og-image.png"],
  },
};

// Групите от ценоразписа, които тази страница показва (цените идват от БД на живо).
const PRICE_GROUPS = ["Боядисване", "Корекция на цветовете"];

const faq = [
  {
    question: "Колко струва боядисване на коса във Варна?",
    answer:
      "Зависи от дължината на косата: таблицата по-горе показва актуалните цени „от“ за къса, средна и дълга коса. Финалната цена потвърждаваме на място, след като видим гъстотата и състоянието на косата.",
  },
  {
    question: "С какви бои работите?",
    answer:
      "Работим с професионални бои Montibello. Ако ползваш боя от салона, тя се таксува отделно; редът е в ценоразписа, за да няма изненади в крайната сметка.",
  },
  {
    question: "Правите ли корекция на неуспешно боядисване?",
    answer:
      "Да — корекцията на цветовете е отделна услуга в ценоразписа. Започваме с консултация: гледаме какво е правено досега и преценяваме дали корекцията става на едно посещение, или е по-щадящо да я разделим на стъпки.",
  },
  {
    question: "Боядисване или балаяж: кое да избера?",
    answer:
      "Класическото боядисване покрива цялата коса в плътен цвят от корена, включително покриване на бели коси. Балаяжът е ръчно изсветляване с мек преход и по-рядка поддръжка. Ако се колебаеш, идваш на консултация и решаваме заедно според косата и колко поддръжка ти е удобна.",
  },
  {
    question: "Къде боядисвате коса във Варна?",
    answer:
      "В салон Euphoria, кв. Левски, ул. Петър Райчев 18, близо до центъра на Варна. Час запазваш онлайн, по телефон или във Viber.",
  },
];

export default async function BoyadisvaneNaKosaVarnaPage() {
  const category = await getCatalogCategory("frizorski-uslugi");
  const groups = category?.groups.filter((g) => PRICE_GROUPS.includes(g.title)) ?? [];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate min-h-[70svh] overflow-hidden bg-cream lg:min-h-[76svh]">
        <Image
          src="/images/services/unique/boyadisvane-dalga-kosa.webp"
          alt="Боядисване на дълга коса в салон Euphoria, кв. Левски, Варна"
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
            <span className="text-foreground">Боядисване на коса във Варна</span>
          </nav>

          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              Фризьорство · кв. Левски, Варна
            </p>
            <BlurText
              as="h1"
              text="Боядисване на коса във Варна — цвят, който отива на теб"
              className="max-w-3xl font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
              stagger={0.02}
            />
            <p className="mt-7 max-w-xl font-serif text-xl italic text-foreground/80">
              При Снежана, 25+ години зад стола. Професионални бои Montibello и честна преценка кой цвят ще издържи на твоята коса.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запиши час за боядисване
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

      {/* ЗАЩО ПРИ НАС */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Преди боята</p>
            <h2 className="font-display text-3xl leading-[1.1] font-medium md:text-4xl">
              Първо <span className="gradient-text">консултация</span>, после цвят.
            </h2>
            <div className="mt-6 space-y-4 text-foreground/80 md:text-lg">
              <p>
                Цветът не е само каталог с мостри. Преди да боядисаме, гледаме изходния цвят, какво е правено по
                косата досега и как живееш с нея: колко често можеш да идваш за освежаване. Чак тогава избираме
                нюанс, който ще изглежда добре и след четвъртата седмица, не само на излизане от салона.
              </p>
              <p>
                Ако косата е боядисвана многократно или домашен експеримент е излязъл встрани, това не е боядисване, а{" "}
                <strong>корекция на цветовете</strong>: отделна услуга, при която работим на стъпки, за да не
                пресушим косата. И двете са в ценоразписа по-долу.
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
              Боядисване на коса — <span className="gradient-text">цени</span> по дължина.
            </h2>
            <p className="mt-4 max-w-2xl text-foreground/75">
              Цените са „от“; финалната зависи от дължината и гъстотата и я потвърждаваме на консултацията, преди да започнем.
            </p>
          </Reveal>
          <div className="mt-10">
            <PricingTable groups={groups} categorySlug="frizorski-uslugi" />
          </div>
          <Reveal delay={0.1}>
            <p className="mt-8 text-foreground/75">
              Търсиш изсветляване вместо плътен цвят? Виж{" "}
              <Link href="/uslugi/balayazh-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                балаяж във Варна
              </Link>{" "}
              и{" "}
              <Link href="/uslugi/kichuri-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                кичури на фолио
              </Link>
              , а пълният ценоразпис е при{" "}
              <Link href="/uslugi/frizorski-uslugi" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                фризьорски услуги
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
              Боядисване във Варна — <span className="gradient-text">въпроси</span>.
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
              Време е за <em className="font-serif italic text-mint">нов цвят</em>?
            </h2>
            <p className="mt-4 text-background/70">
              Запази час онлайн: виждаш свободните часове в реално време, без обаждане.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-mint px-8 text-foreground hover:bg-mint/80">
                <Link href="/zapazi-chas"><Calendar className="size-4" /> Запиши час онлайн</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-background/30 bg-transparent px-8 text-background hover:bg-background/10">
                <Link href="/galeriya">Виж галерията <ArrowRight className="size-4" /></Link>
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
            { name: "Боядисване на коса във Варна", url: `${siteConfig.url}/uslugi/boyadisvane-na-kosa-varna` },
          ]),
          serviceSchema({
            name: "Боядисване на коса",
            description:
              "Боядисване на коса и корекция на цвят във Варна, кв. Левски, при Снежана, с професионални бои Montibello.",
            url: `${siteConfig.url}/uslugi/boyadisvane-na-kosa-varna`,
            category: "Фризьорски услуги",
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
