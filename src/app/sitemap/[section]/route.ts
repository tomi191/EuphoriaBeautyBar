import { siteConfig } from "@/lib/site";
import { findSection, renderUrlset } from "@/lib/seo/sitemap";

/**
 * Семантичен под-sitemap: /sitemap/main.xml, /sitemap/services.xml, …
 * `force-dynamic` + липса на `generateStaticParams` → Next не prerender-ва тези
 * routes, така че не bake-ва `Vary: rsc` (виж sitemap.xml/route.ts за контекста).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> },
): Promise<Response> {
  const { section: raw } = await params;
  // Index-ът сочи към "/sitemap/<id>.xml" → param-ът идва като "main.xml".
  const id = raw.replace(/\.xml$/i, "");
  const section = findSection(id);

  if (!section) {
    return new Response("Sitemap section not found", { status: 404 });
  }

  const entries = await section.build();

  return new Response(renderUrlset(siteConfig.url, entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, must-revalidate",
    },
  });
}
