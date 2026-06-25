/**
 * Bugfix: деактивира „orphan" оферти — resource_services сочещи към услуги, които
 * са скрити (bookableOnline=false). Когато услуга се замени/скрие, офертите за нея
 * трябва да станат неактивни, иначе изпълнителят „предлага" скрита услуга и тя не
 * се вижда онлайн (объркване). Non-destructive (active=false, не трие).
 * Пускане: npx tsx --env-file=.env.local scripts/fix-orphan-offerings.ts
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

async function main() {
  const items = await db.query.serviceItems.findMany();
  const hidden = new Set(items.filter((i) => !i.bookableOnline).map((i) => i.id));
  const itemName = new Map(items.map((i) => [i.id, i.name]));

  const offerings = await db.query.resourceServices.findMany({ where: (o, { eq }) => eq(o.active, true) });
  const orphans = offerings.filter((o) => hidden.has(o.serviceItemId));

  if (!orphans.length) {
    console.log("✅ Няма orphan оферти — всичко е чисто.");
    process.exit(0);
  }
  for (const o of orphans) {
    await db.update(schema.resourceServices).set({ active: false }).where(eq(schema.resourceServices.id, o.id));
    console.log(`  ↪ деактивирана оферта за скрита услуга „${itemName.get(o.serviceItemId)}" (resource ${o.resourceId})`);
  }
  console.log(`\n✅ Деактивирани ${orphans.length} orphan оферти. Отметките на изпълнителите вече сочат само видими услуги.`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
