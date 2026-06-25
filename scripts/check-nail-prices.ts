/** Read-only: цените на маникюр/педикюр — каталожни (serviceItems) vs офертите на Дани (resource_services). */
import { db } from "../src/lib/db";

async function main() {
  const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "manikyur-i-pedikyur") });
  if (!cat) { console.error("няма категория"); process.exit(1); }
  const items = await db.query.serviceItems.findMany({ where: (s, { and, eq }) => and(eq(s.categoryId, cat.id), eq(s.bookableOnline, true)) });
  const dani = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.name, "Дани") });
  const offers = dani ? await db.query.resourceServices.findMany({ where: (o, { eq }) => eq(o.resourceId, dani.id) }) : [];
  const offerByItem = new Map(offers.map((o) => [o.serviceItemId, o]));

  console.log(`Дани: active=${dani?.active}, ${offers.length} оферти\n`);
  console.log("Услуга | каталожна | оферта на Дани | updated (оферта)");
  for (const i of items.sort((a, b) => a.sortOrder - b.sortOrder)) {
    const o = offerByItem.get(i.id);
    const diff = o && o.price !== i.price ? "  ⬅ РАЗЛИЧНА" : "";
    console.log(`  ${i.name}: каталог ${i.price}${i.currency} | оферта ${o ? `${o.price}${o.currency} (${o.active ? "active" : "inactive"})` : "—"} | ${o?.updatedAt?.toISOString() ?? "—"}${diff}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
