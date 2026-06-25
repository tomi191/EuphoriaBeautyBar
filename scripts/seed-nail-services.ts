/**
 * Привежда маникюр/педикюр услугите към ценоразписа (docs/cenorazpis/cenorazpis manikur.jpg).
 * Скрива старите (bookableOnline=false, не трие), добавя точно ценоразписа (EUR).
 * Идемпотентно. НЕ се пуска от агента (production DB).
 *
 * Пускане: npx tsx --env-file=.env.local scripts/seed-nail-services.ts
 */
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const CATEGORY_SLUG = "manikyur-i-pedikyur";

// Цени в EUR (ценоразпис). durationMin — разумна преценка (ценоразписът не дава време).
const SERVICES: { group: "Маникюр" | "Педикюр"; name: string; price: number; durationMin: number; description?: string }[] = [
  // МАНИКЮР
  { group: "Маникюр", name: "Маникюр с гел лак", price: 25, durationMin: 75 },
  { group: "Маникюр", name: "Маникюр с обикновен лак", price: 20, durationMin: 60 },
  { group: "Маникюр", name: "Маникюр без лак", price: 15, durationMin: 45 },
  { group: "Маникюр", name: "Терапия за нокти с Magnetic", price: 15, durationMin: 30 },
  { group: "Маникюр", name: "Маникюр + терапия за нокти", price: 20, durationMin: 75 },
  { group: "Маникюр", name: "Подхранваща терапия за ръце", price: 15, durationMin: 45 },
  // ПЕДИКЮР
  { group: "Педикюр", name: "Педикюр с гел лак", price: 30, durationMin: 75 },
  { group: "Педикюр", name: "Педикюр с обикновен лак", price: 25, durationMin: 60 },
  { group: "Педикюр", name: "Педикюр без лак", price: 20, durationMin: 60 },
  { group: "Педикюр", name: "Медицински педикюр", price: 35, durationMin: 75 },
  { group: "Педикюр", name: "Обработка на нокти", price: 20, durationMin: 60, description: "Онихолиза, онихомикоза, онихогрифоза, онихокриптоза" },
  { group: "Педикюр", name: "Корективна система за впити нокти Unibrace", price: 40, durationMin: 90 },
];

async function main() {
  const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, CATEGORY_SLUG) });
  if (!cat) { console.error(`✗ категория ${CATEGORY_SLUG} липсва`); process.exit(1); }

  const items = await db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.categoryId, cat.id) });

  // Скрий старите маникюр/педикюр услуги (които НЕ са в новия ценоразпис) от онлайн.
  const newNames = new Set(SERVICES.map((s) => s.name));
  for (const old of items) {
    if (!newNames.has(old.name) && (old.groupTitle === "Маникюр" || old.groupTitle === "Педикюр")) {
      await db.update(schema.serviceItems).set({ bookableOnline: false }).where(eq(schema.serviceItems.id, old.id));
      console.log(`  ↪ скрита стара „${old.name}"`);
    }
  }

  // Добави/обнови ценоразпис услугите.
  let order = 100; // след съществуващите
  for (const svc of SERVICES) {
    const existing = items.find((i) => i.name === svc.name && i.categoryId === cat.id);
    const values = {
      categoryId: cat.id,
      groupTitle: svc.group,
      name: svc.name,
      price: svc.price,
      priceFrom: false,
      currency: "€",
      durationMin: svc.durationMin,
      bufferMin: 10,
      activeMin: 0,
      processingMin: 0,
      bookableOnline: true,
      description: svc.description ?? null,
      sortOrder: order++,
    };
    if (existing) {
      await db.update(schema.serviceItems).set(values).where(eq(schema.serviceItems.id, existing.id));
      console.log(`  ✓ ъпдейт „${svc.name}" — ${svc.price}€`);
    } else {
      await db.insert(schema.serviceItems).values({ id: nanoid(), ...values });
      console.log(`  + нова „${svc.name}" — ${svc.price}€`);
    }
  }
  console.log("\n✅ Маникюр/педикюр приведени към ценоразписа.");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
