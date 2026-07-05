import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, ChevronRight, Phone } from "lucide-react";
import { PricingTable } from "@/components/service/pricing-table";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getServiceCatalog, getCatalogCategory } from "@/lib/data/service-catalog";
import { siteConfig } from "@/lib/site";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { slugify } from "@/lib/utils";

/**
 * Локални FAQ per услуга-категория — видими на страницата + FAQPage schema.
 * Заземени в реални факти (кв. Левски, марки, онлайн записване); цени само
 * където са сигурни от каталога. Силен GEO/AI-Overviews citability сигнал.
 */
const SERVICE_FAQ: Record<string, Array<{ question: string; answer: string }>> = {
  "frizorski-uslugi": [
    { question: "В кой квартал на Варна правите фризьорски услуги?", answer: "В кв. Левски, на ул. Петър Райчев 18, близо до центъра на Варна. Час запазваш онлайн, по телефон или във Viber." },
    { question: "С какви бои за коса работите?", answer: "С професионалните марки Montibello и Goldwell. Боята е включена в цената на боядисването." },
    { question: "Колко време отнема балаяж?", answer: "Между 3 и 5 часа според дължината и текущото състояние на косата — затова правим кратка консултация преди процедурата." },
    { question: "Правите ли официални прически за сватби и абитуриентски?", answer: "Да — за сватби, балове и абитуриентски. Препоръчваме предварителна проба, за да сме сигурни, че прическата ще издържи целия ден." },
    { question: "Правите ли мъжко подстригване?", answer: "Да, мъжкото подстригване е сред редовните ни услуги, заедно с дамско подстригване, боядисване и балаяж." },
  ],
  "frizorski-terapii": [
    { question: "Какво е кератинова терапия?", answer: "Метод за изправяне и подхранване на косата — прави я гладка, мека и без наелектризиране. Работим с Kerasilk на Goldwell." },
    { question: "За каква коса са терапиите?", answer: "За коса след боядисване или избелване — възстановяват, хидратират и връщат блясъка. Терапията избираме според състоянието на косата ти." },
    { question: "Колко издържа ефектът от терапията?", answer: "Вижда се веднага и се задържа седмици при правилна домашна грижа — например безсулфатен шампоан." },
    { question: "Къде се намирате?", answer: "В кв. Левски, Варна, на ул. Петър Райчев 18. Запазваш час онлайн на euphoriabeauty.eu/zapazi-chas." },
  ],
  "manikyur-i-pedikyur": [
    { question: "Колко издържа гел лак?", answer: "Обикновено 2–3 седмици според растежа на ноктите и ежедневната грижа. Препоръчваме нова процедура, когато се появи израстване." },
    { question: "Какво е медицински педикюр?", answer: "Апаратна обработка за проблеми като врастнал нокът, мазоли и напукани пети — различава се от козметичния педикюр. За преценка и цена попитай при записване." },
    { question: "Правите ли маникюр в кв. Левски?", answer: "Да — салонът е в кв. Левски, Варна, на ул. Петър Райчев 18. Предлагаме маникюр с гел или обикновен лак, терапии за нокти, класически и медицински педикюр." },
    { question: "Мога ли да запазя час за маникюр онлайн?", answer: "Да — на euphoriabeauty.eu/zapazi-chas виждаш свободните часове в реално време и запазваш без обаждане." },
  ],
  kozmetika: [
    { question: "Какво е Hydra Facial?", answer: "Модерно дълбоко почистване, което едновременно хидратира и ексфолира кожата — подходящо за освежаване и хидратация." },
    { question: "За каква кожа са лицевите процедури?", answer: "Протоколът избираме според типа кожа и целта — почистване, хидратация, anti-age, анти-акне или анти-пигмент. Работим с GIGI, Montibello и Toskani." },
    { question: "Правите ли ламиниране на мигли и вежди?", answer: "Да — ламиниране на мигли и на вежди, плюс оформяне и боядисване на вежди." },
    { question: "В кой квартал на Варна сте?", answer: "В кв. Левски, на ул. Петър Райчев 18, близо до центъра. Запазваш час онлайн, по телефон или във Viber." },
  ],
};

/**
 * Уникален локален текст per категория (200–250 думи) — под hero, над ценоразписа.
 * Адресира тънкото съдържание (беше 1 цитат). Заземено в реални марки/процес/кв. Левски,
 * без суперлативи. Дава дълбочина за ранкиране + passage за AI Overviews.
 */
