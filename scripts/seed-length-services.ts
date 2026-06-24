/**
 * Идемпотентно създава цветните услуги в 3 варианта по дължина (къса/средна/дълга)
 * с research-base активно/престой времена (spec §3). Цените са ПРЕДЛОЖЕНИЯ — собственикът
 * ги коригира в админ панела. НЕ изтрива стари услуги; маркира ги bookableOnline=false,
 * за да не дублират (ръчно изтриване след преглед).
 *
 * Пускане: npx tsx --env-file=.env.local scripts/seed-length-services.ts
 */
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

type Variant = { len: "къса" | "средна" | "дълга"; active: number; processing: number; finish: number; price: number };
type ColorService = { match: RegExp; baseName: string; groupTitle: string; categorySlug: string; variants: Variant[] };

// durationMin = active + processing + finish. Цените са стартови (лв) — собственикът ги сменя.
const SERVICES: ColorService[] = [
  { match: /^боядисване$/i, baseName: "Боядисване", groupTitle: "Боядисване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 15, processing: 40, finish: 15, price: 45 },
    { len: "средна", active: 25, processing: 40, finish: 20, price: 55 },
    { len: "дълга", active: 40, processing: 40, finish: 25, price: 70 },
  ]},
  { match: /^балаяж$/i, baseName: "Балаяж", groupTitle: "Изсветляване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 50, processing: 40, finish: 30, price: 120 },
    { len: "средна", active: 70, processing: 45, finish: 35, price: 150 },
    { len: "дълга", active: 90, processing: 45, finish: 45, price: 190 },
  ]},
  { match: /кичури/i, baseName: "Кичури на фолио", groupTitle: "Изсветляване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 30, processing: 40, finish: 15, price: 70 },
    { len: "средна", active: 45, processing: 40, finish: 20, price: 90 },
    { len: "дълга", active: 60, processing: 40, finish: 25, price: 120 },
  ]},
  { match: /корекция/i, baseName: "Корекция на цветовете", groupTitle: "Боядисване", categorySlug: "frizorski-uslugi", variants: [
    { len: "къса", active: 40, processing: 45, finish: 20, price: 90 },
    { len: "средна", active: 55, processing: 45, finish: 25, price: 120 },
    { len: "дълга", active: 75, processing: 45, finish: 30, price: 150 },
  ]},
];

async function main() {
  const cats = await db.query.serviceCategories.findMany();
  const items = await db.query.serviceItems.findMany();

  for (const svc of SERVICES) {
    const cat = cats.find((c) => c.slug === svc.categorySlug);
    if (!cat) { console.warn(`⚠ категория ${svc.categorySlug} липсва — пропускам ${svc.baseName}`); continue; }

    // Изключи старите единични варианти от онлайн (не трий — ръчен преглед).
    for (const old of items.filter((i) => svc.match.test(i.name) && i.categoryId === cat.id)) {
      await db.update(schema.serviceItems).set({ bookableOnline: false }).where(eq(schema.serviceItems.id, old.id));
      console.log(`  ↪ старо „${old.name}" → bookableOnline=false`);
    }

    let order = 0;
    for (const v of svc.variants) {
      const name = `${svc.baseName} (${v.len} коса)`;
      const existing = items.find((i) => i.name === name && i.categoryId === cat.id);
      const values = {
        categoryId: cat.id,
        groupTitle: svc.groupTitle,
        name,
        price: v.price,
        priceFrom: true,
        currency: "лв",
        durationMin: v.active + v.processing + v.finish,
        bufferMin: 15,
        activeMin: v.active,
        processingMin: v.processing,
        bookableOnline: true,
        sortOrder: order++,
      };
      if (existing) {
        await db.update(schema.serviceItems).set(values).where(eq(schema.serviceItems.id, existing.id));
        console.log(`  ✓ ъпдейт „${name}" (${values.durationMin}мин, престой ${v.processing})`);
      } else {
        await db.insert(schema.serviceItems).values({ id: nanoid(), ...values });
        console.log(`  + нова „${name}" (${values.durationMin}мин, престой ${v.processing})`);
      }
    }
  }
  console.log("\n✅ Готово. Прегледай цените в админ панела и изтрий старите единични услуги ръчно.");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
