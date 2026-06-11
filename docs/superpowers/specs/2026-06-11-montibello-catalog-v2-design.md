# Montibello каталог v2 — дизайн

**Дата:** 2026-06-11
**Статус:** одобрен дизайн, чака implementation plan
**Контекст:** Произлиза от одит №5. v1 (commit 4734ba1) въведе категоризиран каталог с
коригирани данни, но HOP продуктите ползват приблизителни имена, нямат официални
снимки (рендира се accent fallback), а не-HOP линиите са display-only факт-карти.
v2 добавя реалните имена, официалните снимки и пълноценна страница за всеки продукт.

---

## 1. Цел

Представяне на каталога на Montibello (партньорска марка) на euphoriabeauty.eu с:
- реалните продуктови имена и официалните снимки от montibello.com;
- категориен каталог с табове + филтър;
- отделна страница за всеки продукт с компактно, humanized копи;
- БЕЗ онлайн продажба — покупка само на място в салона.

Не-цели (YAGNI): кошница/цени/checkout; DB + admin CRUD (отложено, виж §8);
автоматичен/cron sync с montibello.com (извличането е еднократно).

---

## 2. Решения (от brainstorming)

| Тема | Решение |
|------|---------|
| Снимки | Официални от montibello.com, свалени локално в `public/images/montibello/` (версионирани, deploy-ват с кода — без зависимост от чужд кеш/prod storage) |
| Обхват | Целият каталог: HOP ретейл грижа (~11 линии) + професионални системи (бои Cromatone, оксиданти Oxibel, стайлинг Decode) |
| Копи | Компактно + салонен глас; реалните описания от montibello.com, преписани на естествен български през `/humanizer`; заземено във фактите, без фабрикуване |
| Layout | Каталог с лепнати категорийни табове + филтрирана продуктова мрежа |
| Продуктови страници | Всеки продукт има своя `/montibello/[product]` |
| Данни | Разширен типизиран модел в `montibello.ts` (не DB) |

---

## 3. Модел на данните (`src/lib/data/montibello.ts`)

Запазваме `MontibelloCategory` (с леки добавки) и разширяваме `MontibelloProduct`:

```ts
export interface MontibelloProduct {
  slug: string;
  name: string;            // реалното име: "Ultra Repair", "Smooth Hydration"…
  line: "HOP" | "Cromatone" | "Oxibel" | "Decode" | string;
  categorySlug: string;    // grizha | boyadisvane | oksidanti | stayling
  productType: "шампоан" | "маска" | "балсам" | "спрей" | "боя" | "оксидант" | "стайлинг" | "терапия";
  shortDescription: string;          // 1 ред за картата
  description: string;               // 2-3 абзаца, humanized
  forHairType?: string;
  keyIngredients?: string[];         // ако montibello.com ги посочва (факт)
  officialImage?: string;            // /images/montibello/<slug>.jpg
  accent: MontibelloAccent;          // палитра (sage/mint/blush/ink)
  professional?: boolean;            // true за салонните системи (различен tone/CTA)
}
```

Категории (фиксирани, 4): `grizha` (Грижа), `boyadisvane` (Боядисване),
`oksidanti` (Оксиданти), `stayling` (Стайлинг). Кератинови/изправящи салонни
процедури НЕ са отделна категория — попадат в `grizha` с `professional: true`
(показват се със салонен етикет). Така табовете остават 4 + „Всички".

Помощни функции (запазени/разширени): `getMontibelloProduct`, `productsByCategory`,
`accentColor`. Премахва се `hasDetailPage` — в v2 ВСеки продукт има страница.

---

## 4. Извличане (еднократен скрипт `scripts/montibello-scrape.ts`)

Поток:
1. Fetch на HOP range страницата + под-страниците на montibello.com (WebFetch за
   структурата; реалните image URL-и от HTML-а).
2. Извличане per продукт: име, тип, реално описание, за коя коса, ключови съставки,
   URL на официалната снимка.
3. Сваляне на снимките (`curl`) в `public/images/montibello/<slug>.jpg`.
4. Описанията се преписват през `/humanizer` (ръчно/асистирано) → естествен български,
   anti-slop, заземено. Това НЕ е автоматично в скрипта — скриптът събира суровите
   факти, копито се финализира от човек/humanizer pass и влиза в `montibello.ts`.

