/**
 * Read-only диагностика: за всеки изпълнител — кои услуги е отметнал (resource_services)
 * vs кои реално се показват онлайн в /zapazi-chas. Открива защо отметнати услуги не
 * се виждат (bookableOnline=false, липсва performer за kind, грешен kind и т.н.).
 * Пускане: npx tsx --env-file=.env.local scripts/check-offerings.ts
 */
import { db } from "../src/lib/db";
import { KIND_BY_SLUG } from "../src/lib/booking/kind";

async function main() {
  const [resources, offerings, items, cats] = await Promise.all([
    db.query.resources.findMany(),
    db.query.resourceServices.findMany(),
    db.query.serviceItems.findMany(),
    db.query.serviceCategories.findMany(),
  ]);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const catById = new Map(cats.map((c) => [c.id, c]));

  // Kinds с активен performer (както zapazi-chas ги смята).
  const kindsWithPerformer = new Set(resources.filter((r) => r.active).map((r) => r.kind));
  console.log(`Kinds с активен performer (онлайн): [${[...kindsWithPerformer].join(", ")}]\n`);

  for (const r of resources) {
    const mine = offerings.filter((o) => o.resourceId === r.id);
    console.log(`\n=== ${r.name} (kind=${r.kind}, active=${r.active}) — ${mine.length} отметнати услуги ===`);
    let hiddenOffline = 0, hiddenInactive = 0, hiddenKind = 0, shown = 0;
    for (const o of mine) {
      const item = itemById.get(o.serviceItemId);
      if (!item) { console.log(`  ⚠ оферта към липсваща услуга ${o.serviceItemId}`); continue; }
      const cat = catById.get(item.categoryId);
      const itemKind = cat ? KIND_BY_SLUG[cat.slug] : undefined;
      const reasons: string[] = [];
      if (!o.active) reasons.push("оферта active=false");
      if (!item.bookableOnline) reasons.push("услуга bookableOnline=false");
      if (!itemKind || !kindsWithPerformer.has(itemKind)) reasons.push(`kind ${itemKind} няма активен performer`);
      if (itemKind !== r.kind) reasons.push(`услугата е kind=${itemKind}, а изпълнителят е kind=${r.kind}`);
      if (reasons.length) {
        if (!o.active) hiddenInactive++;
        else if (!item.bookableOnline) hiddenOffline++;
        else hiddenKind++;
        console.log(`  ❌ „${item.name}" — НЕ се вижда: ${reasons.join("; ")}`);
      } else {
        shown++;
      }
    }
    console.log(`  → ${shown} видими онлайн · ${hiddenOffline} скрити (bookableOnline=false) · ${hiddenInactive} (оферта неактивна) · ${hiddenKind} (kind проблем)`);
  }
  console.log("");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
