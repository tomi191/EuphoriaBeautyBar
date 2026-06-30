/* eslint-disable no-console */
/**
 * Добавя единствения негативен Google отзив (1★) като „manual-" запис — за пълна
 * прозрачност. Featurable го филтрира (показва само 4-5★), а sync трие всичко
 * non-manual, затова го пазим ръчно. Idempotent: махва предишен MrPetrov75 и вмъква.
 *
 * npx tsx --env-file=.env.local scripts/seed-negative-review.ts
 */
import { and, eq, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../src/lib/db";

async function main() {
  // Махни предишен ръчен MrPetrov75 (idempotent).
  const existing = await db.query.googleReviews.findMany({
    where: (r, { and: a, like: l, eq: e }) => a(l(r.id, "manual-%"), e(r.authorName, "MrPetrov75")),
  });
  for (const r of existing) await db.delete(schema.googleReviews).where(eq(schema.googleReviews.id, r.id));

  await db.insert(schema.googleReviews).values({
    id: `manual-${nanoid()}`,
    authorName: "MrPetrov75",
    authorPhoto: "https://lh3.googleusercontent.com/a/ACg8ocJBZsWRyN2J9mz16aUpEFvM62oAC0-cmxVXQtUza0Cm37mAKQ=s64-c-rp-mo-ba12-br100",
    rating: 1,
    text: "Снежи, хубаво би било да измислиш друго име на салона! Не е добре да се копира!",
    language: "bg",
    publishedAt: new Date("2024-06-15T12:00:00Z"),
    fetchedAt: new Date(),
  });

  const all = await db.query.googleReviews.findMany();
  console.log(`✓ Негативният добавен като manual-. Общо в базата: ${all.length} отзива.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
