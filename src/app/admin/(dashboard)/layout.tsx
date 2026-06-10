import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

// Админът е зад auth и винаги чете live данни — никога не се prerender-ва на
// build (премахва DB зависимостта на билда за всички /admin страници).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  // role check: staff акаунтите имат сесия, но не бива да виждат admin таблото.
  if (!session?.user || session.user.role !== "admin") redirect("/admin/login");

  return (
    <AdminShell user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AdminShell>
  );
}
