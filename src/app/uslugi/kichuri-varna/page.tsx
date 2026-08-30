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
  // Локална money страница — „кичури цена варна" (80) + „кичури коса варна" (50).
  title: "Кичури във Варна — цена по дължина, кв. Левски",
  description:
    "Кичури на фолио във Варна при Снежана (25+ г. опит), кв. Левски. Равномерно изсветляване от корена, цени по дължина на косата. Запази час онлайн.",
  alternates: { canonical: "/uslugi/kichuri-varna" },
  openGraph: {
    title: "Кичури във Варна — салон Euphoria, кв. Левски",
    description:
      "Кичури на фолио при Снежана, 25+ г. опит, в кв. Левски, Варна. Цени по дължина. Запази час онлайн.",
    images: ["/og-image.png"],
  },
};

// Групата от ценоразписа, която тази страница показва (цените идват от БД на живо).
const PRICE_GROUPS = ["Кичури на фолио"];

const faq = [
  {
    question: "Колко струват кичури във Варна?",
    answer:
      "Цената зависи от дължината на косата — таблицата по-горе показва актуалните цени „от“ за къса, средна и дълга коса. Финалната цена потвърждаваме на място според гъстотата и колко светло искаш да стигнем.",
  },
  {
    question: "Кичури или балаяж — кое да избера?",
    answer:
      "Кичурите на фолио изсветляват от самия корен и дават по-равномерен, по-светъл резултат — подходящи са, когато искаш видима промяна в цвета. Балаяжът е ръчно нанесен мек преход с по-рядка поддръжка. Ако се колебаеш, започваме с консултация и решаваме според косата ти.",
  },
  {
    question: "Колко често се освежават кичурите?",
    answer:
      "Тъй като кичурите на фолио тръгват от корена, израстването личи по-бързо, отколкото при балаяж. Повечето клиентки идват за освежаване на около 6–10 седмици — зависи от контраста с естествения цвят и колко бързо расте косата.",
  },
  {
    question: "Може ли кичури на боядисана коса?",
    answer:
      "Може, но резултатът зависи от това какво е правено по косата досега. Затова първо правим консултация и преценяваме дали изсветляването става на едно посещение, или е по-щадящо да го разделим на стъпки.",
  },
  {
    question: "Къде правите кичури във Варна?",
    answer:
      "В салон Euphoria, кв. Левски, ул. Петър Райчев 18 — близо до центъра на Варна. Час запазваш онлайн, по телефон или във Viber.",
  },
];

export default async function KichuriVarnaPage() {
  const category = await getCatalogCategory("frizorski-uslugi");
  const groups = category?.groups.filter((g) => PRICE_GROUPS.includes(g.title)) ?? [];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate min-h-[70svh] overflow-hidden bg-cream lg:min-h-[76svh]">
        <Image
          src="/images/services/unique/kichuri-na-folio-sredna-kosa.webp"
          alt="Кичури на фолио на средна коса в салон Euphoria, кв. Левски, Варна"
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
            <span className="text-foreground">Кичури във Варна</span>
          </nav>

          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              Фризьорство · кв. Левски, Варна
            </p>
            <BlurText
              as="h1"
              text="Кичури във Варна — светлина от самия корен"
              className="max-w-3xl font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
              stagger={0.02}
            />
            <p className="mt-7 max-w-xl font-serif text-xl italic text-foreground/80">
              Кичури на фолио при Снежана — 25+ години зад стола. Равномерно изсветляване и грижа Goldwell Kerasilk след него.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запиши час за кичури
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

      {/* КАКВО СА КИЧУРИ НА ФОЛИО */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Какво представляват</p>
            <h2 className="font-display text-3xl leading-[1.1] font-medium md:text-4xl">
              Фолиото дава <span className="gradient-text">контрол</span> — кичур по кичур.
            </h2>
            <div className="mt-6 space-y-4 text-foreground/80 md:text-lg">
              <p>
                При кичурите на фолио отделяме тънки секции коса и ги изсветляваме от корена, изолирани във фолио.
                Така контролираме точно колко светлина влиза и къде — резултатът е по-равномерен и по-светъл,
                отколкото при ръчните техники.
              </p>
              <p>
                Това ги прави добрият избор, когато искаш истинска промяна на цвета — не само отблясъци по
                дължината. А след изсветляването връщаме влагата с грижа Goldwell Kerasilk или Nashi Argan.
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
              Кичури — <span className="gradient-text">цена</span> по дължина.
            </h2>
            <p className="mt-4 max-w-2xl text-foreground/75">
              Цените са „от" — финалната зависи от дължината и гъстотата и я потвърждаваме на консултацията, преди да започнем.
            </p>
          </Reveal>
          <div className="mt-10">
            <PricingTable groups={groups} categorySlug="frizorski-uslugi" />
          </div>
          <Reveal delay={0.1}>
            <p className="mt-8 text-foreground/75">
              Ако търсиш мек преход с рядка поддръжка, виж{" "}
              <Link href="/uslugi/balayazh-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                балаяж във Варна
              </Link>
              , а плътен цвят —{" "}
              <Link href="/uslugi/boyadisvane-na-kosa-varna" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                боядисване на коса
              </Link>
              . Пълният ценоразпис е при{" "}
              <Link href="/uslugi/frizorski-uslugi" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                фризьорските услуги
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
              Кичури във Варна — <span className="gradient-text">въпроси</span>.
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
              Готова за <em className="font-serif italic text-mint">кичури</em>?
            </h2>
            <p className="mt-4 text-background/70">
              Запази час онлайн — виждаш свободните часове в реално време, без обаждане.
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
            { name: "Кичури във Варна", url: `${siteConfig.url}/uslugi/kichuri-varna` },
          ]),
          serviceSchema({
            name: "Кичури на фолио",
            description:
              "Кичури на фолио във Варна, кв. Левски — равномерно изсветляване от корена при Снежана, с грижа Goldwell Kerasilk след процедурата.",
            url: `${siteConfig.url}/uslugi/kichuri-varna`,
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
