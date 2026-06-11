# Montibello каталог v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Изграждане на пълноценен Montibello каталог с реални имена, официални снимки, табова навигация и страница за всеки продукт с humanized копи.

**Architecture:** Разширен типизиран модел в `src/lib/data/montibello.ts` (без DB). Официалните снимки се свалят еднократно от montibello.com в `public/images/montibello/`. `/montibello` става каталог с client-side категорийни табове; `/montibello/[product]` рендира страница за всеки продукт. SEO: `ItemList`/`Product` schema без `Offer`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, motion/react, next/image. Без тест-харнес — верификация = `npm run build` зелен + Playwright на живо.

**Spec:** `docs/superpowers/specs/2026-06-11-montibello-catalog-v2-design.md`

---

## Task 1: Извличане на реалните данни + image URL-и от montibello.com

**Files:**
- Create: `scripts/montibello-scrape.ts` (еднократен събирач на факти)
- Output: `scripts/montibello-raw.json` (суровите извлечени данни — gitignore-нат или временен)

- [ ] **Step 1: Идентифицирай реалните HOP линии и под-страници**

Чрез WebFetch обходи: `https://hair.montibello.com/en/range/hop/` и под-страниците на всяка линия (Ultra Repair, Smooth Hydration, Full Volume, Silver White, Colour Last, Blonde Glow, Detox, Sun Care, Sensitive Protection, Purifying Balance, Reflects). За всяка: реално име, тип продукт (шампоан/маска/балсам), кратко описание, за коя коса, ключови съставки (ако са посочени), и URL на официалната продуктова снимка.

За професионалните системи: `https://hair.montibello.com/en/` → разделите за Coloration (Cromatone и вариантите), Oxidants (Oxibel), Styling (Decode). Извлечи имена на линиите + фактически едноредови описания + image URL-и ако има.

- [ ] **Step 2: Запиши суровите данни в JSON**

`scripts/montibello-scrape.ts` извежда масив от обекти `{ slug, name, line, categorySlug, productType, rawDescription, forHairType, keyIngredients[], imageUrl }` в `scripts/montibello-raw.json`. Скриптът само логва намереното (за човешки преглед) — не пише в `montibello.ts` директно.

- [ ] **Step 3: Contingency — ако image URL-ите не са достъпни**

montibello.com ползва yootheme-кеширани URL-и, които може да са зад JS/защита. Ако WebFetch/curl не върнат чисти, сваляеми image URL-и:
- Маркирай продукта с `imageUrl: null` в JSON.
- В резюмето към потребителя избройй кои продукти нямат снимка и поискай: (а) директни линкове / dealer kit, или (б) потвърждение да ползваме accent fallback за тях засега.

НЕ блокирай останалите задачи — каталогът работи с accent fallback там, където снимка липсва (полето `officialImage` е опционално).

- [ ] **Step 4: Commit (скриптът, без raw JSON ако е временен)**

```bash
git add scripts/montibello-scrape.ts
git commit -m "Montibello v2: scrape script for real catalog facts + image urls"
```

---

## Task 2: Сваляне на официалните снимки в public/

**Files:**
- Create: `public/images/montibello/<slug>.jpg` (по една за продукт с наличен imageUrl)

- [ ] **Step 1: Свали наличните снимки**

За всеки продукт с `imageUrl` в `montibello-raw.json`, свали с `curl` в `public/images/montibello/<slug>.jpg`. Пример:

```bash
curl -sL "<imageUrl>" -o "public/images/montibello/ultra-repair.jpg"
```

Нормализирай имената към slug-овете (`ultra-repair`, `smooth-hydration`…). Изтрий старите/неизползвани montibello снимки, които v2 няма да ползва (провери срещу новия модел преди изтриване).

- [ ] **Step 2: Провери, че снимките са валидни изображения**

Run: `file public/images/montibello/*.jpg` (или PowerShell `Get-Item` за размер > 0)
Expected: всички са реални JPEG/PNG, не HTML error страници (ако curl е хванал 403 → размерът е малък/HTML → маркирай липсваща).

- [ ] **Step 3: Commit**

```bash
git add public/images/montibello/
git commit -m "Montibello v2: official product images"
```

---

## Task 3: Разширен модел на данните + humanized копи (`montibello.ts`)

**Files:**
- Modify: `src/lib/data/montibello.ts`

- [ ] **Step 1: Обнови `MontibelloProduct` интерфейса**

Добави полета спрямо spec §3: `description` (задължително), `keyIngredients?: string[]`, `officialImage?: string`, `professional?: boolean`. Премахни `hasDetailPage` функцията (в v2 всеки продукт има страница). Запази `MontibelloAccent`, `accentColor`, `montibelloCategories` (фиксирани 4: grizha/boyadisvane/oksidanti/stayling), `getMontibelloProduct`, `productsByCategory`.

- [ ] **Step 2: Попълни реалните продукти от raw JSON, с humanized копи**

За всеки продукт: реалното име, коректен `productType`, `shortDescription` (1 ред), `description` (2-3 абзаца). Описанията се пишат на естествен български въз основа на `rawDescription` от montibello.com — заземени във фактите, БЕЗ AI-slop (без „революционен/перфектен/в дигиталната ера", без „не просто X а Y", без rule-of-three калъп). Професионалните продукти получават `professional: true` и салонен тон (не retail обещания). `officialImage` сочи към свалената снимка или се оставя undefined (accent fallback).

- [ ] **Step 3: Humanizer pass върху копито**

