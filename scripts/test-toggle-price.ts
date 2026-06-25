/**
 * Verify: изключване на услуга ПАЗИ въведената цена (не я връща към каталожната).
 * Симулира новата toggle логика (active=!active) върху оферта на Дани, после restore.
 * Пускане: npx tsx --env-file=.env.local scripts/test-toggle-price.ts
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

async function main() {
  const dani = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.name, "Дани") });
  if (!dani) { console.error("няма Дани"); process.exit(1); }
  const offer = await db.query.resourceServices.findFirst({ where: (o, { eq }) => eq(o.resourceId, dani.id) });
  if (!offer) { console.error("Дани няма оферти"); process.exit(1); }
  const orig = offer.price;
  const id = offer.id;
  console.log(`Тестова оферта (Дани): оригинална цена ${orig}€`);

  try {
    // 1. Изпълнителят задава своя цена (updateMyService).
    await db.update(schema.resourceServices).set({ price: 99 }).where(eq(schema.resourceServices.id, id));
    console.log("  → зададена custom цена 99€");

    // 2. Toggle OFF (нова логика: active=false, НЕ delete).
    await db.update(schema.resourceServices).set({ active: false }).where(eq(schema.resourceServices.id, id));
    const off = await db.query.resourceServices.findFirst({ where: (o, { eq }) => eq(o.id, id) });
    console.log(`  → toggle OFF: ред ${off ? "съществува" : "ИЗТРИТ ✗"}, цена ${off?.price}€, active=${off?.active}`);

    // 3. Toggle ON отново.
    await db.update(schema.resourceServices).set({ active: true }).where(eq(schema.resourceServices.id, id));
    const on = await db.query.resourceServices.findFirst({ where: (o, { eq }) => eq(o.id, id) });
    const ok = on?.price === 99;
    console.log(`  → toggle ON: цена ${on?.price}€ — ${ok ? "ЗАПАЗЕНА ✓" : "ЗАГУБЕНА ✗"}`);
    console.log(ok ? "\n✅ Toggle пази цената." : "\n❌ Toggle губи цената!");
  } finally {
    // Restore оригинала.
    await db.update(schema.resourceServices).set({ price: orig, active: true }).where(eq(schema.resourceServices.id, id));
    console.log(`(restore → ${orig}€, active=true)`);
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
