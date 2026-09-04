import { siteConfig } from "@/lib/site";

/** JS getDay() → името на деня, което schema.org очаква. */
const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * LocalBusiness schema. Приема опционален `rating` (от Google reviews в DB) →
 * inject-ва AggregateRating за звезди в SERP rich result (CTR ливър при поз ~9.6).
 * Адресът носи „кв. Левски" в streetAddress + areaServed — хипер-локален сигнал
 * за „маникюр варна левски" (90 vol), заявка, която конкурентите не таргетират.
 */
export const localBusinessSchema = (rating?: { value: number; count: number }) => ({
  "@context": "https://schema.org",
  "@type": ["BeautySalon", "HairSalon", "LocalBusiness"],
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  image: `${siteConfig.url}/images/brand/logo-black.png`,
  logo: `${siteConfig.url}/images/brand/logo-black.png`,
  "@id": siteConfig.url,
  url: siteConfig.url,
  telephone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  priceRange: "$$",
  description: siteConfig.description,
  slogan: siteConfig.tagline,
  founder: {
    "@type": "Person",
    "@id": `${siteConfig.url}/za-nas#snezhana`,
    name: siteConfig.founder,
    jobTitle: "Главен стилист и основател",
    knowsAbout: ["Балаяж", "Кератинови терапии", "Боядисване на коса", "Официални прически", "Корекция на цвят"],
  },
  foundingDate: String(siteConfig.founded),
  address: {
    "@type": "PostalAddress",
    streetAddress: `${siteConfig.address.street}, ${siteConfig.address.district}`,
    addressLocality: siteConfig.address.city,
    postalCode: siteConfig.address.postalCode,
    addressCountry: siteConfig.address.country,
    addressRegion: "Варненска област",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: siteConfig.address.coordinates.lat,
    longitude: siteConfig.address.coordinates.lng,
  },
  areaServed: [
    { "@type": "City", name: "Варна" },
    { "@type": "Place", name: `${siteConfig.address.district}, Варна` },
    { "@type": "AdministrativeArea", name: "Варненска област" },
  ],
  // Изведено от siteConfig.hours, за да не разминава с видимото на сайта.
  // Работното време е сред най-силните сигнали за локално класиране, а до одит №7
  // тук стоеше преписан вариант, който твърдеше, че салонът работи в понеделник.
  openingHoursSpecification: siteConfig.hours
    .filter((h) => h.close)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.weekdays.map((d) => SCHEMA_DAYS[d]),
      opens: h.open,
      closes: h.close,
    })),
  sameAs: [siteConfig.social.facebook, siteConfig.social.instagram],
  hasMap: siteConfig.address.mapsUrl,
  // Плащане само на място (без онлайн плащане и депозит). Revolut е изписан и
  // като „Revolut Pay" — двете форми, с които го разпознават асистентите.
  paymentAccepted: ["Cash", "Credit Card", "Debit Card", "Revolut", "Revolut Pay"],
  currenciesAccepted: "BGN, EUR",
  knowsAbout: [
    "Балаяж",
    "Кератинова терапия",
    "Манипулация с коса",
    "Гел лак",
    "Hydra facial",
    "Микронидлинг",
    "Анти ейдж процедури",
    "Сватбени прически",
  ],
  brand: siteConfig.brands.map((b) => ({ "@type": "Brand", name: b })),
  ...(rating && rating.count > 0
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.value.toFixed(1),
          reviewCount: rating.count,
          bestRating: "5",
          worstRating: "1",
        },
      }
    : {}),
});

/** Единен Person entity за Снежана — реферирай чрез @id навсякъде (E-E-A-T консолидация). */
export const PERSON_ID = `${siteConfig.url}/za-nas#snezhana`;

export const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: siteConfig.founder,
  jobTitle: "Главен стилист и основател",
  worksFor: {
    "@type": "BeautySalon",
    name: siteConfig.name,
    url: siteConfig.url,
  },
  url: `${siteConfig.url}/za-nas`,
  image: `${siteConfig.url}/images/team/snezhana.jpg`,
  description:
    "Снежана Саблева — стилист с над 25 години опит, основател на Euphoria Hair & Beauty Bar във Варна. Експерт по балаяж, кератинови терапии и корекция на цвят.",
  knowsAbout: ["Балаяж", "Goldwell Kerasilk", "Montibello", "Корекция на цвят", "Официални прически", "Сватбени стилове"],
  alumniOf: ["Goldwell Academy", "Montibello Academy"],
  nationality: { "@type": "Country", name: "България" },
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteConfig.url}#website`,
  url: siteConfig.url,
  name: siteConfig.name,
  publisher: { "@type": "Organization", name: siteConfig.name },
  inLanguage: "bg-BG",
  // Без SearchAction: сайтът няма търсачка (/blog?q= не съществува), а
  // Sitelinks Search Box е пенсиониран от Google (2024).
};

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteConfig.url}#organization`,
  name: siteConfig.name,
  url: siteConfig.url,
  logo: { "@type": "ImageObject", url: `${siteConfig.url}/images/brand/logo-black.png`, width: 600, height: 200 },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: siteConfig.contact.phone,
    contactType: "Reservations",
    email: siteConfig.contact.email,
    areaServed: "BG",
    availableLanguage: ["Bulgarian", "English"],
  },
  sameAs: [siteConfig.social.facebook, siteConfig.social.instagram],
};

// FAQPage трябва да съответства 1:1 на ВИДИМИТЕ Q&A (Google policy).
// FaqContactSection рендира faqItems.slice(0, 6) → schema-та ползва същите 6.
export const faqSchema = (items: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

export const breadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: item.name,
    item: item.url,
  })),
});

export const serviceSchema = (service: {
  name: string;
  description: string;
  url: string;
  category: string;
  offers?: { lowPrice: number; highPrice: number; priceCurrency: string };
  /** Per-услуга цени (P2-3) — машинно четим ценоразпис за rich results и AI parsing. */
  catalog?: { name: string; price: number; priceCurrency: string }[];
}) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: service.category,
  provider: {
    "@type": "BeautySalon",
    name: siteConfig.name,
    url: siteConfig.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.city,
      addressCountry: siteConfig.address.country,
    },
  },
  name: service.name,
  description: service.description,
  url: service.url,
  areaServed: { "@type": "City", name: "Варна" },
  ...(service.offers && {
    offers: {
      "@type": "AggregateOffer",
      lowPrice: service.offers.lowPrice,
      highPrice: service.offers.highPrice,
      priceCurrency: service.offers.priceCurrency,
    },
  }),
  ...(service.catalog &&
    service.catalog.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${service.name} — ценоразпис`,
        itemListElement: service.catalog.map((c) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: c.name },
          price: c.price,
          priceCurrency: c.priceCurrency,
        })),
      },
    }),
});

export const aggregateRatingSchema = (rating: number, count: number) => ({
  "@type": "AggregateRating",
  ratingValue: rating.toFixed(1),
  reviewCount: count,
  bestRating: "5",
  worstRating: "1",
});
