import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

// ВРЕМЕНЕН диагностичен endpoint: SW „звъни" тук, щом получи push на устройството.
// Така разделяме „доставено до устройството" от „показано". Махни след диагностиката.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ts = url.searchParams.get("ts");
  if (ts) {
    const value = {
      ts,
      data: url.searchParams.get("data"),
      shown: url.searchParams.get("shown"),
      v: url.searchParams.get("v"),
      ua: (req.headers.get("user-agent") || "").slice(0, 120),
      at: new Date().toISOString(),
    };
    await db
      .insert(schema.siteSettings)
      .values({ key: "push-ack", value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value, updatedAt: new Date() } });
    return NextResponse.json({ recorded: true });
  }
  const row = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "push-ack") });
  return NextResponse.json({ ack: row?.value ?? null, updatedAt: row?.updatedAt ?? null });
}
