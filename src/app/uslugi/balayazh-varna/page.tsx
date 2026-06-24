import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, ChevronRight, Phone } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { LineDivider } from "@/components/brand/line-divider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { team } from "@/lib/data/team";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  // Signature локална страница — „балаяж варна" + национален чадър „балаяж" (6K).
  title: "Балаяж във Варна, кв. Левски",
  description:
    "Балаяж във Варна при Снежана (25+ г. опит), кв. Левски. Мек преход, който расте красиво, с грижа Goldwell Kerasilk. Реални цени, онлайн записване на час.",
  alternates: { canonical: "/uslugi/balayazh-varna" },
  openGraph: {
    title: "Балаяж във Варна — салон Euphoria, кв. Левски",
    description:
      "Балаяж при Снежана, 25+ г. опит, в кв. Левски, Варна. Мек преход и грижа Goldwell Kerasilk. Запази час онлайн.",
    images: ["/og-image.png"],
  },
};

const faq = [
  {
    question: "Колко издържа балаяж?",
    answer:
      "Тъй като балаяжът е с мек преход и без рязка граница на корена, израстването се вижда плавно — обикновено между посещенията минават 8 до 12 седмици. Между тях понякога стига освежаване с тонер вместо цяла процедура.",
  },
  {
    question: "Вреди ли балаяж на косата?",
    answer:
      "Балаяжът включва изсветляване, затова след процедурата препоръчваме възстановяваща грижа — работим с Goldwell Kerasilk и Nashi Argan, за да върнем влагата и блясъка на изсветлената дължина.",
  },
  {
    question: "Може ли балаяж на тъмна или вече боядисана коса?",
    answer:
      "Да, но резултатът зависи от изходния цвят и какво е правено досега. Затова преди процедурата правим консултация и преценяваме на колко стъпки да стигнем до желания тон, без да съсипем косата.",
  },
  {
    question: "Колко време отнема процедурата?",
    answer:
      "Между 3 и 5 часа според дължината и текущото състояние на косата. Запази си време предварително — балаяжът иска пълно внимание.",
  },
  {
    question: "Къде правите балаяж във Варна?",
    answer:
      "В салон Euphoria, кв. Левски, ул. Петър Райчев 18 — близо до центъра на Варна. Час запазваш онлайн, по телефон или във Viber.",
  },
];

