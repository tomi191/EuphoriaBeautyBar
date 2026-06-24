import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, ChevronRight, Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getServiceCatalog } from "@/lib/data/service-catalog";
import { localBusinessSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  // Хипер-локална landing — таргетира „салон за красота кв. Левски Варна" +
  // „маникюр варна левски" (90 vol), заявка, която конкурентите (Чайка/център) не покриват.
  title: "Салон за красота кв. Левски, Варна",
  description:
    "Коса, нокти и лице на едно място в кв. Левски, Варна — ул. Петър Райчев 18. Снежана: 25+ г. опит. Лесно паркиране наоколо. Запази час онлайн за минута.",
  alternates: { canonical: "/salon-varna-levski" },
  openGraph: {
    title: "Салон за красота в кв. Левски, Варна — Euphoria",
    description:
      "Коса, нокти и лице на едно място в кв. Левски, Варна. Снежана с 25+ години опит. Онлайн записване на час.",
    images: ["/og-image.png"],
  },
};

// Локални FAQ — честни, заземени в реалните факти (NAP, работно време от siteConfig).
const localFaq = [
  {
    question: "В кой квартал на Варна се намира салонът?",
    answer:
      "Euphoria е в кв. Левски, на ул. Петър Райчев №18 — близо до центъра на Варна. Удобно е и за хора от съседните квартали.",
  },
  {
    question: "Има ли къде да паркирам?",
    answer:
      "В кв. Левски има улично паркиране в района около салона. Препоръчваме да дойдеш малко по-рано в по-натоварените часове.",
  },
  {
    question: "Какви услуги предлагате на едно място?",
    answer:
      "Коса, нокти и лице под един покрив — фризьорски услуги и терапии, маникюр и педикюр, и козметични процедури за лице. Може да комбинираш няколко услуги в едно посещение.",
  },
  {
    question: "Как да запазя час?",
    answer:
      "Най-бързо е онлайн — виждаш свободните часове в реално време и получаваш потвърждение по имейл. Работят и телефон +359 898 66 33 15 и Viber на същия номер.",
  },
  {
    question: "Какво е работното време?",
    answer:
      "Понеделник до петък 09:00–18:00, събота 09:00–17:00, неделя е почивен ден.",
  },
];

const DIRECTION_BLURB: Record<string, string> = {
  "frizorski-uslugi":
    "Подстригване, боядисване, балаяж и официални прически. Работим с Montibello и Goldwell.",
  "frizorski-terapii":
    "Възстановяване и хидратация за коса след боядисване — кератин Kerasilk, Nashi Argan, минерали.",
  "manikyur-i-pedikyur":
    "Класически и гел маникюр, френски и омбре дизайни, педикюр и кератинова терапия за нокти.",
  kozmetika:
    "Лицеви терапии според типа кожа, ламиниране на мигли и вежди — с GIGI, Esthemax и Montibello.",
};

