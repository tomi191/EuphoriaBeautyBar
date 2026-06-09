import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";

export default async function AdminServicesPage() {
  const categories = await db.query.serviceCategories.findMany({
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
  const counts = await db
    .select({ categoryId: schema.serviceItems.categoryId, c: sql<number>`count(*)` })
    .from(schema.serviceItems)
    .groupBy(schema.serviceItems.categoryId);
  const map = Object.fromEntries(counts.map((c) => [c.categoryId, c.c]));

  return (
    <>
      <PageHeader
        title="Услуги и ценоразписи"
        subtitle="Четири категории, всяка със собствени групи и услуги. Кликни категория за редакция."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/admin/services/${c.id}`}
            className="group block rounded-2xl border border-border bg-background p-6 transition-all hover:border-foreground/40 hover:shadow-soft"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">{c.shortTitle}</p>
                <h3 className="mt-2 font-display text-2xl font-medium">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-6 flex items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
              <span className="font-display text-2xl font-medium text-foreground">{map[c.id] ?? 0}</span>
              <span>услуги</span>
              <span className="text-border">·</span>
              <span className={c.active ? "text-foreground" : "text-destructive"}>{c.active ? "активна" : "скрита"}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
