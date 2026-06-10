# SEO одит — Euphoria Hair & Beauty Bar

**Дата:** 10.06.2026 · **Среда:** локален production build (Vercel deploy чака env vars) · **Тип бизнес:** локален салон за красота (BeautySalon/HairSalon), кв. Левски, Варна

## Executive Summary

**SEO Health Score: 85/100** (предишен одит същата сутрин: 70/100)

Всички P0/P1 находки от сутрешния одит са поправени и **верифицирани върху рендирания HTML**. Сайтът е технически готов за индексиране. Оставащите точки са P2 полиране + production-зависими (реални CWV, GSC).

| Категория | Тегло | Скор |
|---|---|---|
| Technical SEO | 25% | 88 |
| Content Quality | 25% | 85 |
| On-Page SEO | 20% | 82 |
| Schema / Structured Data | 10% | 85 |
| Performance (структурно) | 10% | 80 |
| Images | 5% | 95 |
| AI Search Readiness | 5% | 85 |

## Верифицирани фиксове (рендиран HTML, локален prod)

| Проверка | Резултат |
|---|---|
| Canonical per-page (9 страници) | ✅ всяка сочи собствения си URL |
| robots.txt AI-bot група | ✅ Disallow /api/ /admin/ и за GPTBot/ClaudeBot/Perplexity |
| Sitemap | ✅ 21 URL-а, /zapazi-chas включен |
| BlogPosting JSON-LD image | ✅ валиден Supabase URL, без двойния протокол бъг |
| BlogPosting author | ✅ Person „Снежана Саблева" + jobTitle |
| LocalBusiness schema | ✅ BeautySalon/HairSalon/LocalBusiness + geo/address/hasMap |
| noindex покритие | ✅ /staff, /admin, /verify-email скрити; публичните index,follow |
| Hero | ✅ „запазваш онлайн…" + динамично работно време |
| Images alt | ✅ 0 от 42 без alt (23 decorative с alt="") |
| og:image | ✅ динамичен (opengraph-image route) |

## Content

2 публикувани AI статии — чисти (0 keyword stuffing, 0 клишета-маркери, проверено), с cover + 2 inline снимки, аудио, автор, share, internal links към услугите, цени в €. E-E-A-T: реален автор с лице, честни „за кого не е" секции, реални марки и числа. Слабост: обемът е малък (2 статии) — нужна е регулярна публикация.

## Оставащи находки

### Medium (P2)
1. **Home title 81 знака** — реже се в SERP (~60). Препоръка: `Euphoria — салон за красота в кв. Левски, Варна` (~47).
2. **Meta description 184 знака** (home) — Google реже на ~160.
3. **Фалшив SearchAction** в WebSite schema (сочи /blog?q=, който не съществува; Sitelinks Search Box е пенсиониран) — да се премахне.
4. **3 отделни Person обекта** за Снежана без `@id` — консолидация в `#snezhana` entity подсилва E-E-A-T.
5. **Person image** е генерична снимка на услуга, не портрет.
6. **dateModified = datePublished** винаги в BlogPosting.
7. **Security headers**: липсват HSTS (Vercel го добавя сам), Permissions-Policy, CSP.

### Production-зависими (след deploy)
- Реални Core Web Vitals (LCP/INP/CLS) — структурно сайтът е готов (priority hero, lazy iframe, AVIF/WebP, font swap), но реално измерване изисква production.
- Google Search Console: потвърждение на собственост + подаване на sitemap.
- Google Business Profile линк + reviews интеграция (чака GOOGLE_PLACE_ID + API key).
- HSTS виж в production response.

## AI Search Readiness: 85
- AI ботове допуснати (с коректни disallow) ✓ чисто, цитируемо съдържание с конкретика ✓ FAQ секция ✓ LocalBusiness structured data ✓ TTS аудио версия на статиите (бонус достъпност).
