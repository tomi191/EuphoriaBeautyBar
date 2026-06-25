/**
 * Идемпотентно създава цветните услуги в 3 варианта по дължина (къса/средна/дълга)
 * с research-base активно/престой времена (spec §3). Цените са ПРЕДЛОЖЕНИЯ — собственикът
 * ги коригира в админ панела. НЕ изтрива стари услуги; маркира ги bookableOnline=false,
 * за да не дублират (ръчно изтриване след преглед).
 *
 * Пускане: npx tsx --env-file=.env.local scripts/seed-length-services.ts
 */
import { nanoid } from "nanoid";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

type Variant = { len: "къса" | "средна" | "дълга"; active: number; processing: number; finish: number; price: number };
type ColorService = { match: RegExp; baseName: string; groupTitle: string; categorySlug: string; variants: Variant[] };

// durationMin = active + processing + finish. Цените са стартови (€) — собственикът ги сменя.
const SERVICES: ColorService[] = [
  { match: /^боядисване$/i, baseName: "Боядисване", groupTitle: "Боядисване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 15, processing: 40, finish: 15, price: 23 },
    { len: "средна", active: 25, processing: 40, finish: 20, price: 28 },
    { len: "дълга", active: 40, processing: 40, finish: 25, price: 36 },
  ]},
  { match: /^балаяж$/i, baseName: "Балаяж", groupTitle: "Изсветляване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 50, processing: 40, finish: 30, price: 61 },
    { len: "средна", active: 70, processing: 45, finish: 35, price: 77 },
    { len: "дълга", active: 90, processing: 45, finish: 45, price: 97 },
  ]},
  { match: /кичури/i, baseName: "Кичури на фолио", groupTitle: "Изсветляване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 30, processing: 40, finish: 15, price: 36 },
    { len: "средна", active: 45, processing: 40, finish: 20, price: 46 },
    { len: "дълга", active: 60, processing: 40, finish: 25, price: 61 },
  ]},
  { match: /корекция/i, baseName: "Корекция на цветовете", groupTitle: "Боядисване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 40, processing: 45, finish: 20, price: 46 },
    { len: "средна", active: 55, processing: 45, finish: 25, price: 61 },
    { len: "дълга", active: 75, processing: 45, finish: 30, price: 77 },
  ]},
];

async function main() {
  const cats = await db.query.serviceCategories.findMany();
  const items = await db.query.serviceItems.findMany();

  for (const svc of SERVICES) {
    const cat = cats.find((c) => c.slug === svc.categorySlug);
    if (!cat) { console.warn(`⚠ категория ${svc.categorySlug} липсва — пропускам ${svc.baseName}`); continue; }

    // Старите единични варианти (без „(… коса)" в името) — за наследяване на изпълнители.
    const oldItems = items.filter((i) => svc.match.test(i.name) && !/коса\)/i.test(i.name) && i.categoryId === cat.id);
    const oldIds = oldItems.map((i) => i.id);

    // Кои изпълнители предлагат старите единични → наследяват вариантите.
    const oldRS = oldIds.length
      ? await db.query.resourceServices.findMany({ where: (r) => inArray(r.serviceItemId, oldIds) })
      : [];
    const performers = [...new Set(oldRS.map((r) => r.resourceId))];
    console.log(`\n${svc.baseName}: ${oldItems.length} стари, изпълнители: ${performers.length || "(няма оферти)"}`);

    // Изключи старите единични от онлайн (non-destructive — само флаг; staff/публично
    // ги филтрират по bookableOnline). Старите оферти остават, но не се показват.
    for (const old of oldItems) {
      await db.update(schema.serviceItems).set({ bookableOnline: false }).where(eq(schema.serviceItems.id, old.id));
    }

    let order = 0;
    for (const v of svc.variants) {
      const name = `${svc.baseName} (${v.len} коса)`;
      const durationMin = v.active + v.processing + v.finish;
      const existing = items.find((i) => i.name === name && i.categoryId === cat.id);
      const values = {
        categoryId: cat.id, groupTitle: svc.groupTitle, name,
        price: v.price, priceFrom: true, currency: "€",
        durationMin, bufferMin: 15, activeMin: v.active, processingMin: v.processing,
        bookableOnline: true, sortOrder: order++,
      };
      let itemId: string;
      if (existing) {
        itemId = existing.id;
        await db.update(schema.serviceItems).set(values).where(eq(schema.serviceItems.id, itemId));
        console.log(`  ✓ ъпдейт „${name}" (${durationMin}мин, престой ${v.processing})`);
      } else {
        itemId = nanoid();
        await db.insert(schema.serviceItems).values({ id: itemId, ...values });
        console.log(`  + нова „${name}" (${durationMin}мин, престой ${v.processing})`);
      }

      // Дай оферта на всеки наследен изпълнител (за да се вижда в staff + публично).
      for (const perf of performers) {
        const has = await db.query.resourceServices.findFirst({
          where: (r, { and, eq: e }) => and(e(r.resourceId, perf), e(r.serviceItemId, itemId)),
        });
        if (!has) {
          await db.insert(schema.resourceServices).values({
            id: nanoid(), resourceId: perf, serviceItemId: itemId,
            price: v.price, priceFrom: true, currency: "€",
            durationMin, bufferMin: 15, active: true,
          });
          console.log(`     + оферта за ${perf}`);
        }
      }
    }
  }

  // Self-heal: деактивирай orphan оферти (resource_services сочещи към услуги, които
  // току-що скрихме), за да не „предлага" изпълнител скрита услуга → не се вижда онлайн.
  const freshItems = await db.query.serviceItems.findMany();
  const hiddenIds = new Set(freshItems.filter((i) => !i.bookableOnline).map((i) => i.id));
  const activeOffers = await db.query.resourceServices.findMany({ where: (o, { eq }) => eq(o.active, true) });
  let deactivated = 0;
  for (const o of activeOffers) {
    if (hiddenIds.has(o.serviceItemId)) {
      await db.update(schema.resourceServices).set({ active: false }).where(eq(schema.resourceServices.id, o.id));
      deactivated++;
    }
  }
  if (deactivated) console.log(`  ↪ деактивирани ${deactivated} orphan оферти (към скрити услуги)`);

  console.log("\n✅ Готово. Прегледай цените в админ панела.");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