const SERVICE_INTRO: Record<string, string[]> = {
  "frizorski-uslugi": [
    "Във фризьорската зала на Euphoria, в кв. Левски, работи Снежана Саблева — зад стола от 2000 г. Боядисване, балаяж, кичури и официални прически правим с Montibello и Goldwell, защото държим цветът да издържи повече от едно миене.",
    "Преди боя или изсветляване сядаме за кратка консултация: гледаме типа коса, какво е правено досега и колко поддръжка искаш да отделяш. За сватби, балове и абитуриентски препоръчваме предварителна проба, за да сме сигурни, че прическата ще издържи целия ден. Салонът е на ул. Петър Райчев 18, близо до центъра на Варна — час запазваш онлайн в реално време, по телефон или във Viber.",
  ],
  "frizorski-terapii": [
    "Терапиите за коса избираме според състоянието ѝ — суха, изтощена или увредена след боядисване и изсветляване. Работим с кератин Kerasilk на Goldwell за изправяне и гладкост, ампули Nashi Argan за дълбоко подхранване, ламеларна вода за блясък и минерални ампули за здравина.",
    "Терапия добавяме често след балаяж или боядисване, за да върнем влагата, която изсветляването отнема. Ефектът се вижда веднага, а с правилна домашна грижа — безсулфатен шампоан и маска веднъж седмично — се задържа седмици. Косата я поема Снежана, с над 25 години опит. Салонът е в кв. Левски, Варна; час запазваш онлайн.",
  ],
  "manikyur-i-pedikyur": [
    "Маникюрът и педикюрът в Euphoria се правят в стерилни условия — инструментите обработваме между всеки клиент. Предлагаме маникюр с гел или обикновен лак, терапии за нокти и ръце, класически и медицински педикюр.",
    "Гел лакът обикновено издържа 2–3 седмици; препоръчваме нова процедура при израстване, не по-късно, за да остане ноктът здрав. Медицинският педикюр е за конкретни проблеми — врастнал нокът, мазоли, напукани пети — и се различава от козметичния. Салонът е на ул. Петър Райчев 18, кв. Левски, Варна. Маникюр в квартала запазваш онлайн в реално време, без обаждане.",
  ],
  kozmetika: [
    "Лицевите терапии подбираме според типа кожа и целта — почистване, хидратация, anti-age, анти-акне или анти-пигмент. Работим с GIGI за почистване, карбокси терапия и проблемна кожа, Montibello за лифтинг и кислородни терапии, Toskani за безиглена мезотерапия.",
    "Освен лице правим ламиниране на мигли и вежди, оформяне и боядисване на вежди, и кола маска. Преди процедура преценяваме състоянието на кожата, за да изберем правилния протокол. Кабинетът е в салона на ул. Петър Райчев 18, кв. Левски, Варна — час запазваш онлайн, по телефон или във Viber.",
  ],
};

