import { renderLlmsTxt } from "@/lib/seo/llms";

/**
 * Динамичен /llms.txt (замени статичния public/ файл) — цените идват от DB
 * каталога и никога не остаряват. force-dynamic: DB липсва на build-time
 * (same pattern като sitemap-index). CDN кешира 1 час през Cache-Control.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return new Response(await renderLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, must-revalidate",
    },
  });
}
