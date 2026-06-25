/** Read-only: разбивка на валутите — кои serviceItems/resourceServices са в лв (трябва €). */
import { db } from "../src/lib/db";

async function main() {
  const cats = await db.query.serviceCategories.findMany();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const items = await db.query.serviceItems.findMany();
  const offers = await db.query.resourceServices.findMany();

  const tally = (rows: { currency: string }[]) => {
    const t: Record<string, number> = {};
    for (const r of rows) t[r.currency] = (t[r.currency] ?? 0) + 1;
    return t;
  };
  console.log("serviceItems по валута:", tally(items));
  console.log("resourceServices по валута:", tally(offers));

  const lvItems = items.filter((i) => i.currency !== "€");
  console.log(`\n=== Не-€ serviceItems (${lvItems.length}) ===`);
  for (const i of lvItems) {
    console.log(`  [${catById.get(i.categoryId)?.shortTitle ?? "?"}] ${i.name}: ${i.price}${i.currency} · bookable=${i.bookableOnline}`);
  }

  const lvOffers = offers.filter((o) => o.currency !== "€");
  console.log(`\n=== Не-€ resourceServices (${lvOffers.length}) ===`);
  const itemName = new Map(items.map((i) => [i.id, i.name]));
  for (const o of lvOffers) {
    console.log(`  ${itemName.get(o.serviceItemId) ?? o.serviceItemId}: ${o.price}${o.currency} (active=${o.active})`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
