import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { parseCallClick, sofiaDay } from "@/lib/call-clicks";
import { createRateLimiter } from "@/lib/call-clicks-limit";

/**
 * Цел П3 (решение 7): брояч на «Обади се» и Viber. Браузърът праща { page, kind, spot } със sendBeacon
 * (src/components/analytics/call-click-counter.tsx). Записва се само ден, страница, копче и брой:
 * без бисквитки, без IP и без идентификатор на човека. Срещу наводняване: само от нашия сайт, таван на
 * заявките от един адрес и общо, таван на броя на ред и на новите редове за ден.
 */
export const runtime = "nodejs";

const MAX_BODY = 512;
const ROW_CAP = 1000; // най-много натискания на един ред (ден, страница, копче)
const DAY_ROWS_CAP = 500; // най-много различни редове за един ден
const allow = createRateLimiter({ perKey: 10, total: 300, windowMs: 60_000 });

function fromOurSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!fromOurSite(req)) return new Response(null, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return new Response(null, { status: 413 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  if (!allow(ip, Date.now())) return new Response(null, { status: 429 });

  const text = await req.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const hit = parseCallClick(body);
  if (!hit) return new Response(null, { status: 400 });

  const day = sofiaDay(new Date());
  try {
    const updated = await db.execute(sql`
      UPDATE call_clicks SET count = count + 1
      WHERE day = ${day}::date AND page = ${hit.page} AND kind = ${hit.kind} AND spot = ${hit.spot} AND count < ${ROW_CAP}
      RETURNING 1`);
    if (updated.length === 0) {
      await db.execute(sql`
        INSERT INTO call_clicks (day, page, kind, spot, count)
        SELECT ${day}::date, ${hit.page}, ${hit.kind}, ${hit.spot}, 1
        WHERE (SELECT count(*) FROM call_clicks WHERE day = ${day}::date) < ${DAY_ROWS_CAP}
        ON CONFLICT (day, page, kind, spot) DO UPDATE SET count = call_clicks.count + 1
        WHERE call_clicks.count < ${ROW_CAP}`);
    }
  } catch (err) {
    console.error("[call-click] записът не мина:", err instanceof Error ? err.message : err);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
