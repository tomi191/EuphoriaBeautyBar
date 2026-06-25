/**
 * Конвертира всички цени от лв в € (главна валута на България) по фиксирания курс
 * 1 € = 1.95583 лв. Покрива serviceItems + resourceServices. Закръгля до цяло €.
 * Idempotent: вече-€ редове се прескачат.
 * Пускане: npx tsx --env-file=.env.local scripts/convert-lv-to-eur.ts
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const RATE = 1.95583;
const toEur = (lv: number) => Math.round(lv / RATE);

async function main() {
  const items = await db.query.serviceItems.findMany();
  const lvItems = items.filter((i) => i.currency !== "€");
  console.log(`=== serviceItems (${lvItems.length} в лв) ===`);
  for (const i of lvItems) {
    const price = toEur(i.price);
    const priceMax = i.priceMax ? toEur(i.priceMax) : null;
    await db.update(schema.serviceItems).set({ price, priceMax, currency: "€" }).where(eq(schema.serviceItems.id, i.id));
    console.log(`  ${i.name}: ${i.price}лв → ${price}€`);
  }

  const offers = await db.query.resourceServices.findMany();
  const lvOffers = offers.filter((o) => o.currency !== "€");
  const itemName = new Map(items.map((i) => [i.id, i.name]));
  console.log(`\n=== resourceServices (${lvOffers.length} в лв) ===`);
  for (const o of lvOffers) {
    const price = toEur(o.price);
    const priceMax = o.priceMax ? toEur(o.priceMax) : null;
    await db.update(schema.resourceServices).set({ price, priceMax, currency: "€" }).where(eq(schema.resourceServices.id, o.id));
    console.log(`  ${itemName.get(o.serviceItemId) ?? o.serviceItemId}: ${o.price}лв → ${price}€`);
  }

  console.log(`\n✅ Конвертирани ${lvItems.length} услуги + ${lvOffers.length} оферти лв → €. (placeholder — Снежана може да зададе финални € цени в admin)`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
