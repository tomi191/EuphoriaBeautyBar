import { siteConfig } from "@/lib/site";
import { faqItems } from "@/lib/data/faq";

export const localBusinessSchema = {
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
    streetAddress: siteConfig.address.street,
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
    { "@type": "AdministrativeArea", name: "Варненска област" },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "17:00",
    },
  ],
  sameAs: [siteConfig.social.facebook, siteConfig.social.instagram],
  hasMap: siteConfig.address.mapsUrl,
  paymentAccepted: ["Cash", "Credit Card", "Debit Card"],
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
};

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

export const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

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
});

export const aggregateRatingSchema = (rating: number, count: number) => ({
  "@type": "AggregateRating",
  ratingValue: rating.toFixed(1),
  reviewCount: count,
  bestRating: "5",
  worstRating: "1",
});
