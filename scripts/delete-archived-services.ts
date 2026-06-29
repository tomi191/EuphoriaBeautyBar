/**
 * Изтрива старите услуги-капани (groupTitle="Архив" от нормализацията — 0/0 без
 * престой). resource_services → CASCADE (чистят се авто); bookings → SET NULL
 * (часовете пазят serviceName, само губят връзката към изтритата услуга).
 *
 * DRY-RUN: npx tsx --env-file=.env.local scripts/delete-archived-services.ts
 * APPLY:   npx tsx --env-file=.env.local scripts/delete-archived-services.ts --apply
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const APPLY = process.argv.includes("--apply");

async function main() {
  const archived = await db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.groupTitle, "Архив") });
  console.log(`\n${APPLY ? "🟢 APPLY" : "🔍 DRY-RUN"} — изтриване на архивирани услуги (${archived.length}):\n`);
  for (const a of archived) {
    const bks = await db.query.bookings.findMany({ where: (b, { eq }) => eq(b.serviceItemId, a.id), columns: { id: true } });
    const rs = await db.query.resourceServices.findMany({ where: (r, { eq }) => eq(r.serviceItemId, a.id), columns: { id: true } });
    console.log(`  „${a.name}" — ${bks.length} часа (→ name се пази, връзката NULL) · ${rs.length} оферти (CASCADE)`);
  }
  if (archived.length === 0) console.log("  (няма архивирани услуги)");
  if (!APPLY) { console.log(`\n👉 DRY-RUN — нищо не е изтрито. --apply за реално.\n`); process.exit(0); }

  for (const a of archived) {
    await db.delete(schema.serviceItems).where(eq(schema.serviceItems.id, a.id));
  }
  console.log(`\n✅ Изтрити ${archived.length} услуги.\n`);
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
