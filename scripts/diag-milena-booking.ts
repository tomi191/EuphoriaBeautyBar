/** Диагностика: записът на Милена Йорданова — кога е създаден, по кой канал, известия. */
import { ilike, desc, eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const TZ = "Europe/Sofia";
const fmt = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("bg-BG", { dateStyle: "short", timeStyle: "medium", timeZone: TZ }).format(d) : "—";

async function main() {
  const rows = await db
    .select({ b: schema.bookings, clientName: schema.clients.name, clientPhone: schema.clients.phone })
    .from(schema.bookings)
    .innerJoin(schema.clients, eq(schema.bookings.clientId, schema.clients.id))
    .where(ilike(schema.clients.name, "%милена%"))
    .orderBy(desc(schema.bookings.createdAt));

  console.log(`Намерени ${rows.length} записа с „Милена":\n`);
  for (const { b, clientName, clientPhone } of rows) {
    console.log(`— ${clientName} | услуга: ${b.serviceName}`);
    console.log(`  час: ${fmt(b.startAt)} → ${fmt(b.endAt)} | статус: ${b.status}`);
    console.log(`  СЪЗДАДЕН: ${fmt(b.createdAt)} | source: ${b.source} | createdBy: ${b.createdBy ?? "—"}`);
    console.log(`  resourceId: ${b.resourceId} | тел: ${clientPhone ?? "—"}\n`);
  }

  const resIds = [...new Set(rows.map((r) => r.b.resourceId))];
  for (const rid of resIds) {
    const res = await db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.id, rid) });
    const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.resourceId, rid));
    console.log(`Изпълнител ${res?.name} (${rid}):`);
    console.log(`  telegramChatId: ${res?.telegramChatId ?? "НЕ Е СВЪРЗАН"}`);
    console.log(`  push абонаменти: ${subs.length}`);
    for (const s of subs) console.log(`    - ${s.endpoint.slice(0, 60)}... (създаден ${fmt(s.createdAt)})`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
