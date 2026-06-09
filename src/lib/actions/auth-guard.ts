import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/admin/login");
  }
  return session;
}

/**
 * Изисква логнат потребител, вързан към изпълнител (resource). Връща сесията +
 * неговия resource. Използва се от приложението за работниците (/staff).
 */
export async function requireStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/staff/login");
  }
  const resource = await db.query.resources.findFirst({
    where: (r, { eq }) => eq(r.userId, session.user.id),
  });
  if (!resource) {
    // Логнат, но няма вързан изпълнител — няма достъп до работническото приложение.
    redirect("/staff/login?no_resource=1");
  }
  return { session, resource };
}
