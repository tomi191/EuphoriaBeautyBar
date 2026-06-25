/** Връща всички онлайн-OFF оферти на ON (таргетирано по id). Чисти demo състояние. */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

async function main() {
  const offers = await db.query.resourceServices.findMany();
  const offline = offers.filter((o) => !o.onlineBookable);
  console.log(`Онлайн-OFF оферти: ${offline.length}`);
  for (const o of offline) {
    await db.update(schema.resourceServices).set({ onlineBookable: true }).where(eq(schema.resourceServices.id, o.id));
    console.log(`  → ${o.id} онлайн ON`);
  }
  console.log("✅ Чисто състояние — всички оферти онлайн ON.");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
