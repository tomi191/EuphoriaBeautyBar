import type { Metadata } from "next";
import { requireStaff } from "@/lib/actions/auth-guard";
import { db } from "@/lib/db";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import { StaffShell } from "@/components/staff/staff-shell";
import { MyServices, type MyServiceOpt, type MyCategoryOpt } from "@/components/staff/my-services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моите услуги — Euphoria",
  robots: { index: false, follow: false },
};

export default async function StaffServicesPage() {
  const { resource } = await requireStaff();

  const [cats, items, mine, allOffers] = await Promise.all([
    db.query.serviceCategories.findMany({ orderBy: (c, { asc }) => [asc(c.sortOrder)] }),
    db.query.serviceItems.findMany({ orderBy: (s, { asc }) => [asc(s.sortOrder)] }),
    db.query.resourceServices.findMany({ where: (rs, { eq }) => eq(rs.resourceId, resource.id) }),
    // Всички предлагания — за да знаем кои услуги се ползват от ДРУГ изпълнител (не може да се трият).
    db.query.resourceServices.findMany(),
  ]);

  const catById = new Map(cats.map((c) => [c.id, c]));
  const mineByItem = new Map(mine.map((m) => [m.serviceItemId, m]));
  const offeredByOthers = new Set(allOffers.filter((o) => o.resourceId !== resource.id).map((o) => o.serviceItemId));

  const services: MyServiceOpt[] = items.flatMap((i) => {
    const cat = catById.get(i.categoryId);
    if (!cat || KIND_BY_SLUG[cat.slug] !== resource.kind) return [];
    const m = mineByItem.get(i.id);
    return [
      {
        id: i.id,
        name: i.name,
        category: cat.shortTitle,
        groupTitle: i.groupTitle,
        // „Предлагам" следва active — изключена услуга е active=false, но цената на
        // изпълнителя (m.price) се ПАЗИ и се връща при повторно включване.
        offered: m?.active ?? false,
        onlineBookable: m?.onlineBookable ?? true,
        price: m?.price ?? i.price,
        priceMax: (m?.priceMax ?? i.priceMax) ?? null,
        priceFrom: m?.priceFrom ?? i.priceFrom,
        currency: m?.currency ?? i.currency,
        durationMin: m?.durationMin ?? i.durationMin,
        bufferMin: m?.bufferMin ?? i.bufferMin,
        // Престоят е глобален на услугата (каталог) — управлява се от /staff редакцията.
        activeMin: i.activeMin,
        processingMin: i.processingMin,
        // Може да се изтрие от каталога само ако друг изпълнител не я предлага.
        deletable: !offeredByOthers.has(i.id),
      },
    ];
  });

  // Категориите за неговия kind — за формата „Добави услуга" (при нова група).
  const myCategories: MyCategoryOpt[] = cats
    .filter((c) => KIND_BY_SLUG[c.slug] === resource.kind)
    .map((c) => ({ slug: c.slug, title: c.shortTitle }));

  return (
    <StaffShell kind={resource.kind}>
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Управление</p>
        <h1 className="mt-1 font-display text-2xl font-medium">Моите услуги</h1>
        <p className="mt-1 text-sm text-muted-foreground">Отметни кои предлагаш и задай своите цени.</p>
      </div>
      <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/80">
        <strong className="font-semibold">Важно:</strong> щом отметнеш поне една услуга, при онлайн записване клиентите виждат{" "}
        <strong>само отметнатите</strong>. Включи всички, които реално предлагаш — иначе останалите спират да се записват онлайн.
      </div>
      <MyServices services={services} categories={myCategories} phone={resource.phone} />
    </StaffShell>
  );
}
