import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, cancellationPolicy } from "@/lib/site";

export const metadata: Metadata = {
  title: "Общи условия",
  description:
    "Условията за запазване, преместване и отказ на час в Euphoria Hair & Beauty Bar — кв. Левски, Варна. Цени, плащане и отговорности.",
  alternates: { canonical: "/obshti-usloviya" },
};

const UPDATED = "4 септември 2026 г.";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-10 font-display text-2xl font-medium">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Правна информация</p>
      <h1 className="mt-4 font-display text-4xl font-medium md:text-5xl">Общи условия</h1>
      <p className="mt-4 text-sm text-muted-foreground">Последна актуализация: {UPDATED}</p>

      <p className="mt-8 text-foreground/80">
        Тези условия важат за запазването на час в {siteConfig.name}, {siteConfig.address.full} — онлайн през сайта,
        по телефон, във Viber или на място в салона. Като запазиш час, приемаш написаното по-долу.
      </p>

      <Section id="zapazvane" title="1. Запазване на час">
        <p>
          Часът се запазва на твое име за конкретен специалист и конкретна услуга. При онлайн записване получаваш
          имейл с потвърждение, в който има и линк за отказ.
        </p>
        <p>
          Не искаме депозит и не приемаме плащане онлайн. Плащаш на място след услугата — в брой, с карта или
          през Revolut.
        </p>
      </Section>

      <Section id="otkaz" title="2. Отказ и преместване">
        <p>
          Ако не можеш да дойдеш, кажи ни най-късно {cancellationPolicy.hours} часа преди часа. Най-бързо става от
          линка в имейла с потвърждението; иначе се обади на{" "}
          <a className="text-primary underline underline-offset-4" href={`tel:${siteConfig.contact.phone}`}>
            {siteConfig.contact.phoneFormatted}
          </a>
          .
        </p>
        <p>
          При по-късен отказ или при неявяване запазваме правото да начислим {cancellationPolicy.feePercent}% от
          стойността на услугата при следващото ти посещение. Времето е запазено само за теб и остава неизползвано.
        </p>
        <p>
          Ако закъснееш, правим каквото се събира в оставащото време. При голямо закъснение може да се наложи да
          преместим часа, за да не забавим следващия клиент.
        </p>
      </Section>

      <Section id="otmyana" title="3. Отмяна от наша страна">
        <p>
          В редки случаи (болест, авария, извънредно затваряне) може да се наложи да отменим час. Свързваме се с теб
          веднага и предлагаме най-близкото възможно време. В такъв случай не дължиш нищо.
        </p>
      </Section>

      <Section id="tseni" title="4. Цени и времетраене">
        <p>
          Цените в сайта са в евро и важат за услугата в описания вид. При услуги, отбелязани с „от“, крайната цена
          зависи от дължината и състоянието на косата или от избрания протокол — казваме я преди да започнем.
        </p>
        <p>
          Времетраенето е ориентировъчно. Балаяж, изсветляване и кератинови терапии може да отнемат повече време
          според състоянието на косата.
        </p>
      </Section>

      <Section id="otgovornost" title="5. Здраве и отговорност">
        <p>
          Преди процедура ни кажи за алергии, кожни проблеми, бременност или скорошни козметични интервенции. Тази
          информация определя какви продукти ползваме и дали процедурата е подходяща за теб.
        </p>
        <p>
          При съмнение за алергия правим тест на кичур или на малък участък кожа. Ако премълчиш обстоятелство,
          което влияе на резултата, не носим отговорност за него.
        </p>
      </Section>

      <Section id="deca" title="6. Деца и придружители">
        <p>
          Работим и с деца, придружени от родител или настойник. Молим придружителите да изчакат в зоната за
          изчакване, за да не пречат на работата с ножици и с химикали.
        </p>
      </Section>

      <Section id="lichni-danni" title="7. Лични данни">
        <p>
          Данните, които оставяш при записване, се обработват както е описано в{" "}
          <Link className="text-primary underline underline-offset-4" href="/politika-za-poveritelnost">
            Политиката за поверителност
          </Link>
          .
        </p>
      </Section>

      <Section id="promeni" title="8. Промени в условията">
        <p>
          Може да актуализираме тези условия. Валидни са условията, публикувани на тази страница към момента на
          запазване на часа.
        </p>
      </Section>

      <p className="mt-12 text-sm text-muted-foreground">
        Въпрос по условията? Пиши на{" "}
        <a className="text-primary underline underline-offset-4" href={`mailto:${siteConfig.contact.email}`}>
          {siteConfig.contact.email}
        </a>{" "}
        или се обади на{" "}
        <a className="text-primary underline underline-offset-4" href={`tel:${siteConfig.contact.phone}`}>
          {siteConfig.contact.phoneFormatted}
        </a>
        .
      </p>
    </main>
  );
}
