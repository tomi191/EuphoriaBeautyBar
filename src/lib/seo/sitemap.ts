/**
 * Sitemap-index архитектура (canonical LEVEL 8 pattern).
 *
 * Структура (виж vault: 2026/SEO/Sitemap & Robots Architecture):
 *   /sitemap.xml            → <sitemapindex>, изброява секциите по-долу
 *   /sitemap/<section>.xml  → <urlset> per семантична секция (main, services, …)
 *
 * Защо НЕ Next.js `MetadataRoute.Sitemap` (плоският `app/sitemap.ts`):
 *  - един `lastmod` за всичко смесва freshness сигналите (blog днес = „За нас" '23)
 *  - няма per-type split → бъдеща разрастване изисква reorganize
 *  - route handlers с `force-dynamic` избягват `Vary: rsc`, който Googlebot
 *    отхвърля (1-месечният vrachka инцидент — виж сесия 2026-05-16)
 *
 * Тук е single source of truth за секциите; route файловете само рендират.
 */
import { getServiceCatalog } from "@/lib/data/service-catalog";
import { getPublishedPosts } from "@/lib/data/blog-store";
import { montibelloProducts } from "@/lib/data/montibello";

export type Changefreq = "weekly" | "monthly" | "yearly";

export interface SitemapEntry {
  /** Path без хост — базата се добавя при рендер (напр. "/uslugi/kozmetika"). */
  path: string;
  /** ISO дата; ако липсва, под-sitemap-ът не emit-ва `<lastmod>` (по-честно от deceptive now). */
  lastmod?: string;
  changefreq?: Changefreq;
  priority?: number;
}

export interface SitemapSection {
  id: string;
  build: () => Promise<SitemapEntry[]>;
}

/** Статични страници — index-ите на под-разделите живеят тук, детайлите в своите секции. */
const STATIC_PATHS = [
  "",
  "/uslugi",
  "/zapazi-chas",
  "/galeriya",
  "/montibello",
  "/za-nas",
  "/contacts",
  "/karieri",
  "/blog",
] as const;

export const SECTIONS: SitemapSection[] = [
  {
    id: "main",
    build: async () =>
      STATIC_PATHS.map((path) => ({
        path,
        changefreq: "weekly" as const,
        // Home носи максимален priority; останалите статични страници — 0.8.
        priority: path === "" ? 1.0 : 0.8,
      })),
  },
  {
    id: "services",
    build: async () => {
      const categories = await getServiceCatalog();
      return categories.map((c) => ({
        path: `/uslugi/${c.slug}`,
        changefreq: "monthly" as const,
        priority: 0.7,
      }));
    },
  },
  {
    id: "montibello",
    build: async () =>
      montibelloProducts.map((p) => ({
        path: `/montibello/${p.slug}`,
        changefreq: "monthly" as const,
        priority: 0.6,
      })),
  },
  {
    id: "blog",
    build: async () => {
      const posts = await getPublishedPosts();
      return posts.map((p) => ({
        path: `/blog/${p.slug}`,
        // Честен lastmod: updatedAt ако постът е редактиран, иначе датата на публикуване.
        lastmod: p.updatedAt ?? p.date,
        changefreq: "monthly" as const,
        priority: 0.6,
      }));
    },
  },
];

export function findSection(id: string): SitemapSection | undefined {
  return SECTIONS.find((s) => s.id === id);
}

/**
 * Lastmod за index entry-то на секцията = най-скорошният `lastmod` от нейните URL-и.
 * Ако секцията няма per-URL дати (статичен каталог) → now (route-ът е dynamic,
 * така че това е „кога е сервиран кодът", не deceptive).
 */
export function latestLastmod(entries: SitemapEntry[]): string {
  const dates = entries.map((e) => e.lastmod).filter((d): d is string => Boolean(d));
  if (dates.length === 0) return new Date().toISOString();
  return dates.reduce((a, b) => (a > b ? a : b));
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderUrl(base: string, entry: SitemapEntry): string {
  const lines = [`    <loc>${xmlEscape(`${base}${entry.path}`)}</loc>`];
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  if (entry.priority !== undefined) lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
  return `  <url>\n${lines.join("\n")}\n  </url>`;
}

export function renderUrlset(base: string, entries: SitemapEntry[]): string {
  const urls = entries.map((e) => renderUrl(base, e)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function renderSitemapIndex(items: { loc: string; lastmod: string }[]): string {
  const sitemaps = items
    .map((s) => `  <sitemap>\n    <loc>${xmlEscape(s.loc)}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;
}
