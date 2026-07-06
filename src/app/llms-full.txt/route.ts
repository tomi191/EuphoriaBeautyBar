import { renderLlmsFullTxt } from "@/lib/seo/llms";

/** Пълната версия на /llms.txt — целият жив ценоразпис + FAQ (виж lib/seo/llms.ts). */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return new Response(await renderLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, must-revalidate",
    },
  });
}
