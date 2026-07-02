import { inArray, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";

/**
 * Нормализира български телефон към каноничен вид (+359…) + връща вероятните
 * съхранени варианти за дедуп. Спира дублите „+359898663315" vs „0898663315" vs
 * „0898 66 33 15", които при точно съвпадение на стринга създаваха отделни клиенти.
 */
export function normalizeBgPhone(raw: string): { canonical: string; variants: string[] } {
  const compact = raw.replace(/[\s()-]/g, ""); // махни интервали/тирета/скоби
  let national = compact.replace(/^\+/, "");
  if (national.startsWith("359")) national = national.slice(3);
  else if (national.startsWith("0")) national = national.slice(1);
  const canonical = national ? `+359${national}` : compact;
  // Вариантите, в които номерът може вече да е записан (без интервали).
  const variants = [...new Set([canonical, `0${national}`, national, compact, raw.trim()].filter(Boolean))];
  return { canonical, variants };
}

/** Връща clientId по телефон: има клиент с този номер (в който и да е формат) →
 * неговия id (обновява името ако е различно); иначе създава нов с каноничен телефон.
 * Празен телефон → null. */
export async function upsertClientByPhone(name: string | undefined, phone: string | undefined): Promise<string | null> {
  const tel = (phone ?? "").trim();
  if (tel.length < 5) return null;
  const nm = (name ?? "").trim() || "Клиент";
  const { canonical, variants } = normalizeBgPhone(tel);

  const existing = await db.query.clients.findFirst({ where: (c) => inArray(c.phone, variants) });
  if (existing) {
    if (nm !== existing.name) await db.update(schema.clients).set({ name: nm }).where(eq(schema.clients.id, existing.id));
    return existing.id;
  }
  const id = nanoid();
  // Записваме каноничния вид → бъдещият дедуп е стабилен независимо от въведения формат.
  await db.insert(schema.clients).values({ id, name: nm, phone: canonical, createdAt: new Date() });
  return id;
}
