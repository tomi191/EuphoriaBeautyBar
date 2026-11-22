import { APIError } from "better-auth/api";
import { db } from "@/lib/db";

/** Кодът, по който входът разпознава отказа и показва съобщението за спрян достъп. */
export const STAFF_INACTIVE = "STAFF_INACTIVE";

/**
 * Изключен изпълнител не получава нова сесия (вход с парола или с passkey): без това
 * всеки опит пишеше ред в `session`, а requireStaff го връщаше обратно на входа.
 * Отказът идва след проверката на паролата, затова не издава дали имейлът съществува.
 * Админ никога не се спира (и Снежана да е изключена като изпълнител, влиза в /admin).
 */
export async function blockInactiveStaffSession(userId: string): Promise<void> {
  const resource = await db.query.resources.findFirst({
    where: (r, { eq }) => eq(r.userId, userId),
    columns: { active: true },
  });
  if (!resource || resource.active) return;
  const u = await db.query.user.findFirst({ where: (x, { eq }) => eq(x.id, userId), columns: { role: true } });
  if (u?.role === "admin") return;
  throw new APIError("FORBIDDEN", { message: "Достъпът до приложението е спрян. Обади се в салона.", code: STAFF_INACTIVE });
}
