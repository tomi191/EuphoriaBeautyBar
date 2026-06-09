import { Plus, Star } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteTestimonial } from "@/lib/actions/testimonials";

export default async function AdminTestimonialsPage() {
  const items = await db.query.testimonials.findMany({
    orderBy: (t, { asc, desc }) => [asc(t.sortOrder), desc(t.createdAt)],
  });

  return (
    <>
      <PageHeader
        title="Отзиви"
        subtitle="Ръчни отзиви, видими в секцията на началната страница. Google ревютата се управляват отделно."
        action={
          <TestimonialForm
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="size-4" /> Нов отзив
              </Button>
            }
          />
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Услуга</TableHead>
              <TableHead>Рейтинг</TableHead>
              <TableHead>Цитат</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => {
              const del = deleteTestimonial.bind(null, t.id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.service}</TableCell>
                  <TableCell>
                    <div className="flex">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-foreground text-foreground" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{t.quote}</p>
                  </TableCell>
                  <TableCell>
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (t.approved ? "bg-mint/40 text-foreground" : "bg-secondary text-muted-foreground")}>
                      {t.approved ? "Одобрен" : "Чернова"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <TestimonialForm initial={t} trigger={<Button variant="outline" size="sm">Редакция</Button>} />
                      <DeleteButton action={del} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Все още няма отзиви.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
