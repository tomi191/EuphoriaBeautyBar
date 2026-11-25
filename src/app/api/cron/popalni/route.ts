import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { loadPopalniData, runPopalniCron } from "@/lib/admin/popalni";
import { sendTelegramToAdmin } from "@/lib/telegram";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

/** «Какво да попълниш» в Telegram, 10:00 Europe/Sofia (визия №45). Часът се проверява в runPopalniCron. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const summary = await runPopalniCron(new Date(), {
    load: loadPopalniData,
    send: (text, keyboard) => sendTelegramToAdmin(text, keyboard),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url,
  });
  return NextResponse.json({ ok: true, ...summary });
}
