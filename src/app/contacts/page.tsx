import type { Metadata } from "next";
import Image from "next/image";
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { AuroraBackground } from "@/components/reactbits/aurora-background";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Контакти и резервации",
  alternates: { canonical: "/contacts" },
  description:
    "Резервирай час, открий ни на картата или ни пиши директно. Euphoria Hair & Beauty Bar във Варна.",
};

export default function ContactsPage() {
  return (
    <>
      <AuroraBackground intensity="subtle">
        <section className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
          <Image
            src="/illustrations/arch.svg"
            alt=""
            aria-hidden
            width={320}
            height={200}
            className="pointer-events-none absolute -top-4 left-1/2 hidden h-48 w-auto -translate-x-1/2 opacity-40 mix-blend-multiply md:block"
          />
          <Image
            src="/illustrations/flowers.svg"
            alt=""
            aria-hidden
            width={300}
            height={320}
            className="pointer-events-none absolute right-[3%] bottom-12 hidden h-44 w-auto opacity-50 mix-blend-multiply lg:block"
          />
          <Image
            src="/illustrations/mirror.svg"
            alt=""
            aria-hidden
            width={260}
            height={320}
            className="pointer-events-none absolute left-[5%] bottom-8 hidden h-40 w-auto opacity-40 mix-blend-multiply lg:block"
          />

          <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
            <Reveal>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Свържи се с нас
              </p>
            </Reveal>
            <BlurText
              as="h1"
              text="Очакваме те."
              className="font-display text-6xl font-medium md:text-8xl"
            />
            <Reveal delay={0.4}>
              <p className="mt-6 max-w-xl font-serif text-xl italic text-muted-foreground">
                Резервирай час, задай въпрос или просто ела да ни кажеш здравей.
              </p>
            </Reveal>
          </div>
        </section>
      </AuroraBackground>

      <section id="booking" className="relative py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-5">
            <h2 className="font-display text-3xl font-medium md:text-4xl">Контактна информация</h2>
            <p className="mt-3 text-muted-foreground">
              Открий ни лесно — обади се, пиши или ни посети директно в салона.
            </p>

            <div className="mt-10 space-y-6">
              <ContactItem icon={MapPin} title="Адрес">
                {siteConfig.address.full}
              </ContactItem>
              <ContactItem icon={Phone} title="Телефон" href={`tel:${siteConfig.contact.phone}`}>
                {siteConfig.contact.phoneFormatted}
              </ContactItem>
              <ContactItem icon={Mail} title="Имейл" href={`mailto:${siteConfig.contact.email}`}>
                {siteConfig.contact.email}
              </ContactItem>
              <ContactItem icon={MessageCircle} title="Viber" href={siteConfig.social.viber}>
                Изпрати съобщение
              </ContactItem>
              <ContactItem icon={Clock} title="Работно време">
                <ul className="space-y-1 text-sm">
                  {siteConfig.hours.map((h) => (
                    <li key={h.day} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className="font-medium">
                        {h.close ? `${h.open} – ${h.close}` : h.open}
                      </span>
                    </li>
                  ))}
                </ul>
              </ContactItem>
              <div className="flex gap-3 pt-4">
                <a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener"
                  aria-label="Facebook"
                  className="grid size-11 place-items-center rounded-full border border-border bg-background transition-colors hover:border-primary hover:text-primary"
                >
                  <Facebook className="size-4" strokeWidth={1.5} />
                </a>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener"
                  aria-label="Instagram"
                  className="grid size-11 place-items-center rounded-full border border-border bg-background transition-colors hover:border-primary hover:text-primary"
                >
                  <Instagram className="size-4" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.15}>
            <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft md:p-10">
              <h2 className="font-display text-3xl font-medium md:text-4xl">Резервирай час</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Попълни формата и ние ще се свържем с теб в рамките на работното време.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/40 bg-secondary/20 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <h2 className="mb-8 font-display text-3xl font-medium md:text-4xl">Открий ни на картата</h2>
            <div className="aspect-[16/9] w-full overflow-hidden rounded-md border border-border/60 bg-secondary shadow-soft">
              <iframe
                title="Euphoria Hair & Beauty Bar — карта"
                src={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.address.full)}&output=embed`}
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Cancellation policy — точно от живия сайт */}
      <section id="policy" className="border-t border-border/40 bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Политика за отказ</p>
            <h2 className="font-display text-4xl font-medium md:text-5xl">
              Преди да <em className="font-serif italic text-primary">резервираш</em>.
            </h2>
            <p className="mt-4 max-w-2xl font-serif text-lg italic text-muted-foreground">
              Всеки час е запазен лично за теб. Затова държим на ясни правила за отказ и преместване.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 md:grid-cols-2">
            <PolicyCard
              num="01"
              title="Резервации"
              text="Ако си запазил час и решиш да откажеш, обади ни се поне 24 часа предварително."
            />
            <PolicyCard
              num="02"
              title="Такси при отказ"
              text="Отказ по-късно от 24 часа преди часа може да се таксува с 50% от стойността на услугата."
              accent
            />
            <PolicyCard
              num="03"
              title="Неявяване"
              text="Ако не се появиш за час без предупреждение, може да те таксуваме с пълната стойност на услугата."
              accent
            />
            <PolicyCard
              num="04"
              title="Отмяна от наша страна"
              text="В редки случаи може да се наложи да отменим час. Тогава ще се свържем с теб веднага, за да уговорим ново време."
            />
            <PolicyCard
              num="05"
              title="Потвърждение"
              text="Препоръчваме да потвърдиш часа си 24 часа предварително, за да избегнем недоразумения."
              full
            />
          </div>
        </div>
      </section>
    </>
  );
}

function PolicyCard({ num, title, text, accent, full }: { num: string; title: string; text: string; accent?: boolean; full?: boolean }) {
  return (
    <div className={`rounded-md border border-foreground/10 p-6 md:p-7 ${accent ? "bg-blush-soft" : "bg-background"} ${full ? "md:col-span-2" : ""}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl font-medium md:text-2xl">{title}</h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/50">{num}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/75 md:text-base">{text}</p>
    </div>
  );
}

function ContactItem({
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
