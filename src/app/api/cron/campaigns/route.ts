import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runCampaignCron } from "@/lib/campaigns/lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Промоциите в 00:00 Europe/Sofia (№11, част 4). Vercel cron е в UTC: пуска се в 21:00 и в 22:00 UTC, за да
 * хване полунощ и през лятото, и през зимата; всичко е по софийската дата и веднъж, затова второто пускане
 * не прави нищо ново.
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const summary = await runCampaignCron();
  return NextResponse.json({ ok: true, ...summary });
}
