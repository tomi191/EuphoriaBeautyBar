/* eslint-disable no-console */
// Стъпка 2 след fix-audit3: дублиращият ред „Терапии за коса“ в категория
// „Фризьорски услуги“ се предлага от изпълнител (seed-ът е вързал всички
// фризьорски редове към Снежана). Редът е дубликат на цялата категория
// frizorski-terapii → чистим и offer-а, и каталожния ред. Минали резервации
// пазят името си (bookings.service_item_id е ON DELETE SET NULL).
import "./load-env";
import { eq, gte, and } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

async function main() {
  const cat = await db.query.serviceCategories.findFirst({
    where: (c, { eq }) => eq(c.slug, "frizorski-uslugi"),
  });
  if (!cat) throw new Error("Категория frizorski-uslugi липсва");

  const item = await db.query.serviceItems.findFirst({
    where: (s, { and, eq }) => and(eq(s.categoryId, cat.id), eq(s.name, "Терапии за коса")),
  });
  if (!item) {
    console.log("✓ Редът вече е изтрит — нищо за правене.");
    process.exit(0);
  }

  const offers = await db.query.resourceServices.findMany({
    where: (rs, { eq }) => eq(rs.serviceItemId, item.id),
  });
  for (const o of offers) {
    const res = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, o.resourceId) });
    console.log(`• Предлага се от: ${res?.name ?? o.resourceId} (offer ${o.id})`);
  }

  const futureBookings = await db.query.bookings.findMany({
    where: and(eq(schema.bookings.serviceItemId, item.id), gte(schema.bookings.startAt, new Date())),
    columns: { id: true, startAt: true, serviceName: true },
  });
  if (futureBookings.length > 0) {
    console.log(`⚠ ${futureBookings.length} ПРЕДСТОЯЩИ резервации сочат този ред — СПИРАМ без промени:`);
    for (const b of futureBookings) console.log(`  - ${b.startAt.toISOString()} ${b.serviceName}`);
    process.exit(1);
  }

  await db.delete(schema.resourceServices).where(eq(schema.resourceServices.serviceItemId, item.id));
  await db.delete(schema.serviceItems).where(eq(schema.serviceItems.id, item.id));
  console.log(`✓ Изтрити ${offers.length} offer(а) + каталожният ред „Терапии за коса“ (${item.id}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
