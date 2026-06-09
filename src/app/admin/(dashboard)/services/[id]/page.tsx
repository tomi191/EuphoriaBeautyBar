import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceItemForm } from "@/components/admin/service-item-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteServiceItem } from "@/lib/actions/service-items";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function CategoryEditPage({ params }: Params) {
  const { id } = await params;
  const category = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, id) });
  if (!category) notFound();

  const items = await db.query.serviceItems.findMany({
    where: (i, { eq }) => eq(i.categoryId, id),
    orderBy: (i, { asc }) => [asc(i.groupTitle), asc(i.sortOrder)],
  });

  const groupTitles = Array.from(new Set(items.map((i) => i.groupTitle)));

  return (
    <>
      <Link href="/admin/services" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Към категориите
      </Link>

      <PageHeader
        title={category.title}
        subtitle={`${items.length} услуги · slug: ${category.slug}`}
        action={
          <ServiceItemForm
            categoryId={category.id}
            groupTitles={groupTitles}
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="size-4" /> Нова услуга
              </Button>
            }
          />
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Група</TableHead>
              <TableHead>Услуга</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => {
              const del = deleteServiceItem.bind(null, i.id);
              return (
                <TableRow key={i.id}>
                  <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">{i.groupTitle}</TableCell>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="font-display text-base font-medium">
                    {i.priceFrom && <span className="text-xs text-muted-foreground">от </span>}
                    {i.price}
                    {i.priceMax && <span className="text-muted-foreground">–{i.priceMax}</span>}
                    <span className="ml-1 text-xs text-muted-foreground">{i.currency}</span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="line-clamp-1 text-xs text-muted-foreground">{i.description ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ServiceItemForm
                        categoryId={category.id}
                        groupTitles={groupTitles}
                        initial={i}
                        trigger={<Button variant="outline" size="sm">Редакция</Button>}
                      />
                      <DeleteButton action={del} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  Все още няма услуги в тази категория.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
