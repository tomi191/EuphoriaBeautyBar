import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, ChevronRight, Clock, MapPin, MessageCircle, Phone, Scissors, Sparkles, HandHeart } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { TiltedCard } from "@/components/reactbits/tilted-card";
import { LineDivider } from "@/components/brand/line-divider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/json-ld";
import { getServiceCatalog } from "@/lib/data/service-catalog";
import { localBusinessSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import { team } from "@/lib/data/team";
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

const DIRECTION_META: Record<string, { icon: typeof Scissors; blurb: string }> = {
  "frizorski-uslugi": {
    icon: Scissors,
    blurb: "Подстригване, боядисване, балаяж и официални прически. Работим с Montibello и Goldwell.",
  },
  "frizorski-terapii": {
    icon: Sparkles,
    blurb: "Възстановяване и хидратация за коса след боядисване — кератин Kerasilk, Nashi Argan, минерали.",
  },
  "manikyur-i-pedikyur": {
    icon: HandHeart,
    blurb: "Класически и гел маникюр, френски и омбре дизайни, педикюр и кератинова терапия за нокти.",
  },
  kozmetika: {
    icon: Sparkles,
    blurb: "Лицеви терапии според типа кожа, ламиниране на мигли и вежди — с GIGI, Esthemax и Montibello.",
  },
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
  const founder = team[0];

  return (
    <>
      {/* ───── HERO — реалната снимка на салона във фон + топъл воал (като началната) ───── */}
      <section className="relative isolate min-h-[84svh] overflow-hidden bg-cream">
        {/* Фон — реалната снимка на салона */}
        <Image
          src="/images/interior/hero-front.jpg"
          alt="Интериорът на салон Euphoria Hair & Beauty Bar в кв. Левски, Варна"
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

        <div className="relative z-10 mx-auto flex min-h-[84svh] max-w-7xl flex-col px-4 pt-28 pb-12 lg:px-10 lg:pt-32">
          <nav aria-label="Трохи" className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">Салон кв. Левски, Варна</span>
          </nav>

          <div className="flex flex-1 flex-col justify-center py-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">
              Beauty bar · кв. Левски, Варна
            </p>
            <BlurText
              as="h1"
              text="Салон за красота в кв. Левски, Варна"
              className="max-w-3xl font-display text-5xl leading-[1.03] font-medium text-balance md:text-6xl lg:text-7xl"
              stagger={0.02}
            />
            <p className="mt-7 max-w-2xl font-serif text-xl italic text-foreground/80">
              Коса, нокти и лице на едно място — на ул. Петър Райчев 18. Снежана е зад стола от 2000 г. Час
              запазваш онлайн, по телефон или във Viber.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-foreground/90">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запази час онлайн
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/30 bg-background/60 px-8 backdrop-blur">
                <a href={`tel:${siteConfig.contact.phone}`}>
                  <Phone className="size-4" /> {siteConfig.contact.phoneFormatted}
                </a>
              </Button>
            </div>

            {/* Stats — реални числа */}
            <div className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-foreground/15 pt-8">
              <div>
                <p className="font-display text-3xl font-medium text-primary md:text-4xl">25+</p>
                <p className="mt-1 text-sm text-foreground/70">Години зад стола</p>
              </div>
              <div>
                <p className="font-display text-3xl font-medium text-primary md:text-4xl">{siteConfig.founded}</p>
                <p className="mt-1 text-sm text-foreground/70">Открит салон</p>
              </div>
              <div>
                <p className="font-display text-3xl font-medium text-primary md:text-4xl">3</p>
                <p className="mt-1 text-sm text-foreground/70">Направления, един адрес</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LineDivider />

      {/* ───── ТРИ НАПРАВЛЕНИЯ ───── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-10">
          <Reveal>
            <div className="grid items-end gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Услугите ни</p>
                <h2 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">
                  Коса, нокти и лице — <span className="gradient-text">един салон</span> в Левски.
                </h2>
              </div>
              <p className="max-w-md font-serif text-lg italic text-muted-foreground">
                Коса, нокти и лице на едно място — без да обикаляш три различни салона из Варна.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, idx) => {
              const meta = DIRECTION_META[c.slug];
              const Icon = meta?.icon ?? Sparkles;
              return (
                <Reveal key={c.slug} delay={idx * 0.07}>
                  <Link
                    href={`/uslugi/${c.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-soft"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={c.heroImage}
                        alt={`${c.title} в Euphoria, кв. Левски, Варна`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute left-4 top-4 grid size-11 place-items-center rounded-xl bg-background/90 text-primary backdrop-blur">
                        <Icon className="size-5" strokeWidth={1.6} />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">{c.shortTitle}</p>
                      <h3 className="mt-2 font-display text-2xl">{c.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/75">
                        {meta?.blurb ?? c.description}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        Виж услугите и цените{" "}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── СНЕЖАНА — E-E-A-T (Коса напред, по арт-дирекцията) ───── */}
      <section className="relative overflow-hidden border-y border-border/40 bg-secondary/40 py-24 lg:py-32">
        <Image
          src="/illustrations/scissors.svg"
          alt=""
          aria-hidden
          width={280}
          height={280}
          className="pointer-events-none absolute right-8 top-12 hidden h-36 w-auto rotate-[12deg] opacity-30 mix-blend-multiply lg:block"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-5">
            <TiltedCard rotateAmplitude={5}>
              <div className="relative aspect-[4/5] w-full max-w-md">
                <div aria-hidden className="absolute inset-0 translate-x-5 translate-y-5 rounded-3xl bg-mint" />
                <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border/60">
                  <Image
                    src={founder.imageSalon ?? founder.image}
                    alt={`${founder.name} в салон Euphoria, кв. Левски, Варна`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </TiltedCard>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={0.1}>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">Кой ще се грижи за теб</p>
            <h2 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">
              Зад стола — <span className="gradient-text">Снежана</span>, от 2000 г.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/85">
              {founder.bio}
            </p>
            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Специализации</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {founder.specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="rounded-full text-xs font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="mt-7 max-w-xl text-foreground/75">
              Маникюрът, педикюрът и козметичните процедури се правят от специалисти, които работят в салона —
              в същите стерилни условия и със същата грижа.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 rounded-full bg-foreground px-8 text-background hover:bg-foreground/90">
              <Link href="/za-nas">
                Запознай се с екипа <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <LineDivider />

      {/* ───── ЛОКАЦИЯ + КОНТАКТИ ───── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-5">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Намери ни</p>
            <h2 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">
              Как да <span className="gradient-text">стигнеш</span> до нас.
            </h2>
            <p className="mt-5 text-muted-foreground">
              Салонът е в кв. Левски, близо до центъра на Варна. В района има улично паркиране.
            </p>

            <div className="mt-9 space-y-6">
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

            <Button asChild size="lg" className="mt-9 h-12 rounded-full bg-foreground px-8 text-background hover:bg-foreground/90">
              <Link href="/zapazi-chas">
                <Calendar className="size-4" /> Запази час онлайн
              </Link>
            </Button>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.15}>
            <div className="relative h-full">
              <div aria-hidden className="absolute -inset-3 -z-10 rounded-3xl bg-mint/50" />
              <div className="h-full min-h-[360px] w-full overflow-hidden rounded-2xl border border-border/60 bg-secondary shadow-soft">
                <iframe
                  title="Карта — Euphoria Hair & Beauty Bar, кв. Левски, Варна"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.address.full)}&output=embed`}
                  className="h-full min-h-[360px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section className="relative overflow-hidden border-t border-border/40 bg-cream py-24 lg:py-32">
        <Image
          src="/illustrations/arch.svg"
          alt=""
          aria-hidden
          width={320}
          height={200}
          className="pointer-events-none absolute -top-4 left-1/2 hidden h-44 w-auto -translate-x-1/2 opacity-30 mix-blend-multiply md:block"
        />
        <div className="relative mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Често задавани въпроси</p>
            <h2 className="font-display text-4xl font-medium md:text-5xl">
              Преди да <span className="gradient-text">дойдеш</span>.
            </h2>
          </Reveal>
          <div className="mt-12 divide-y divide-border/60">
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

      {/* ───── CTA ───── */}
      <section className="bg-foreground py-20 text-background lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <Reveal>
            <h2 className="font-display text-4xl font-medium md:text-5xl">
              Запази си час в <em className="font-serif italic text-mint">кв. Левски</em>.
            </h2>
            <p className="mt-4 text-background/70">
              Виж свободните часове в реално време и запази онлайн за по-малко от минута — без обаждане.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-mint px-8 text-foreground hover:bg-mint/80">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" /> Запази час онлайн
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-background/30 bg-transparent px-8 text-background hover:bg-background/10">
                <a href={`tel:${siteConfig.contact.phone}`}>
                  <Phone className="size-4" /> {siteConfig.contact.phoneFormatted}
                </a>
              </Button>
            </div>
          </Reveal>
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
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-foreground">
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
