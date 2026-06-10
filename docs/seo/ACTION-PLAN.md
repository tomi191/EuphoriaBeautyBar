# SEO Action Plan — Euphoria (10.06.2026)

## Critical — няма ✅
Всички critical находки от сутрешния одит са поправени и верифицирани (canonical, BlogPosting image, sitemap, robots, stuffing в статиите).

## High (тази седмица)
1. **Vercel deploy** — добави env vars (виж чата), redeploy. Без production нищо не се индексира.
2. **Google Search Console** — потвърди euphoriabeauty.eu, подай sitemap.xml.
3. **Скъси home title** на ~50 знака (`layout.tsx` default title) и description на ~155.

## Medium (този месец)
4. Премахни фалшивия SearchAction от WebSite schema (`src/lib/schema.ts`).
5. Консолидирай Person entity (`@id: /za-nas#snezhana`) в localBusiness founder + personSchema + blog author; смени image с реален портрет (`/images/team/snezhana.jpg`).
6. `dateModified` от `updatedAt` колоната в BlogPosting.
7. Google Business Profile: вземи `GOOGLE_PLACE_ID` + `GOOGLE_PLACES_API_KEY` → реални отзиви + рейтинг на сайта.
8. Публикувай 2-4 нови статии/месец (Генерирай с AI → преглед → Публикувай). Теми: „Предложи теми" бутона дава сезонни.

## Low (backlog)
9. Permissions-Policy + CSP headers (`next.config.ts`).
10. Maps iframe facade (статична снимка + click-to-load) за по-лек LCP.
11. Реални CWV измервания след production (PageSpeed Insights).