export default async function SalonVarnaLevskiPage() {
  const [categories, googleReviews] = await Promise.all([
    getServiceCatalog(),
    db.query.googleReviews.findMany({ columns: { rating: true } }),
  ]);
  const rating =
    googleReviews.length > 0
      ? {
          value: googleReviews.reduce((s, r) => s + r.rating, 0) / googleReviews.length,
          count: googleReviews.length,
        }
      : undefined;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-cream pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="relative mx-auto max-w-7xl px-4 lg:px-10">
          <nav aria-label="Трохи" className="mb-8 flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">Салон кв. Левски, Варна</span>
          </nav>

          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
            Beauty bar · кв. Левски, Варна
          </p>
          <BlurText
            as="h1"
            text="Салон за красота в кв. Левски, Варна"
            className="max-w-4xl font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
            stagger={0.02}
          />
          <Reveal delay={0.3}>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-muted-foreground">
              Коса, нокти и лице на едно място — на ул. Петър Райчев 18. Снежана е зад стола от 2000 г. Час
              запазваш онлайн, по телефон или във Viber.
            </p>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-md bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запази час онлайн
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-md border-border px-8">
                <a href={`tel:${siteConfig.contact.phone}`}>
                  <Phone className="size-4" /> {siteConfig.contact.phoneFormatted}
                </a>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ТРИ НАПРАВЛЕНИЯ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-10">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Услугите ни</p>
            <h2 className="max-w-2xl font-display text-3xl font-medium md:text-4xl">
              Три направления, един салон в Левски.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {categories.map((c, idx) => (
              <Reveal key={c.slug} delay={idx * 0.06}>
                <Link
                  href={`/uslugi/${c.slug}`}
                  className="group flex h-full gap-5 overflow-hidden rounded-md border border-foreground/10 bg-background p-5 transition-colors hover:border-foreground/30"
                >
                  <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={c.heroImage}
                      alt={c.title}
                      fill
                      sizes="120px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">{c.shortTitle}</p>
                    <h3 className="mt-1 font-display text-xl">{c.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                      {DIRECTION_BLURB[c.slug] ?? c.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                      Виж услугите и цените{" "}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ЗАЩО EUPHORIA */}
      <section className="border-y border-border/40 bg-secondary/30 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Защо при нас</p>
            <h2 className="font-display text-3xl font-medium md:text-4xl">
              Коса, нокти и лице, без да обикаляш три салона.
            </h2>
            <div className="mt-6 space-y-4 text-foreground/80 md:text-lg">
              <p>
                Снежана Саблева работи с коса от 2000 г. — над 25 години зад стола. Салонът е отворен през 2023 в
                кв. Левски и събира трите направления на едно място, в стерилни условия.
              </p>
              <p>
                Работим само с професионални марки: Montibello, Goldwell Kerasilk и Nashi Argan за косата, GIGI и
                Esthemax за лицето. Час запазваш онлайн в реално време — нещо, което повечето салони в района още нямат.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ЛОКАЦИЯ + КОНТАКТИ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-5">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Намери ни</p>
            <h2 className="font-display text-3xl font-medium md:text-4xl">Как да стигнеш до нас.</h2>
            <p className="mt-4 text-muted-foreground">
              Салонът е в кв. Левски, близо до центъра на Варна. В района има улично паркиране.
            </p>

            <div className="mt-8 space-y-6">
              <InfoItem icon={MapPin} title="Адрес">
                <a href={siteConfig.address.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-primary hover:underline">
                  {siteConfig.address.full}
                </a>
              </InfoItem>
              <InfoItem icon={Phone} title="Телефон" href={`tel:${siteConfig.contact.phone}`}>
                {siteConfig.contact.phoneFormatted}
              </InfoItem>
              <InfoItem icon={MessageCircle} title="Viber" href={siteConfig.social.viber}>
                Изпрати съобщение
              </InfoItem>
              <InfoItem icon={Clock} title="Работно време">
                <ul className="space-y-1 text-sm">
                  {siteConfig.hours.map((h) => (
                    <li key={h.day} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className="font-medium">{h.close ? `${h.open} – ${h.close}` : h.open}</span>
                    </li>
                  ))}
                </ul>
              </InfoItem>
            </div>

            <Button asChild size="lg" className="mt-8 h-12 rounded-md bg-foreground px-8 text-background hover:bg-primary">
              <Link href="/zapazi-chas">
                <Calendar className="size-4" /> Запази час онлайн
              </Link>
            </Button>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.15}>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border/60 bg-secondary shadow-soft lg:aspect-auto lg:h-full">
              <iframe
                title="Euphoria Hair & Beauty Bar — кв. Левски, Варна"
                src={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.address.full)}&output=embed`}
                className="h-full min-h-[320px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/40 bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Често задавани въпроси</p>
            <h2 className="font-display text-4xl font-medium md:text-5xl">Преди да дойдеш.</h2>
          </Reveal>
          <div className="mt-10 divide-y divide-border/60">
            {localFaq.map((item, idx) => (
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

      <JsonLd
        data={[
          localBusinessSchema(rating),
          breadcrumbSchema([
            { name: "Начало", url: siteConfig.url },
            { name: "Салон кв. Левски, Варна", url: `${siteConfig.url}/salon-varna-levski` },
          ]),
          faqSchema(localFaq),
        ]}
      />
    </>
  );
}

function InfoItem({
  icon: Icon,
  title,
  children,
  href,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  href?: string;
}) {
  const Wrapper: React.ElementType = href ? "a" : "div";
  return (
    <div className="flex items-start gap-4">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="size-5" strokeWidth={1.6} />
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
        <Wrapper
          {...(href ? { href, target: href.startsWith("http") || href.startsWith("viber:") ? "_blank" : undefined, rel: "noopener" } : {})}
          className="mt-1 block text-base text-foreground hover:text-primary"
        >
          {children}
        </Wrapper>
      </div>
    </div>
  );
}