Пусни `/humanizer` skill върху всички нови `description`/`shortDescription` стрингове. Поправи всеки маркиран AI-патърн inline.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: без грешки (всички консуматори на стария `hasDetailPage`/`.color` са обновени в следващите задачи — ако tsc гърми тук заради тях, продължи; ще се вдигнат в Task 4-6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/montibello.ts
git commit -m "Montibello v2: real product data with humanized copy"
```

---

## Task 4: Client компонент за категорийни табове

**Files:**
- Create: `src/components/montibello/catalog-tabs.tsx`

- [ ] **Step 1: Напиши `CatalogTabs` компонента**

`"use client"`. Props: `categories: MontibelloCategory[]`, `products: MontibelloProduct[]`. State: активна категория (`"all"` по подразбиране). Рендира:
- `role="tablist"` лента с бутон за всяка категория + „Всички"; активният с `aria-selected`, sage акцент; keyboard-достъпни (нативни `<button>`).
- Филтрирана продуктова мрежа (`productsByCategory` или всички): карти с official снимка (или accent gradient fallback при липса), име, `productType`, `shortDescription`, „за коя коса", дискретен „салонна употреба" етикет ако `professional`. Всяка карта е `<Link href={/montibello/${slug}}>` с `hover:border-foreground/30`.
- Sticky таб-лента (`sticky top-[Nrem]`) с фон, за да не се губи при скрол.

- [ ] **Step 2: Type-check компонента**

Run: `npx tsc --noEmit`
Expected: без грешки в `catalog-tabs.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/montibello/catalog-tabs.tsx
git commit -m "Montibello v2: category tabs client component"
```

---

## Task 5: Пренаписване на `/montibello` листинга

**Files:**
- Modify: `src/app/montibello/page.tsx`

- [ ] **Step 1: Пренапиши страницата**

Структура (spec §5): Hero (BlurText заглавие + кратък брандов разказ + каталожна снимка) → `LineDivider` → `<CatalogTabs categories={montibelloCategories} products={montibelloProducts} />` → disclaimer „само на място в салона" → CTA „Запиши консултация" (`/zapazi-chas`, `hover:bg-primary`).

Metadata: title/description/canonical/OG (на www). `ItemList` JSON-LD през `<JsonLd>` — `Product` обекти **без `Offer`/цена**, с `brand: Montibello`, `category`, `image` (ако има), `url` към продуктовата страница.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: ✓ Compiled, без TS грешки, `/montibello` се генерира.

- [ ] **Step 3: Commit**

```bash
git add src/app/montibello/page.tsx
git commit -m "Montibello v2: tabbed catalog listing"
```

---

## Task 6: Пренаписване на `/montibello/[product]` за всеки продукт

**Files:**
- Modify: `src/app/montibello/[product]/page.tsx`

- [ ] **Step 1: Пренапиши страницата**

`generateStaticParams` върху ВСИЧКИ `montibelloProducts` (премахни `hasDetailPage` филтъра). Секции (spec §6): breadcrumb → hero (официална снимка с accent gradient фон + `fetchPriority="high"`, `line · productType` eyebrow, BlurText име, shortDescription serif italic, humanized description, „само на място" бележка, CTA „Запиши консултация"/„Към каталога") → (ако има) „За коя коса" + „Ключови съставки" факт-блокове → „Други от линията" (свързани от същата `line`/категория).

Metadata per продукт; canonical/OG. JSON-LD: `Product` (name, description, brand:Montibello, category, image) **без Offer** + `BreadcrumbList`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: ✓ всички продуктови страници генерирани (по една на продукт).

- [ ] **Step 3: Commit**

```bash
git add "src/app/montibello/[product]/page.tsx"
git commit -m "Montibello v2: per-product pages"
```

---

## Task 7: Sitemap — всички продукти

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Премахни `hasDetailPage` филтъра**

Промени `montibelloProducts.filter(hasDetailPage).map(...)` на `montibelloProducts.map(...)` и махни вече-несъществуващия `hasDetailPage` import.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: ✓ зелен; sitemap включва всички montibello продукти.

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "Montibello v2: all products in sitemap"
```

---

## Task 8: Push + жива верификация

- [ ] **Step 1: Push**

```bash
git push
```

- [ ] **Step 2: Изчакай Vercel deploy** (poll през Playwright, НЕ curl — Vercel checkpoint блокира curl)

- [ ] **Step 3: Playwright верификация на живо**

Navigate `https://www.euphoriabeauty.eu/montibello`; ако е checkpoint — изчакай ~3s. Провери:
- Табовете филтрират по категория (кликни всеки таб, мрежата се сменя).
- Официалните снимки се зареждат (нула счупени img; `naturalWidth > 0`).
- Всеки продукт има работеща страница (sample 2-3 slug-а → 200, не 404).
- Нула „Hair Oil Plus" / измислени факти в текста.
- Disclaimer „само на място" наличен.
- `ItemList` + `Product` JSON-LD валиден и **без** `Offer`/`price`.
- Нула виолет/циан oklch (hue 295/200) в HTML.

- [ ] **Step 4: Финален отчет**

Резюме на изпълненото + кои продукти (ако има) чакат снимки от потребителя.

---

## Дефиниция за готовност (spec §10)

- `next build` зелен; всички продуктови страници генерирани.
- Жива Playwright проверка: табове филтрират, официални снимки се зареждат, всеки продукт има страница, нула измислени факти, disclaimer наличен, JSON-LD без Offer, нула off-brand цветове.
- Копи преминало humanizer pass.
