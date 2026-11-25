import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Phone } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  ArrowLink,
  CallButton,
  FaqBlock,
  HOURS,
  PHONE,
  PickupLines,
  ProductCard,
  ProductRow,
  TEL,
} from "@/components/montibello/parts";
import { siteConfig } from "@/lib/site";
import {
  forWhomOf,
  getMontibelloProduct,
  montibelloCopy,
  montibelloProducts,
  needOf,
  sameSeries,
  seriesOf,
  volumeOf,
  type MontibelloProduct,
} from "@/lib/data/montibello";

interface Params {
  params: Promise<{ product: string }>;
}

export async function generateStaticParams() {
  return montibelloProducts.map((p) => ({ product: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { product: slug } = await params;
  const product = getMontibelloProduct(slug);
  if (!product) return { robots: { index: false } };
  const copy = montibelloCopy[slug];
  const title = copy?.metaTitle ?? `${product.name} — Montibello`;
  const description = copy?.metaDescription ?? product.shortDescription;
  return {
    title: copy ? { absolute: title } : title,
    description,
    alternates: { canonical: `/montibello/${product.slug}` },
    // Етикетите няма да се снимат (думата на собственика, 25.11.2026): страниците остават кратки
    // и скрити от Google; follow пази връзките към хъба. В Google влиза само /montibello.
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `${siteConfig.url}/montibello/${product.slug}` },
  };
}

// Снимката на услугата: изрязана до ръцете и четката, без лице (решението «без лица»).
const SERVICE_IMAGE: Record<string, string> = {
  "/uslugi/boyadisvane-na-kosa-varna": "/images/montibello/usluga/boyadisvane.webp",
  "/uslugi/balayazh-varna": "/images/montibello/usluga/balayazh.webp",
  "/uslugi/frizorski-uslugi": "/images/montibello/usluga/frizorski-uslugi.webp",
  "/uslugi/frizorski-terapii": "/images/montibello/usluga/terapii.webp",
};

const PICKUP_FACT = "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00.";
const STOCK_FACT = "Потвърждаваме по телефона, преди да дойдеш.";

/** «Накратко» за продукт без текст от Саиф: само полетата от данните. */
function factsFromData(p: MontibelloProduct): [string, string][] {
  const series = seriesOf(p.slug);
  const kind = p.productType[0].toUpperCase() + p.productType.slice(1);
  const vol = volumeOf(p);
  const rows: [string, string][] = [
    ["Серия", series && series !== p.line ? `${p.line} ${series}` : p.line],
    ["Вид", vol ? `${kind}, ${vol}` : kind],
  ];
  if (p.forHairType) rows.push(["За коса", p.forHairType]);
  if (p.keyIngredients?.length) rows.push(["Активи (по данни на Montibello)", p.keyIngredients.join(", ")]);
  if (!p.professional) rows.push(["Вземане", PICKUP_FACT], ["Наличност", STOCK_FACT]);
  return rows;
}

export default async function MontibelloProductPage({ params }: Params) {
  const { product: slug } = await params;
  const p = getMontibelloProduct(slug);
  if (!p) notFound();

  const copy = montibelloCopy[slug];
  const need = needOf(slug);
  const series = seriesOf(slug);
  const eyebrow = series && series !== p.line ? `${p.line} · ${series}` : p.line;
  const vol = volumeOf(p);
  const forHair = p.forHairType ? forWhomOf(p) : undefined;
  const subtitle = copy?.subtitle ?? (forHair ? forHair[0].toLowerCase() + forHair.slice(1) : undefined);
  const answer = copy ? [copy.answer] : p.description.split("\n\n").filter(Boolean);
  const facts = copy?.facts ?? factsFromData(p);
  const faq = copy?.faq ?? [
    {
      q: `Как поръчвам ${p.name} и откъде го вземам?`,
      a: "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка.",
    },
    { q: "Има ли доставка?", a: "Не. Продуктите се вземат от салона и няма онлайн поръчка." },
  ];
  // «От същата рутина»: само продукти от същата серия (не от цялата линия HOP).
  const siblings = p.professional ? [] : sameSeries(slug).slice(0, 4);
  const service = copy?.service;

  const url = `${siteConfig.url}/montibello/${p.slug}`;
  const crumbs = [
    { name: "Начало", item: siteConfig.url },
    { name: "Montibello", item: `${siteConfig.url}/montibello` },
    ...(need ? [{ name: need.label, item: `${siteConfig.url}/montibello#${need.slug}` }] : []),
    { name: p.name },
  ];
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "ItemPage",
      "@id": url,
      url,
      name: p.name,
      description: copy?.metaDescription ?? p.shortDescription,
      inLanguage: "bg",
      isPartOf: { "@type": "CollectionPage", "@id": `${siteConfig.url}/montibello` },
      about: {
        "@type": "Brand",
        name: "Montibello",
        sameAs: "https://www.montibello.com",
      },
      ...(p.officialImage ? { primaryImageOfPage: { "@type": "ImageObject", url: `${siteConfig.url}${p.officialImage}` } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        ...(c.item ? { item: c.item } : {}),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <JsonLd data={schema} />

      <div className="mx-auto max-w-7xl px-4 pt-5 lg:px-8 lg:pt-8">
        <nav aria-label="Трохи" className="flex flex-wrap items-center gap-1 text-[13px] leading-5 text-muted-foreground">
          <Link href="/" className="hidden hover:text-foreground lg:inline">Начало</Link>
          <ChevronRight className="hidden size-3.5 lg:inline" aria-hidden />
          <Link href="/montibello" className="hover:text-foreground">Montibello</Link>
          {need && (
            <>
              <ChevronRight className="size-3.5" aria-hidden />
              <Link href={`/montibello#${need.slug}`} className="hover:text-foreground">{need.label}</Link>
            </>
          )}
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="font-medium text-foreground">{p.name}</span>
        </nav>

        {/* Първият екран: опаковката в бяло поле, отговор и едно обаждане */}
        <section className="mt-4 grid gap-4 lg:mt-8 lg:grid-cols-[560px_1fr] lg:gap-16">
          <div className="relative h-[290px] overflow-hidden rounded-[10px] border border-border/60 bg-white lg:h-auto lg:min-h-[600px]">
            {p.officialImage && (
              <Image
                src={p.officialImage}
                alt={copy?.alt ?? `Montibello ${p.name}`}
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-contain p-4 lg:p-[9%]"
              />
            )}
          </div>
          <div>
            <p className="text-[13px] leading-5 font-medium text-muted-foreground">{eyebrow}</p>
            <h1 className="mt-1 font-display text-[34px] leading-[42px] font-medium tracking-tight lg:mt-2 lg:text-[56px] lg:leading-[62px]">
              {p.name}
            </h1>
            {subtitle && (
              <p className="mt-0.5 font-serif text-[22px] leading-[30px] italic lg:mt-1 lg:text-[26px] lg:leading-9">{subtitle}</p>
            )}

            {p.professional ? (
              <>
                <div className="mt-4 max-w-[560px] space-y-3 text-base leading-[26px]">
                  {answer.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </div>
                <p className="mt-6 rounded-[10px] bg-secondary px-4 py-3 text-[15px] leading-6">
                  Само в салона: за професионална употреба, не се купува за вкъщи.
                </p>
                <ul className="mt-4 space-y-0.5">
                  <li><ArrowLink href="/uslugi/boyadisvane-na-kosa-varna">Боядисване на коса</ArrowLink></li>
                  <li><ArrowLink href="/uslugi/frizorski-terapii">Терапии за коса</ArrowLink></li>
                </ul>
              </>
            ) : (
              <>
                {/* На 1440 отговорът е преди обаждането; на 390 обаждането е веднага под името */}
                <div className="mt-4 hidden max-w-[560px] space-y-3 text-base leading-[26px] lg:block">
                  {answer.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-[22px] text-muted-foreground lg:mt-6">
                  {vol ? `${vol} · ` : ""}вземаш от салона
                </p>
                <a href={TEL} className="mt-3 flex items-center gap-2 text-[15px] leading-[22px] font-medium lg:hidden">
                  <Phone className="size-4" strokeWidth={2} aria-hidden />
                  {PHONE} · вт–сб
                </a>
                <div className="mt-4 hidden items-center gap-5 lg:flex">
                  <CallButton className="min-w-[268px]" />
                  <div>
                    <a href={TEL} className="block text-[17px] leading-6 font-semibold">{PHONE}</a>
                    <p className="text-[13px] leading-5 text-muted-foreground">{HOURS}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-base leading-[26px] lg:hidden">
                  {answer.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </div>
                <PickupLines className="mt-4 lg:hidden" />
                <PickupLines className="mt-5 hidden max-w-[520px] lg:block" hours={false} />
              </>
            )}
          </div>
        </section>

        {/* Накратко */}
        <section className="mt-14 grid lg:mt-24 lg:grid-cols-[400px_1fr]">
          <h2 className="font-display text-[26px] leading-[34px] font-medium lg:text-[32px] lg:leading-10">Накратко</h2>
          <dl className="mt-4 border-b border-border lg:mt-0">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[104px_1fr] gap-x-3 border-t border-border py-3.5 lg:grid-cols-[180px_1fr] lg:gap-x-0">
                <dt className="text-sm leading-6 text-muted-foreground">{k}</dt>
                <dd className="text-[15px] leading-6">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 lg:mt-[88px]">
          <FaqBlock items={faq} />
        </section>

        {/* От същата рутина + услугата в салона */}
        {(siblings.length > 0 || service) && (
          <section className="mt-14 mb-14 lg:mt-[88px] lg:mb-24">
            <h2 className="font-display text-[26px] leading-[34px] font-medium lg:text-[32px] lg:leading-10">
              {siblings.length > 0 ? "От същата рутина" : "Свързана услуга в салона"}
            </h2>
            {copy?.routineNote && siblings.length > 0 && (
              <p className="mt-2 text-[15px] leading-6 text-muted-foreground lg:mt-1.5 lg:text-base">{copy.routineNote}</p>
            )}
            <div className="mt-5 hidden grid-cols-4 gap-6 lg:mt-8 lg:grid">
              {siblings.map((s) => (
                <ProductCard key={s.slug} p={s} />
              ))}
              {service && <ServiceCard service={service} className="col-span-2" />}
            </div>
            <div className="mt-5 space-y-5 lg:hidden">
              {siblings.map((s) => (
                <ProductRow key={s.slug} p={s} />
              ))}
              {service && <ServiceCard service={service} className="mt-8" />}
            </div>
          </section>
        )}
      </div>

      {/* Лентата долу на телефона: само бутонът (без цена) */}
      {!p.professional && (
        <div
          data-montibello-bar
          data-call-spot="call-bar"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-8px_16px_-12px_rgb(17_17_22/0.25)] lg:hidden"
        >
          <CallButton className="w-full text-[15px]" />
        </div>
      )}
    </>
  );
}

function ServiceCard({
  service,
  className,
}: {
  service: { label: string; href: string; text: string };
  className?: string;
}) {
  const img = SERVICE_IMAGE[service.href];
  return (
    <div className={`flex flex-col overflow-hidden rounded-[10px] border border-border bg-card ${className ?? ""}`}>
      {img && (
        <div className="relative h-[200px] lg:h-auto lg:min-h-[240px] lg:flex-1">
          <Image src={img} alt="" fill sizes="(min-width: 1024px) 596px, 100vw" className="object-cover" />
        </div>
      )}
      <div className="p-5">
        <p className="text-[13px] leading-5 text-muted-foreground">В салона</p>
        <h3 className="mt-1 font-display text-[22px] leading-[30px] font-medium">
          <Link href={service.href} className="hover:text-primary">{service.label}</Link>
        </h3>
        <p className="mt-1.5 text-[15px] leading-[23px] text-muted-foreground">{service.text}</p>
        <div className="mt-3">
          <ArrowLink href="/zapazi-chas">Запази час</ArrowLink>
        </div>
      </div>
    </div>
  );
}