interface ServiceDetailParams {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // DB може да липсва на build-time (Vercel preview без DATABASE_URL) → on-demand.
  try {
    const cats = await getServiceCatalog();
    return cats.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: ServiceDetailParams): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCatalogCategory(slug);
  if (!category) return { robots: { index: false } };
  return {
    // metaTitle носи „Варна, кв. Левски" (template добавя " · Euphoria"); fallback към seoTitle.
    title: category.metaTitle ?? category.seoTitle,
    description: category.metaDescription ?? category.description,
    alternates: { canonical: `/uslugi/${category.slug}` },
    openGraph: {
      type: "website",
      url: `/uslugi/${category.slug}`,
      title: category.seoTitle,
      description: category.metaDescription ?? category.description,
      images: [category.heroImage],
    },
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailParams) {
  const { slug } = await params;
  const allCategories = await getServiceCatalog();
  const category = allCategories.find((c) => c.slug === slug);
  if (!category) notFound();

  const otherCategories = allCategories.filter((c) => c.slug !== category.slug);

  // Прави anchor IDs за всяка група
  const groupSections = category.groups.map((g) => ({
    id: `g-${slugify(g.title)}`,
    label: g.title,
    items: g.items,
  }));

  const prices = category.groups.flatMap((g) => g.items.map((i) => i.price));
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const priceCurrency = category.groups[0]?.items[0]?.currency === "€" ? "EUR" : "BGN";

  const faq = SERVICE_FAQ[category.slug] ?? [];
  const intro = SERVICE_INTRO[category.slug] ?? [];

  return (
    <>
      {/* HERO — реалната снимка на услугата във фон + топъл воал (като началната страница) */}
      <section id="info" className="relative isolate min-h-[70svh] overflow-hidden bg-cream lg:min-h-[76svh]">
        {/* Фон — реалната снимка на услугата */}
        <Image
          src={category.heroImage}
          alt={`${category.title} в Euphoria, кв. Левски, Варна`}
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

        <div className="relative z-10 mx-auto flex min-h-[70svh] max-w-7xl flex-col px-4 pt-28 pb-12 lg:min-h-[76svh] lg:px-10 lg:pt-32">
          <nav aria-label="Трохи" className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <Link href="/uslugi" className="hover:text-foreground">Услуги</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{category.title}</span>
          </nav>

          <div className="flex flex-1 items-center">
            <div className="max-w-2xl">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                {category.shortTitle} · кв. Левски, Варна
              </p>
              <BlurText
                as="h1"
                text={category.seoTitle}
                className="font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
                stagger={0.025}
              />
              <p className="mt-6 max-w-xl font-serif text-xl italic text-foreground/80">
                {category.tagline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
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
        </div>
      </section>

      {/* OPISANIE / longDescription + уникален локален текст */}
      <section className="border-y border-border/40 bg-secondary/40 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="text-center font-serif text-xl leading-relaxed italic text-foreground/85 md:text-2xl">
              &ldquo;{category.longDescription}&rdquo;
            </p>
          </Reveal>
          {intro.length > 0 && (
            <Reveal delay={0.1}>
              <div className="mt-10 space-y-4 border-t border-border/50 pt-10 text-foreground/80 md:text-lg">
                {intro.map((p, idx) => (
                  <p key={idx} className="leading-relaxed">{p}</p>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* PRICING — групирано с H2 anchors */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Reveal>
            <header className="mb-14 text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Прозрачни цени · {category.shortTitle} · Варна
              </p>
              <p className="font-display text-3xl font-medium md:text-4xl">
                Ценоразпис на {category.title}
              </p>
            </header>
          </Reveal>

          <div className="space-y-20">
            {groupSections.map((group, gi) => (
              <Reveal key={group.id} delay={gi * 0.05}>
                <section id={group.id} className="scroll-mt-24">
                  <header className="mb-6 flex items-baseline justify-between border-b border-border/60 pb-3">
                    <h2 className="font-display text-2xl font-medium md:text-3xl">{group.label}</h2>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {group.items.length} услуги
                    </span>
                  </header>
                  <PricingTable groups={[{ title: group.label, items: [...group.items] }]} hideHeader />
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — локални Q&A (FAQPage schema за AI Overviews / People Also Ask) */}
      {faq.length > 0 && (
        <section className="border-t border-border/40 bg-secondary/30 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <Reveal>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Често задавани въпроси</p>
              <h2 className="font-display text-3xl font-medium md:text-4xl">
                {category.shortTitle} във Варна — <span className="gradient-text">въпроси</span>.
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
      )}

      {/* CROSS-LINKS — другите 3 категории (както live сайта) */}
      <section id="drugi" className="scroll-mt-24 border-t border-border/40 bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-10">
          <Reveal>
            <div className="mb-10 grid items-end gap-4 md:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                  Други услуги
                </p>
                <h2 className="font-display text-4xl font-medium md:text-5xl">
                  Виж и <em className="font-serif italic text-primary">останалите</em>.
                </h2>
              </div>
              <p className="font-serif text-lg italic text-muted-foreground">
                Често комбинираме услуги — кератин + балаяж, маникюр + педикюр, лицева терапия + ламиниране.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            {otherCategories.map((c, idx) => (
              <Reveal key={c.slug} delay={idx * 0.06}>
                <Link
                  href={`/uslugi/${c.slug}`}
                  className="group block overflow-hidden rounded-md border border-foreground/10 bg-background transition-colors hover:border-foreground/30"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={c.heroImage}
                      alt={c.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
                      {c.shortTitle}
                    </p>
                    <h3 className="mt-2 font-display text-xl">{c.title}</h3>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                      Виж услугите{" "}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="kontakt" className="scroll-mt-24 bg-foreground py-20 text-background">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="font-display text-4xl font-medium md:text-5xl">
            Готова да опиташ <em className="font-serif italic text-mint">{category.shortTitle.toLowerCase()}</em>?
          </h2>
          <p className="mt-4 text-background/70">
            Запиши се за час по телефон, Viber или през онлайн формата ни — отговаряме лично.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-md bg-mint px-8 text-foreground hover:bg-mint/80">
              <Link href="/zapazi-chas">
                <Calendar className="size-4" /> Запиши час
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-md border-background/30 bg-transparent px-8 text-background hover:bg-background/10">
              <a href={`tel:${siteConfig.contact.phone}`}>
                <Phone className="size-4" /> {siteConfig.contact.phoneFormatted}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Начало", url: siteConfig.url },
            { name: "Услуги", url: `${siteConfig.url}/uslugi` },
            { name: category.title, url: `${siteConfig.url}/uslugi/${category.slug}` },
          ]),
          serviceSchema({
            name: category.title,
            description: category.description,
            url: `${siteConfig.url}/uslugi/${category.slug}`,
            category: category.shortTitle,
            offers: { lowPrice, highPrice, priceCurrency },
          }),
          ...(faq.length > 0 ? [faqSchema(faq)] : []),
        ]}
      />
    </>
  );
}
