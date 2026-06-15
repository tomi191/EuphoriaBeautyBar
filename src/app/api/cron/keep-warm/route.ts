import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Keep-warm: лек DB ping на всеки 5 мин, за да държи Supabase connection pool-а
 * (региона dub1 = co-located с eu-west-1 DB) топъл. Целта е изпълнителското
 * приложение да не плаща SSL+pooler cold-connect при първо отваряне сутрин.
 * Fluid Compute reuse-ва инстанцията; този ping държи и connection-а ѝ жив.
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.execute(sql`select 1`);
  return NextResponse.json({ ok: true });
}