export default function BalayazhVarnaPage() {
  const founder = team[0];

  return (
    <>
      {/* HERO — реална балаяж работа във фон + воал */}
      <section className="relative isolate min-h-[78svh] overflow-hidden bg-cream lg:min-h-[82svh]">
        <Image
          src="/images/gallery/g-1.webp"
          alt="Балаяж — мек преход на руса коса, изработен в салон Euphoria, кв. Левски, Варна"
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

        <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-7xl flex-col px-4 pt-28 pb-12 lg:min-h-[82svh] lg:px-10 lg:pt-32">
          <nav aria-label="Трохи" className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <Link href="/uslugi" className="hover:text-foreground">Услуги</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">Балаяж във Варна</span>
          </nav>

          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              Фризьорство · кв. Левски, Варна
            </p>
            <BlurText
              as="h1"
              text="Балаяж във Варна — мек преход, който расте красиво"
              className="max-w-3xl font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
              stagger={0.02}
            />
            <p className="mt-7 max-w-xl font-serif text-xl italic text-foreground/80">
              Изсветляване с ръчна техника при Снежана — 25+ години зад стола. С грижа Goldwell Kerasilk и Nashi Argan, за да издържи цветът.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запиши час за балаяж
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

      {/* КАКВО Е БАЛАЯЖ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Какво е балаяж</p>
            <h2 className="font-display text-3xl leading-[1.1] font-medium md:text-4xl">
              Цвят, нанесен <span className="gradient-text">на ръка</span> — без рязка граница.
            </h2>
            <div className="mt-6 space-y-4 text-foreground/80 md:text-lg">
              <p>
                При балаяжа боята се нанася ръчно по дължината, а не от корен до връх. Така изсветляването е меко и
                наподобява естественото избеляване от слънцето — преходът е плавен, а израстването не оставя видима
                линия на корена.
              </p>
              <p>
                Точно затова балаяжът иска по-малко поддръжка от класическите кичури: между процедурите обикновено
                минават 8–12 седмици, а често стига освежаване с тонер вместо цяло изсветляване.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* СНЕЖАНА */}
      <section className="relative overflow-hidden border-y border-border/40 bg-secondary/40 py-24 lg:py-32">
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-5">
            <div className="relative aspect-[4/5] w-full max-w-md">
              <div aria-hidden className="absolute inset-0 translate-x-5 translate-y-5 rounded-3xl bg-mint" />
              <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border/60">
                <Image
                  src={founder.imageSalon ?? founder.image}
                  alt={`${founder.name} — балаяж специалист в салон Euphoria, кв. Левски, Варна`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover object-top"
                />
              </div>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={0.1}>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">Кой ще боядиса косата ти</p>
            <h2 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">
              Балаяж при <span className="gradient-text">Снежана</span>, от 2000 г.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/85">
              Балаяжът и корекцията на цвят са сред специализациите на Снежана. Преди да започнем, сядаме за
              консултация: гледаме изходния цвят, какво е правено досега и колко поддръжка искаш да отделяш — и решаваме
              на колко стъпки да стигнем до тона, който търсиш, без да пресушим косата.
            </p>
            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Специализации</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {founder.specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="rounded-full text-xs font-normal">{s}</Badge>
                ))}
              </div>
            </div>
            <Button asChild size="lg" className="mt-8 h-12 rounded-full bg-foreground px-8 text-background hover:bg-foreground/90">
              <Link href="/za-nas">Повече за Снежана <ArrowRight className="size-4" /></Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* БАЛАЯЖ / КИЧУРИ / КЕРАТИН */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Кое е за теб</p>
            <h2 className="font-display text-3xl font-medium md:text-4xl">Балаяж, кичури или терапия?</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Reveal>
              <div className="h-full rounded-2xl border border-border/60 bg-card p-6">
                <h3 className="font-display text-xl">Балаяж</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">Мек, ръчно нанесен преход. Ниска поддръжка, естествен резултат — за изсветляване без рязка граница.</p>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="h-full rounded-2xl border border-border/60 bg-card p-6">
                <h3 className="font-display text-xl">Кичури на фолио</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">По-равномерно и по-светло изсветляване от корена. За по-голяма промяна в цвета.</p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl border border-border/60 bg-card p-6">
                <h3 className="font-display text-xl">Кератинова терапия</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">Не е цвят — възстановява и приглажда косата след изсветляване. Често я добавяме след балаяж.</p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="mt-8 text-foreground/75">
              Цените на балаяж, кичури и терапиите са в{" "}
              <Link href="/uslugi/frizorski-uslugi" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                ценоразписа на фризьорските услуги
              </Link>{" "}
              и{" "}
              <Link href="/uslugi/frizorski-terapii" className="font-medium text-foreground underline decoration-dotted underline-offset-4 hover:text-primary">
                фризьорските терапии
              </Link>
              . Финалната цена зависи от дължината и гъстотата — затова я потвърждаваме на консултацията.
            </p>
          </Reveal>
        </div>
      </section>

      <LineDivider />

      {/* FAQ */}
      <section className="bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Често задавани въпроси</p>
            <h2 className="font-display text-3xl font-medium md:text-4xl">
              Балаяж във Варна — <span className="gradient-text">въпроси</span>.
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
              Готова за <em className="font-serif italic text-mint">балаяж</em>?
            </h2>
            <p className="mt-4 text-background/70">
              Запази час онлайн за консултация и балаяж — виждаш свободните часове в реално време, без обаждане.
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
            { name: "Балаяж във Варна", url: `${siteConfig.url}/uslugi/balayazh-varna` },
          ]),
          serviceSchema({
            name: "Балаяж",
            description: "Балаяж (ръчно изсветляване с мек преход) във Варна, кв. Левски — при Снежана, с грижа Goldwell Kerasilk и Nashi Argan.",
            url: `${siteConfig.url}/uslugi/balayazh-varna`,
            category: "Фризьорски услуги",
          }),
          faqSchema(faq),
        ]}
      />
    </>
  );
}
