import { getPublishedPosts } from "@/lib/data/blog-store";
import { siteConfig } from "@/lib/site";

/**
 * RSS 2.0 feed на журнала (P2-5 от SEO плана): freshness сигнал + дистрибуция
 * (четци, агрегатори, AI краулери). Force-dynamic като sitemap-ите — чете
 * публикуваните постове от БД при всяко искане (CDN кешира 1 час).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let items = "";
  try {
    const posts = await getPublishedPosts();
    items = posts
      .map((p) => {
        const url = `${siteConfig.url}/blog/${p.slug}`;
        return [
          "    <item>",
          `      <title>${xmlEscape(p.title)}</title>`,
          `      <link>${url}</link>`,
          `      <guid isPermaLink="true">${url}</guid>`,
          `      <pubDate>${new Date(p.date).toUTCString()}</pubDate>`,
          `      <category>${xmlEscape(p.category)}</category>`,
          `      <description>${xmlEscape(p.excerpt)}</description>`,
          "    </item>",
        ].join("\n");
      })
      .join("\n");
  } catch {
    // БД недостъпна → празен, но валиден feed (по-добре от 500).
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(siteConfig.name)} — Журнал</title>
    <link>${siteConfig.url}/blog</link>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Съвети за коса, нокти и кожа от салон ${xmlEscape(siteConfig.shortName)} в кв. Левски, Варна.</description>
    <language>bg</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
