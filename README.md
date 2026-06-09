# Euphoria Hair & Beauty Bar

Модерен сайт на премиум beauty салон Euphoria във Варна, изграден с най-новите 2026 уеб технологии.

## Tech Stack

- **Next.js 16.2** (App Router, Turbopack, React Compiler)
- **React 19.2** (Server Components, automatic memoization)
- **TypeScript 6.0** (strict mode)
- **Tailwind CSS v4.2** (CSS-first config с `@theme`, OKLCH цветове)
- **shadcn/ui** (copy-paste компоненти, Radix UI primitives)
- **react-bits inspired** компоненти (Aurora, BlurText, Magnetic, Marquee, Reveal)
- **Motion 12** (бившата Framer Motion)
- **Resend** (transactional email за форми)
- **Lucide icons** + custom SVG

## Performance & SEO

- React Server Components по default — минимален JS bundle
- Static prerendering на 30 страници
- AVIF/WebP оптимизация на изображения
- Schema.org JSON-LD (BeautySalon, BlogPosting, BreadcrumbList, Service)
- Auto-generated sitemap.xml + robots.txt
- Open Graph & Twitter Cards
- Cyrillic font subsetting

## Команди

```bash
npm run dev          # dev server с Turbopack на localhost:3000
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run type-check   # TypeScript проверка
```

## ENV вариабли

Копирай `.env.example` като `.env.local` и попълни:

- `NEXT_PUBLIC_SITE_URL` — production URL
- `RESEND_API_KEY` — за изпращане на форми
- `CONTACT_TO_EMAIL` — къде пристигат запитванията
- `CONTACT_FROM_EMAIL` — изпращач (verified domain в Resend)

## Структура

```
src/
├── app/                   # App Router routes
│   ├── (страници)
│   ├── api/contact/       # Server route за контактна форма
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/                # shadcn primitives
│   ├── reactbits/         # анимирани компоненти (copy-paste от react-bits)
│   ├── layout/            # header, footer, nav
│   ├── sections/          # секции на началната страница
│   ├── service/           # service-card, pricing-table
│   ├── gallery/           # masonry + lightbox
│   ├── blog/              # post renderer
│   ├── forms/             # контакт форма с RHF + Zod
│   └── seo/               # JsonLd компонент
└── lib/
    ├── data/              # seed content (services, blog, team, etc.)
    ├── site.ts            # бизнес метаданни
    ├── schema.ts          # JSON-LD генератори
    └── utils.ts           # cn(), slugify(), formatPrice()
```

## Routes

- `/` — Home с hero, услуги, екип, testimonials, FAQ, blog preview
- `/uslugi` + `/uslugi/[slug]` — 4 категории с пълни ценоразписи
- `/galeriya` — masonry с lightbox и filter
- `/montibello` + `/montibello/[product]` — 6 HOP Ultra продукта
- `/za-nas` — история, ценности, екип, timeline
- `/blog` + `/blog/[slug]` — 7 статии с related posts
- `/contacts` — форма + Google Maps + работно време
- `/karieri` — отворени позиции

## Деплой

Препоръчителен deploy: **Vercel** — нулева конфигурация, edge runtime, автоматичен ISR.

```bash
vercel
```

## Brand Tokens

Дефинирани в `src/app/globals.css`:

- **Burgundy:** `oklch(0.38 0.13 18)` — primary
- **Rose Gold:** `oklch(0.72 0.115 38)` — accent
- **Champagne:** `oklch(0.93 0.04 80)` — secondary
- **Cream:** `oklch(0.97 0.02 80)`

Шрифтове: **Playfair Display** (display), **Inter** (body), **Cormorant Garamond** (serif accent).

---

🤖 Изграден с Claude Code · 2026
