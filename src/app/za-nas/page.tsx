import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, HeartHandshake, Leaf, Scissors } from "lucide-react";

const aboutAccents = [
  { src: "/illustrations/woman-profile.svg", className: "absolute -top-12 right-0 h-72 w-auto opacity-25 mix-blend-multiply pointer-events-none hidden lg:block" },
  { src: "/illustrations/comb.svg", className: "absolute top-1/3 left-0 h-32 w-auto rotate-[-8deg] opacity-40 mix-blend-multiply pointer-events-none hidden md:block" },
  { src: "/illustrations/leaf.svg", className: "absolute bottom-12 right-4 h-44 w-auto opacity-30 mix-blend-multiply pointer-events-none hidden lg:block" },
];
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { TiltedCard } from "@/components/reactbits/tilted-card";
import { team } from "@/lib/data/team";
import { siteConfig } from "@/lib/site";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "За нас — салон за красота в кв. Левски, Варна",
  alternates: { canonical: "/za-nas" },
  description:
    "Историята на Euphoria Hair & Beauty Bar в кв. Левски, Варна. Основан през 2023 г. от Снежана Саблева, фризьор с над 25 години опит.",
};

const values = [
  { icon: Scissors, title: "Премиум занаят", desc: "25+ години опит и работа само със сертифицирани продукти." },
  { icon: HeartHandshake, title: "Личен подход", desc: "Гледаме косата и начина на живот на всеки клиент, не работим по шаблон." },
  { icon: Leaf, title: "Внимателни формули", desc: "Активни вещества без агресивни сулфати, парабени и токсини." },
  { icon: GraduationCap, title: "Постоянно обучение", desc: "Сертификати на Снежана от Goldwell и Montibello; всички кабинети работят само с професионални продуктови линии." },
];

const milestones = [
  { year: "2000", title: "Първите ножици", text: "Снежана Саблева започва кариерата си като фризьор." },
  { year: "2015", title: "Експертност", text: "Сертификати по балаяж, Goldwell Kerasilk и съвременни техники за боядисване." },
  { year: "2023", title: "Раждането на Euphoria", text: "Откриване на Euphoria Hair & Beauty Bar във Варна." },
  { year: "2026", title: "Нов сайт", text: "Онлайн записване и обновена галерия с реални работи." },
];

