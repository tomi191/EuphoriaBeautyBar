import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/actions/auth-guard";
import { db } from "@/lib/db";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import { StaffBookingForm, type StaffServiceOpt } from "@/components/staff/staff-booking-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Нов час — Euphoria",
  robots: { index: false, follow: false },
};

export default async function StaffNewBookingPage() {
  const { resource } = await requireStaff();

  const [items, cats, mine] = await Promise.all([
    db.query.serviceItems.findMany({ orderBy: (s, { asc }) => [asc(s.sortOrder)] }),
    db.query.serviceCategories.findMany(),
    db.query.resourceServices.findMany({ where: (rs, { eq }) => eq(rs.resourceId, resource.id) }),
  ]);

  const catById = new Map(cats.map((c) => [c.id, c]));
  const curated = mine.length > 0;
  const mineByItem = new Map(mine.map((m) => [m.serviceItemId, m]));

  const services: StaffServiceOpt[] = items.flatMap((i) => {
    const cat = catById.get(i.categoryId);
    if (!cat || KIND_BY_SLUG[cat.slug] !== resource.kind) return [];
    if (curated && !mineByItem.has(i.id)) return [];
    const m = mineByItem.get(i.id);
    return [{ id: i.id, name: i.name, category: cat.shortTitle, durationMin: m?.durationMin ?? i.durationMin }];
  });

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur">
        <Link href="/staff" className="grid size-9 place-items-center rounded-md hover:bg-secondary" aria-label="Назад">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-medium">Нов час</h1>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <StaffBookingForm services={services} />
      </div>
    </div>
  );
}
