import { siteConfig } from "@/lib/site";
import { SECTIONS, latestLastmod, renderSitemapIndex } from "@/lib/seo/sitemap";

/**
 * Root sitemap index. `force-dynamic` е ЗАДЪЛЖИТЕЛЕН в Next.js 16+:
 * статичният prerender bake-ва `Vary: rsc` в кешираните headers, а Googlebot
 * отхвърля sitemap с Vary и never-retry-ва на същия URL (vrachka, 1 месец заседнал).
 * Plain `Response` (не `NextResponse`) — NextResponse участва в RSC negotiation.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const base = siteConfig.url;

  const items = await Promise.all(
    SECTIONS.map(async (section) => ({
      loc: `${base}/sitemap/${section.id}.xml`,
      lastmod: latestLastmod(await section.build()),
    })),
  );

  return new Response(renderSitemapIndex(items), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // CDN кешира 1 час; браузърът ревалидира. Cache-Control живее ТУК, не в
      // next.config headers() — там Next добавя Vary: rsc на match-натите routes.
      "Cache-Control": "public, max-age=0, s-maxage=3600, must-revalidate",
    },
  });
}