export default async function AboutPage() {
  const founder = team[0];
  const rentalOpenRow = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "rental_open") });
  const rentalOpen = rentalOpenRow ? Boolean(rentalOpenRow.value) : true;

  return (
    <>
      <section className="relative isolate min-h-[72svh] overflow-hidden bg-cream lg:min-h-[78svh]">
        {/* Фон — реалната снимка на салона */}
        <Image
          src="/images/interior/salon-1.jpg"
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

        <div className="relative z-10 mx-auto flex min-h-[72svh] max-w-7xl flex-col justify-center px-4 pt-28 pb-12 lg:min-h-[78svh] lg:px-8 lg:pt-32">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">Нашата история</p>
          <BlurText
            as="h1"
            text="Салон, в който има време за всеки клиент"
            className="max-w-4xl font-display text-5xl leading-[1.05] font-medium text-balance md:text-6xl lg:text-7xl"
            stagger={0.04}
          />
          <Reveal delay={0.4}>
            <p className="mt-8 max-w-2xl font-serif text-xl italic text-foreground/80">
              Снежана отвори Euphoria през 2023 г. след повече от двадесет години по чужди столове. Идеята беше проста: салон с време да изслуша клиента, преди да вдигне ножицата.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-5">
            <TiltedCard rotateAmplitude={5}>
              <div className="relative aspect-[4/5] w-full max-w-md">
                <div aria-hidden className="absolute inset-0 translate-x-5 translate-y-5 rounded-3xl bg-mint" />
                <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border/60">
                  <Image
                    src={founder.imageSalon ?? founder.image}
                    alt={`${founder.name} в салон Euphoria`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </TiltedCard>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={0.1}>
            <Badge variant="secondary" className="rounded-full">Основател</Badge>
            <h2 className="mt-3 font-display text-4xl font-medium text-balance md:text-5xl">
              {founder.name}
            </h2>
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-primary">
              {founder.role}
            </p>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-foreground/85">
              <p>{founder.bio}</p>
              <p className="font-serif text-2xl italic text-primary">
                &ldquo;Никога не правя прическа &lsquo;по принцип&rsquo;. Гледам формата на лицето, типа на косата и начина на живот. После предлагам.&rdquo;
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Специализации</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {founder.specialties.map((s) => (
                    <Badge key={s} variant="secondary" className="rounded-full text-xs font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/zapazi-chas">Запиши час при Снежана <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-border/40 bg-secondary/40 py-24 lg:py-32">
        <Image
          src="/illustrations/leaf.svg"
          alt=""
          aria-hidden
          width={220}
          height={280}
          className="pointer-events-none absolute right-8 top-12 hidden h-44 w-auto opacity-30 mix-blend-multiply lg:block"
        />

        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <div className="grid items-end gap-6 md:grid-cols-2">
              <div>
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">Принципи</p>
                <h2 className="font-display text-4xl font-medium md:text-5xl lg:text-6xl">
                  Неща, по които <span className="gradient-text">не правим компромис</span>.
                </h2>
              </div>
              <p className="max-w-md font-serif text-lg italic text-muted-foreground">
                Четири неща, които важат за всяка услуга в салона.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v, idx) => (
              <Reveal key={v.title} delay={idx * 0.08}>
                <div className="group h-full rounded-2xl border border-border/60 bg-card p-7 transition-all hover:border-primary/40 hover:shadow-soft">
                  <div className="grid size-12 place-items-center rounded-xl bg-mint text-foreground transition-all group-hover:bg-foreground group-hover:text-background">
                    <v.icon className="size-5" strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-medium">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Подход + Цел — две колони с глас от живия сайт */}
      <section className="border-t border-border/40 bg-cream py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Нашият подход</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.05] font-medium md:text-5xl">
                Без шаблонни решения.
              </h2>
            </Reveal>
            <Reveal className="space-y-6 lg:col-span-7" delay={0.1}>
              <p className="text-lg leading-relaxed text-foreground/80">
                Гледаме косата заедно с човека пред нас: начина на живот, колко време има сутрин, какво е пробвал досега и не е сработило.
              </p>
              <p className="text-lg leading-relaxed text-foreground/80">
                Искаме да разберем какво точно търсиш, не каталожната версия. Детайлът прави разликата между добра прическа и прическа, която наистина ти отива.
              </p>
            </Reveal>
          </div>

          <div className="mt-20 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-5 lg:order-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Нашата цел</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.05] font-medium md:text-5xl">
                Час, който не бързаме да приключим.
              </h2>
            </Reveal>
            <Reveal className="space-y-6 lg:col-span-7 lg:order-1" delay={0.1}>
              <p className="text-lg leading-relaxed text-foreground/80">
                Искаме да си тръгнеш доволен от резултата и спокоен от престоя, не като пореден час в нечий график.
              </p>
              <p className="text-lg leading-relaxed text-foreground/80">
                Следим новите техники и тенденции, но не налагаме трендове, които не работят за теб.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-primary">Пътят дотук</p>
              <h2 className="font-display text-4xl font-medium md:text-5xl lg:text-6xl">
                Етапи и <span className="gradient-text">постижения</span>.
              </h2>
            </div>
          </Reveal>

          <div className="mx-auto mt-16 max-w-3xl">
            <ol className="relative border-l border-border/60 pl-8">
              {milestones.map((m, idx) => (
                <Reveal key={m.year} delay={idx * 0.08}>
                  <li className="mb-12 last:mb-0">
                    <div className="absolute -left-[7px] grid size-3.5 place-items-center rounded-full bg-foreground ring-4 ring-background" />
                    <p className="font-display text-3xl font-medium text-primary">{m.year}</p>
                    <h3 className="mt-1 font-display text-xl">{m.title}</h3>
                    <p className="mt-2 text-muted-foreground">{m.text}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {rentalOpen && (
        <section className="relative overflow-hidden border-t border-border/40 bg-mint/40 py-24">
          <Image
            src="/illustrations/arch.svg"
            alt=""
            aria-hidden
            width={320}
            height={200}
            className="pointer-events-none absolute -bottom-2 left-1/2 h-40 w-auto -translate-x-1/2 opacity-35 mix-blend-multiply"
          />

          <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-md bg-background/80 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground backdrop-blur">
              <Briefcase className="size-3" /> Място под наем
            </span>
            <h2 className="mt-6 font-display text-4xl font-medium md:text-5xl">
              Свободно място <span className="gradient-text">под наем.</span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-foreground/80">
              Отдаваме под наем работно място в салона. Виж кои позиции са свободни в момента.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 rounded-full bg-foreground px-8 text-background hover:bg-foreground/90">
              <Link href="/karieri">Виж свободните места <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </section>
      )}

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="font-display text-4xl font-medium md:text-5xl">
            Да се <span className="gradient-text">запознаем?</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Първия път отделяме повече време, за да чуем какво искаш. Записване по телефон или Viber.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-full bg-foreground px-8 text-background hover:bg-foreground/90">
            <Link href="/zapazi-chas">Запиши час <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
