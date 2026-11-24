import { renderPromoImage } from "@/lib/og/promo";
import { loadCampaignView, shortServiceName } from "@/lib/campaigns/facebook";
import { todaySofia } from "@/lib/campaigns/core";
import { longDay } from "@/lib/campaigns/rules";

/**
 * Картината на промоцията за Facebook (№11, част 4): 1080×1350 за поста, ?f=sq 1080×1080 за карта в карусела.
 * Само одобрена (течаща, свършила или спряна): чакаща или върната не се показва навън.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = /^[\w-]{1,40}$/.test(id) ? await loadCampaignView(id) : null;
  if (!v || (v.status !== "approved" && v.status !== "stopped") || v.services.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const names = v.services.map((s) => shortServiceName(s.name));
  const titleLines = names.length > 2 ? [...names.slice(0, 2), `и още ${names.length - 2}`] : names;
  const square = new URL(req.url).searchParams.get("f") === "sq";
  const img = renderPromoImage({ who: v.who, titleLines, until: `до ${longDay(v.endsOn, todaySofia())}`, square });
  img.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return img;
}
