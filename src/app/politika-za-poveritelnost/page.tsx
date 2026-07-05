import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description:
    "Как Euphoria Hair & Beauty Bar събира, използва и защитава личните ви данни при онлайн записване на час и ползване на сайта — съгласно GDPR.",
  alternates: { canonical: "/politika-za-poveritelnost" },
};

const UPDATED = "1 юли 2026 г.";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-10 font-display text-2xl font-medium">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Правна информация</p>
      <h1 className="mt-4 font-display text-4xl font-medium md:text-5xl">Политика за поверителност</h1>
      <p className="mt-4 text-sm text-muted-foreground">Последна актуализация: {UPDATED}</p>

      <p className="mt-8 text-foreground/80">
        Тази политика обяснява какви лични данни събираме, защо и как ги обработваме, когато посещавате сайта на{" "}
        {siteConfig.name} или запазвате час онлайн. Обработваме данните ви в съответствие с Регламент (ЕС) 2016/679
        (GDPR) и Закона за защита на личните данни.
      </p>

      <Section id="administrator" title="1. Кой отговаря за данните ви (администратор)">
        <p>
          Администратор на личните данни е {siteConfig.name}, със салон на адрес {siteConfig.address.full}.
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Имейл за връзка по въпроси за лични данни: <a className="text-primary underline underline-offset-4" href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></li>
          <li>Телефон: <a className="text-primary underline underline-offset-4" href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneFormatted}</a></li>
        </ul>
        <p className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
          Забележка за собственика: попълнете точното юридическо лице (фирма/ЕТ), ЕИК и седалище на администратора
          преди публикуване — това е задължителен реквизит по GDPR.
        </p>
      </Section>

      <Section id="dannite" title="2. Какви данни събираме">
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>При онлайн запис на час:</strong> име, телефонен номер и имейл адрес.</li>
          <li><strong>Бележки от специалиста:</strong> предпочитания и данни за услугата (напр. използвана формула за боя), видими само за вашия специалист.</li>
          <li><strong>История на посещенията:</strong> запазените услуги, дата, час и статус.</li>
          <li><strong>Технически данни:</strong> минимални данни, нужни за функционирането на сайта (напр. сесия). Не използваме рекламни или проследяващи бисквитки.</li>
        </ul>
      </Section>

      <Section id="celi" title="3. Защо ги обработваме и на какво основание">
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Управление на записания час</strong> — за да резервираме, потвърдим и подготвим услугата (основание: изпълнение на договор, чл. 6, ал. 1, б. „б“ GDPR).</li>
          <li><strong>Потвърждения и напомняния</strong> — имейл потвърждение и напомняне за предстоящ час (основание: изпълнение на договор и легитимен интерес да намалим неявяванията).</li>
          <li><strong>Връзка с вас</strong> — при промяна или отказ на час (основание: изпълнение на договор).</li>
          <li><strong>Законови задължения</strong> — счетоводни/данъчни изисквания, когато е приложимо.</li>
        </ul>
      </Section>

      <Section id="poluchateli" title="4. С кого споделяме данните (обработващи)">
        <p>Не продаваме личните ви данни. Споделяме ги само с доставчици, които ни помагат да работим, при строги договорни гаранции:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Хостинг и база данни</strong> — сървъри в Европейския съюз.</li>
          <li><strong>Изпращане на имейли</strong> — за потвърждения и напомняния.</li>
          <li><strong>Известия към екипа</strong> — само служебна информация за часа (без вашия имейл) до вашия специалист.</li>
        </ul>
      </Section>

      <Section id="srok" title="5. Колко дълго пазим данните">
        <p>
          Пазим данните за записаните часове толкова, колкото е нужно за обслужването ви и за спазване на законови
          (счетоводни) срокове. Когато вече не са необходими, ги изтриваме или анонимизираме. Може по всяко време да
          поискате изтриване (виж правата ви по-долу).
        </p>
      </Section>

      <Section id="prava" title="6. Вашите права">
        <p>Съгласно GDPR имате право на:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>достъп до данните, които съхраняваме за вас;</li>
          <li>коригиране на неточни данни;</li>
          <li>изтриване („правото да бъдеш забравен“);</li>
          <li>ограничаване или възражение срещу обработването;</li>
          <li>преносимост на данните;</li>
          <li>оттегляне на съгласие, когато обработването се основава на съгласие.</li>
        </ul>
        <p>
          За да упражните някое от тези права, пишете ни на{" "}
          <a className="text-primary underline underline-offset-4" href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
          Имате право и на жалба до Комисията за защита на личните данни (КЗЛД),{" "}
          <a className="text-primary underline underline-offset-4" href="https://www.cpdp.bg" target="_blank" rel="noopener noreferrer">cpdp.bg</a>.
        </p>
      </Section>

      <Section id="sigurnost" title="7. Сигурност">
        <p>
          Прилагаме подходящи технически и организационни мерки, за да защитим данните ви от неоторизиран достъп,
          загуба или промяна. Достъпът до клиентски данни е ограничен до вашия специалист и управлението на салона.
        </p>
      </Section>

      <Section id="promeni" title="8. Промени в тази политика">
        <p>
          Може да актуализираме тази политика при промяна в дейността или законодателството. Актуалната версия е
          винаги на тази страница, с обновена дата отгоре.
        </p>
      </Section>

      <p className="mt-12 text-sm text-muted-foreground">
        Въпроси? Пишете ни на{" "}
        <a className="text-primary underline underline-offset-4" href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>{" "}
        или се върнете към <Link href="/" className="text-primary underline underline-offset-4">началната страница</Link>.
      </p>
    </main>
  );
}
