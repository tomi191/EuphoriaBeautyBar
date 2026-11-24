import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runCarouselCron } from "@/lib/campaigns/lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Седмичният карусел във Facebook (№11, част 4): понеделник сутрин. Vercel cron е в UTC: 06:00 и 07:00 UTC
 * в понеделник (08:00–10:00 в София според сезона); един пост на седмица, второто пускане казва «exists».
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runCarouselCron();
  return NextResponse.json({ ok: true, result });
}
