"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

const profileSchema = z.object({
  name: z.string().min(2),
  image: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

/** Работникът обновява собствения си профил — име, снимка, кратко описание, телефон. */
export async function updateStaffProfile(input: z.infer<typeof profileSchema>) {
  const { session, resource } = await requireStaff();
  const d = profileSchema.parse(input);
  const phone = d.phone?.trim() || null;
  if (phone && !/^[+\d][\d\s()-]{5,}$/.test(phone)) {
    return { ok: false as const, error: "Невалиден телефон. Пример: 0898 123 456." };
  }
  // Услуги без онлайн запис показват този телефон на клиента („обади се") —
  // без него клиентът няма как да запази час за тях.
  if (!phone) {
    const offline = await db.query.resourceServices.findFirst({
      where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.onlineBookable, false)),
      columns: { id: true },
    });
    if (offline) {
      return {
        ok: false as const,
        error: "Телефонът е нужен: имаш услуги без онлайн запис, при които клиентите го виждат, за да се обадят.",
      };
    }
  }
  const now = new Date();
  await db.update(schema.user).set({ name: d.name, updatedAt: now }).where(eq(schema.user.id, session.user.id));
  await db
    .update(schema.resources)
    .set({ name: d.name, image: d.image?.trim() || null, bio: d.bio?.trim() || null, phone, updatedAt: now })
    .where(eq(schema.resources.id, resource.id));
  revalidatePath("/staff/profile");
  revalidatePath("/staff");
  revalidatePath("/zapazi-chas");
  return { ok: true as const };
}