Скриптът е one-shot (не cron). Резултатът се commit-ва в `montibello.ts` +
снимките в `public/`. Ако montibello.com промени структурата → скриптът се преглежда
ръчно, не runtime.

**Правен бележка:** официалните снимки на бранд, който салонът реално продава —
стандартна партньорска практика, нисък риск. Ако дистрибуторът предостави media-kit
с изрични условия, той е по-чистият източник.

---

## 5. Layout — `/montibello` (каталог с табове)

Структура (отгоре надолу):
1. **Hero** — кратък брандов разказ (Montibello, Барселона; защо салонът работи с тях),
   една официална/каталожна снимка, `BlurText` заглавие.
2. **LineDivider** (брандови разделител).
3. **Категорийни табове** — лепнати (sticky), client component; филтрират мрежата
   без презареждане. Таб „Всички" по подразбиране. Достъпни (role=tablist, keyboard).
4. **Продуктова мрежа** — карти с официална снимка, име, тип, shortDescription,
   „за коя коса"; линк към продуктовата страница. `hover:border-foreground/30`,
   sage hover на интерактивите.
5. **Disclaimer** — „Продуктите се предлагат само на място в салона."
6. **CTA** — „Запиши консултация" → `/zapazi-chas`.

Професионалните продукти се показват в съответните табове, но с дискретен етикет
„салонна употреба" и без подвеждащ retail тон.

---

## 6. Продуктова страница — `/montibello/[product]`

`generateStaticParams` върху ВСИЧКИ продукти. Секции:
1. Breadcrumb (Начало › Montibello › име).
2. Hero: официална снимка (с accent gradient фон) + `line · productType` eyebrow +
   `BlurText` име + shortDescription (serif italic) + humanized description +
   „само на място" бележка + CTA „Запиши консултация" / „Към каталога".
3. (ако има) „За коя коса" + „Ключови съставки" — компактни факт-блокове.
4. „Други от линията" — свързани продукти от същата `line`/категория.

`fetchPriority="high"` на hero снимката (perf урок от одит №4).

---

## 7. SEO

- `/montibello`: `ItemList` schema с `Product` обекти **без `Offer`/цена**; canonical;
  OG per-page.
- `/montibello/[product]`: `Product` schema (name, description, brand:Montibello,
  category, image) **без `Offer`/price** + `BreadcrumbList`; canonical; OG.
- `sitemap.ts`: всички продукти (вече имат реални страници — премахва се
  `hasDetailPage` филтърът).
- Без `Offer`/`AggregateOffer`/`PriceSpecification` никъде — иначе Google третира
  страниците като shopping оферти.

---

## 8. Съзнателно отложено

**DB таблици (`montibello_categories` + `montibello_products`) + admin CRUD** за
самостоятелна редакция от Снежана. Причини: (1) prod Supabase миграция е блокирана за
агента; (2) по-ценно е когато каталогът се мени често. Типизираният модел е DB-ready
(полетата мапват 1:1 към бъдеща схема). Активира се като отделен етап при нужда.

---

## 9. Файлове

| Файл | Действие |
|------|----------|
| `scripts/montibello-scrape.ts` | НОВ — еднократно извличане на факти + image URL-и |
| `public/images/montibello/*.jpg` | НОВИ — официални снимки |
| `src/lib/data/montibello.ts` | разширен модел + реални данни + humanized копи |
| `src/app/montibello/page.tsx` | пренаписан — hero + табове + филтрирана мрежа |
| `src/components/montibello/catalog-tabs.tsx` | НОВ — client филтър по категория |
| `src/app/montibello/[product]/page.tsx` | пренаписан — пълна страница за всеки продукт |
| `src/app/sitemap.ts` | премахва `hasDetailPage` филтъра |

---

## 10. Верификация (definition of done)

- `next build` зелен; всички продуктови страници генерирани.
- Жив (Playwright): табовете филтрират; официалните снимки се зареждат; всеки продукт
  има страница; нула „Hair Oil Plus"/измислени факти; disclaimer наличен;
  `Product`/`ItemList` JSON-LD валиден и **без Offer**; нула виолет/циан oklch.
- Копи: преминало humanizer pass (без AI-slop маркери).
