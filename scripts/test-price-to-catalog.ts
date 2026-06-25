/**
 * Verify: смяна на цена от изпълнител → веднага в публичния ценоразпис (/uslugi).
 * Показва и какво става при изключване (за дизайн решението онлайн-toggle).
 * Пускане: npx tsx --env-file=.env.local scripts/test-price-to-catalog.ts
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { getServiceCatalog } from "../src/lib/data/service-catalog";

function priceInCatalog(cats: Awaited<ReturnType<typeof getServiceCatalog>>, name: string): string {
  for (const c of cats) for (const g of c.groups) for (const i of g.items)
    if (i.name === name) return `${i.priceFrom ? "от " : ""}${i.price}${i.currency}`;
  return "НЕ Е В ЦЕНОРАЗПИСА";
}

async function main() {
  const snezhana = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.name, "Снежана") });
  const offer = await db.query.resourceServices.findFirst({ where: (o, { and, eq }) => and(eq(o.resourceId, snezhana!.id), eq(o.active, true)) });
  const item = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, offer!.serviceItemId) });
  const orig = offer!.price;
  console.log(`Тест услуга (Снежана): „${item!.name}", текуща цена ${orig}€\n`);

  try {
    await db.update(schema.resourceServices).set({ price: 88 }).where(eq(schema.resourceServices.id, offer!.id));
    console.log(`1. Изпълнител сменя цена на 88€ → в ценоразписа: ${priceInCatalog(await getServiceCatalog(), item!.name)}`);

    await db.update(schema.resourceServices).set({ active: false }).where(eq(schema.resourceServices.id, offer!.id));
    console.log(`2. Изпълнител ИЗКЛЮЧВА услугата → в ценоразписа: ${priceInCatalog(await getServiceCatalog(), item!.name)}`);

    const saved = await db.query.resourceServices.findFirst({ where: (o, { eq }) => eq(o.id, offer!.id) });
    console.log(`   Оферта в DB: ${saved?.price}€ active=${saved?.active} — ${saved?.price === 88 ? "цената ЗАПАЗЕНА ✓" : "загубена ✗"}`);
    console.log(`\n→ Извод: смяна на цена влиза в ценоразписа веднага. При изключване услугата ИЗЧЕЗВА от ценоразписа (active filter), но цената е запазена в DB. За да остане видима с телефон — нужен е онлайн-toggle (нова фича).`);
  } finally {
    await db.update(schema.resourceServices).set({ price: orig, active: true }).where(eq(schema.resourceServices.id, offer!.id));
    console.log(`(restore → ${orig}€)`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
