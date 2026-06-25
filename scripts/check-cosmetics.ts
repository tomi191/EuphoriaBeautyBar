/** Read-only: козметика цени (serviceItems) + офертите на козметичката (resource_services) + кога са пипани. */
import { db } from "../src/lib/db";

async function main() {
  const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "kozmetika") });
  if (!cat) { console.error("няма категория kozmetika"); process.exit(1); }

  const items = await db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.categoryId, cat.id) });
  console.log(`Козметика услуги: ${items.length}\n`);

  // Всички cosmetics изпълнители + техните оферти (active + inactive).
  const resources = await db.query.resources.findMany({ where: (r, { eq }) => eq(r.kind, "cosmetics") });
  for (const r of resources) {
    const offers = await db.query.resourceServices.findMany({ where: (o, { eq }) => eq(o.resourceId, r.id) });
    console.log(`\n=== ${r.name} (active=${r.active}, вход=${r.userId ? "ДА" : "НЯМА"}) — ${offers.length} оферти (active+inactive) ===`);
    const itemById = new Map(items.map((i) => [i.id, i]));
    for (const o of offers) {
      const it = itemById.get(o.serviceItemId);
      console.log(`  ${it?.name ?? o.serviceItemId}: оферта ${o.price}${o.currency} (${o.active ? "active" : "INACTIVE"}) · updated ${o.updatedAt?.toISOString()}`);
    }
    if (!offers.length) console.log("  (няма оферти)");
  }

  console.log(`\n=== Каталожни цени (serviceItems) ===`);
  for (const i of items.slice(0, 8)) {
    console.log(`  ${i.name}: ${i.price}${i.currency} · bookableOnline=${i.bookableOnline}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
