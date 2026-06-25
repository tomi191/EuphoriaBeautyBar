/**
 * Demo/verify за онлайн-toggle: задава телефон на Снежана + 1 нейна услуга онлайн-OFF.
 * `--restore` връща онлайн ON. Пускане: npx tsx --env-file=.env.local scripts/demo-online-toggle.ts [--restore]
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const RESTORE = process.argv.includes("--restore");

async function main() {
  const snezhana = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.name, "Снежана") });
  if (!snezhana) { console.error("няма Снежана"); process.exit(1); }
  const offer = await db.query.resourceServices.findFirst({ where: (o, { and, eq }) => and(eq(o.resourceId, snezhana.id), eq(o.active, true)) });
  const item = offer ? await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, offer.serviceItemId) }) : undefined;
  if (!offer || !item) { console.error("Снежана няма активна оферта"); process.exit(1); }

  if (RESTORE) {
    await db.update(schema.resourceServices).set({ onlineBookable: true }).where(eq(schema.resourceServices.id, offer.id));
    console.log(`✅ Restore: „${item.name}" онлайн запис ВКЛЮЧЕН`);
  } else {
    await db.update(schema.resources).set({ phone: "0898 663 315" }).where(eq(schema.resources.id, snezhana.id));
    await db.update(schema.resourceServices).set({ onlineBookable: false }).where(eq(schema.resourceServices.id, offer.id));
    console.log(`✅ Demo: Снежана телефон 0898 663 315, „${item.name}" онлайн запис ИЗКЛЮЧЕН`);
  }
  console.log(`Услуга: „${item.name}" · изпълнител: ${snezhana.name}`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
