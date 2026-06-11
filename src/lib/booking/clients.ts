import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";

/** Връща clientId по телефон: има клиент с този номер → неговия id (обновява името
 * ако е подадено различно); иначе създава нов. Празен телефон → null. */
export async function upsertClientByPhone(name: string | undefined, phone: string | undefined): Promise<string | null> {
  const tel = (phone ?? "").trim();
  if (tel.length < 5) return null;
  const nm = (name ?? "").trim() || "Клиент";
  const existing = await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.phone, tel) });
  if (existing) {
    if (nm !== existing.name) await db.update(schema.clients).set({ name: nm }).where(eq(schema.clients.id, existing.id));
    return existing.id;
  }
  const id = nanoid();
  await db.insert(schema.clients).values({ id, name: nm, phone: tel, createdAt: new Date() });
  return id;
}
