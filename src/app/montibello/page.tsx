import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Info, Store } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { NeedPills } from "@/components/montibello/need-pills";
import {
  ADDR,
  ArrowLink,
  CallButton,
  FaqBlock,
  HOURS,
  PHONE,
  PickupBlock,
  ProductCard,
  ProductRow,
  TEL,
} from "@/components/montibello/parts";
import { siteConfig } from "@/lib/site";
import {
  getMontibelloProduct,
  montibelloForSale,
  montibelloNeeds,
} from "@/lib/data/montibello";

// Посока А «Рафт по нужда» (визия №45). Текстовете: Саиф (доклад 2026-11-25-content-montibello-текстове.md),
// с отговорите на собственика от 25.11.2026: цени няма, консултацията е само по телефона,
// Cromatone и концентратите HOP се ползват в салона.
const TITLE = "Montibello във Варна: козметика за коса | Euphoria";
const DESCRIPTION =
  "Montibello във Варна: шампоани, маски, серуми и стайлинг по нужда на косата. Вземаш от салон Euphoria, кв. Левски. Цена и наличност по телефона.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/montibello" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${siteConfig.url}/montibello` },
};

const ANSWER =
  "Montibello е испанска марка за професионална козметика за коса: шампоани, маски, серуми, бои и стайлинг. Работим с нея в салона, а Снежана има сертификати от Montibello. Продуктите за вкъщи вземаш от нас, на ул. Петър Райчев 18, Варна. Обади се на +359 898 66 33 15, кажи име и ще потвърдим цена и наличност.";

const FAQ = [
  {
    q: "Козметика ли е Montibello?",
    a: "Да, професионална козметика за коса. Марката има и отделна гама за лице; при нас за продан са продуктите за коса.",
  },
  {
    q: "Как поръчвам Montibello във Варна?",
    a: "Обади се на +359 898 66 33 15 и кажи името на продукта. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна.",
  },
  { q: "Има ли доставка?", a: "Не. Продуктите се вземат от салона и няма онлайн поръчка." },
  {
    q: "Как разбирам кой продукт е за моята коса?",
    a: "Избери нуждата си по-горе: боядисана, руса, увредена, суха, фина или скалп. Не си сигурна? Обади се и ще преценим заедно.",
  },
  {
    q: "Колко струват продуктите?",
    a: "Цената казваме по телефона: обади се на +359 898 66 33 15 и кажи името на продукта.",
  },
  {
    q: "Има ли мъжки продукти?",
    a: "Да: линията Decode Texture Men за текстуриране на мъжка коса. Останалите продукти не са разделени по пол.",
  },
  {
    q: "Може ли да купя бои Cromatone за вкъщи?",
    a: "Не. Cromatone и Oxibel са за професионална употреба и се прилагат от майстор в салона.",
  },
];

// Редът на опаковките в блока «Само в салона» е като в кадъра A-hub.
const SALON_ORDER = [
  "cromatone",
  "cromatone-metallics",
  "oxibel-activating-cream",
  "colour-concentrate",
  "smoothing-concentrate",
  "recharge-strength",
  "intensifier-fine-to-medium",
  "intensifier-medium-to-coarse",
  "cromaxtrem",
  "cromatone-meteorites",
];

export default function MontibelloPage() {
  const url = `${siteConfig.url}/montibello`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": url,
      url,
      name: "Montibello във Варна",
      description: DESCRIPTION,
      inLanguage: "bg",
      about: { "@type": "Brand", name: "Montibello", sameAs: "https://www.montibello.com" },
      // ItemList без вложен Product: Product без offers е грешка, а цена няма (думата на собственика).
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: montibelloForSale.length,
        itemListElement: montibelloForSale.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.name,
          url: `${url}/${p.slug}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Начало", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Montibello" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  const pills = montibelloNeeds.map((n) => ({
    slug: n.slug,
    label: n.label,
    count: n.products.length,
    image: getMontibelloProduct(n.thumb)?.officialImage,
  }));

  return (
    <>
      <JsonLd data={schema} />

      <div className="mx-auto max-w-7xl px-4 pt-5 lg:px-8 lg:pt-8">
        <nav aria-label="Трохи" className="flex items-center gap-1 text-[13px] leading-5 text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Начало</Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="font-medium text-foreground">Montibello</span>
        </nav>

        {/* Първият екран: отговор, обаждане, вземане от салона */}
        <section className="mt-4 grid gap-6 lg:mt-8 lg:grid-cols-[600px_1fr] lg:gap-14">
          <div>
            <h1 className="font-display text-[40px] leading-[1.1] font-medium tracking-tight lg:text-[64px]">
              Montibello
              <br />
              във Варна
            </h1>
            <p className="mt-1.5 font-serif text-[22px] leading-8 italic lg:text-[26px] lg:leading-9">
              професионална козметика за коса, с която работим в салона
            </p>
            <p className="mt-4 max-w-[560px] text-base leading-[26px] lg:text-[17px] lg:leading-7">{ANSWER}</p>
            <div className="mt-7 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-5">
              <CallButton className="w-full lg:w-auto lg:min-w-[268px]" />
              <a href={TEL} className="text-[15px] leading-[22px] font-medium lg:hidden">
                {PHONE} · вт–сб
              </a>
              <div className="hidden lg:block">
                <a href={TEL} className="block text-[17px] leading-6 font-semibold">{PHONE}</a>
                <p className="text-[13px] leading-5 text-muted-foreground">{HOURS}</p>
              </div>
            </div>
            <p className="mt-2 flex gap-2.5 text-sm leading-6 text-muted-foreground lg:mt-5">
              <Store className="mt-1 size-4 shrink-0" strokeWidth={1.8} aria-hidden />
              Само в салона, {ADDR}, Варна. Без доставка.
            </p>
          </div>
          <div className="relative h-[220px] overflow-hidden rounded-[10px] lg:mt-2 lg:ml-auto lg:h-[470px] lg:w-[560px]">
            <Image
              src="/images/montibello/full-volume-bg.webp"
              alt="Опаковки Montibello HOP Full Volume"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover object-[55%_50%]"
            />
          </div>
        </section>

        {/* Избор по нужда: котви, не филтър */}
        <section className="mt-12 lg:mt-[72px]" aria-labelledby="need-title">
          <h2 id="need-title" className="font-display text-[26px] leading-10 font-medium lg:text-[32px]">
            Какво търсиш?
          </h2>
          <p className="mt-1 mb-4 hidden text-[15px] leading-[22px] text-muted-foreground lg:block">
            {montibelloForSale.length} продукта за вкъщи, подредени по нуждата на косата. Всяко кръгче води до своята група.
          </p>
          <div className="mt-3 lg:mt-0">
            <NeedPills needs={pills} />
          </div>
        </section>

        {/* Групите по нужда */}
        {montibelloNeeds.map((n, gi) => {
          const items = n.products.map((s) => getMontibelloProduct(s)!);
          return (
            <section key={n.slug} id={n.slug} className="mt-12 scroll-mt-24 lg:mt-[72px]" aria-labelledby={`${n.slug}-t`}>
              <div className="lg:grid lg:grid-cols-[520px_560px]">
                <div>
                  <h2 id={`${n.slug}-t`} className="font-display text-[26px] leading-[34px] font-medium lg:text-[32px] lg:leading-10">
                    {n.title}
                  </h2>
                  <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                    {items.length === 1 ? "1 продукт" : `${items.length} продукта`}
                  </p>
                </div>
                <p className="mt-3 text-[15px] leading-6 text-muted-foreground lg:mt-1 lg:text-base lg:leading-[26px]">{n.intro}</p>
              </div>
              <div className="mt-6 hidden grid-cols-4 gap-x-6 gap-y-10 lg:grid">
                {items.map((p) => (
                  <ProductCard key={p.slug} p={p} />
                ))}
                {gi === 0 && items.length % 4 !== 0 && (
                  <div className="aspect-[1/0.95] rounded-[10px] bg-secondary p-6">
                    <p className="font-display text-xl leading-7 font-medium">Не знаеш коя да избереш?</p>
                    <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
                      Кажи ни по телефона каква е косата ти или попитай при следващия си час в салона.
                    </p>
                    <a href={TEL} className="mt-4 inline-flex min-h-8 items-center text-[15px] font-medium text-primary hover:underline">
                      {PHONE} →
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-5 space-y-4 lg:hidden">
                {items.map((p) => (
                  <ProductRow key={p.slug} p={p} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Само в салона: Cromatone и концентратите HOP, вързани с услугите */}
      <section className="mt-14 bg-secondary py-10 lg:mt-[88px] lg:py-16" aria-labelledby="salon-title">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-[1fr_auto] lg:px-8">
          <div className="max-w-[480px]">
            <h2 id="salon-title" className="font-display text-[26px] leading-10 font-medium lg:text-[32px]">
              Само в салона
            </h2>
            <p className="mt-3 text-[15px] leading-[26px] lg:text-base">
              Боите Cromatone, активиращият крем Oxibel и концентратите HOP за работа в салона са за професионална
              употреба и не се купуват за вкъщи. С Cromatone Снежана боядисва, а концентратите HOP ползва при
              терапиите за коса.
            </p>
            <ul className="mt-4 space-y-0.5">
              <li><ArrowLink href="/uslugi/boyadisvane-na-kosa-varna">Боядисване на коса</ArrowLink></li>
              <li><ArrowLink href="/uslugi/balayazh-varna">Балаяж във Варна</ArrowLink></li>
              <li><ArrowLink href="/uslugi/frizorski-terapii">Терапии за коса</ArrowLink></li>
            </ul>
          </div>
          <ul className="grid grid-cols-5 gap-2 lg:gap-x-3 lg:gap-y-4">
            {SALON_ORDER.map((slug) => getMontibelloProduct(slug)!).map((p) => (
              <li key={p.slug} className="lg:w-[108px]">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-white lg:rounded-[10px]">
                  {p.officialImage && (
                    <Image src={p.officialImage} alt={p.name} fill sizes="(min-width: 1024px) 108px, 20vw" className="object-contain p-[8%]" />
                  )}
                </div>
                <p className="mt-1.5 hidden truncate text-xs leading-[18px] text-muted-foreground lg:block">{p.name}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Лице */}
        <p className="mt-12 flex gap-2.5 text-[15px] leading-[26px] lg:mt-[72px]">
          <Info className="mt-1 size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
          <span>
            Montibello има и козметика за лице. При нас тя е само процедури в кабинета, не продукти за вкъщи.{" "}
            <ArrowLink href="/uslugi/kozmetika">Козметика</ArrowLink>
          </span>
        </p>

        <section className="mt-12 lg:mt-[72px]">
          <FaqBlock items={FAQ} />
        </section>

        <section className="mt-14 mb-10 lg:mt-[88px] lg:mb-24">
          <PickupBlock />
        </section>
      </div>
    </>
  );
}
