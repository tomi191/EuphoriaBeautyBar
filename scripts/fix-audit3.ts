/* eslint-disable no-console */
// One-off след одит №3 (10.06.2026): маха дублиращия ред „Терапии за коса“ от
// категория „Фризьорски услуги“ (истинските терапии живеят в frizorski-terapii
// със собствени цени) и синхронизира категорийните текстове с data/services.ts.
import "./load-env";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

async function main() {
  const cat = await db.query.serviceCategories.findFirst({
    where: (c, { eq }) => eq(c.slug, "frizorski-uslugi"),
  });
  if (!cat) throw new Error("Категория frizorski-uslugi липсва в DB");

  const item = await db.query.serviceItems.findFirst({
    where: (s, { and, eq }) => and(eq(s.categoryId, cat.id), eq(s.name, "Терапии за коса")),
  });

  if (!item) {
    console.log("✓ Дублиращият ред „Терапии за коса“ вече липсва в DB");
  } else {
    const offers = await db.query.resourceServices.findMany({
      where: (rs, { eq }) => eq(rs.serviceItemId, item.id),
    });
    if (offers.length > 0) {
      // Изтриването би каскадирало в нечий ценоразпис — оставяме на админ.
      console.log(`⚠ ${offers.length} изпълнител(и) предлагат този ред (${item.id}) — НЕ изтривам. Реши през /admin/services.`);
    } else {
      await db.delete(schema.serviceItems).where(eq(schema.serviceItems.id, item.id));
      console.log(`✓ Изтрит дублиращ ред „Терапии за коса“ (${item.id}) от „Боядисване и кичури“`);
    }
  }

  await db
    .update(schema.serviceCategories)
    .set({ tagline: "Форма и цвят, които издържат седмици", updatedAt: new Date() })
    .where(eq(schema.serviceCategories.slug, "manikyur-i-pedikyur"));
  console.log("✓ Обновен tagline на „Маникюр и Педикюр“");

  await db
    .update(schema.serviceCategories)
    .set({
      longDescription:
        "Козметичният кабинет работи с GIGI, Esthemax, Montibello и SAN MARINE. Протоколът се избира според типа кожа, възрастта и желания резултат — от почистване и хидратация до anti-age процедури.",
      updatedAt: new Date(),
    })
    .where(eq(schema.serviceCategories.slug, "kozmetika"));
  console.log("✓ Обновен longDescription на „Козметика“");

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
