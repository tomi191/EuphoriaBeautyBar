import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { FaqForm } from "@/components/admin/faq-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteFaq } from "@/lib/actions/faq";
import { HOME_FAQ_COUNT } from "@/lib/data/faq";

export default async function AdminFaqPage() {
  const items = await db.query.faqItems.findMany({
    orderBy: (f, { asc }) => [asc(f.sortOrder)],
  });

  return (
    <>
      <PageHeader
        title="Често задавани въпроси"
        subtitle={`Първите ${HOME_FAQ_COUNT} по ред излизат на началната страница и в Google. Останалите ги четат само AI асистентите.`}
        action={
          <FaqForm
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="size-4" /> Нов въпрос
              </Button>
            }
          />
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-48 whitespace-normal">Въпрос</TableHead>
              <TableHead>Отговор</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right whitespace-nowrap sticky right-0 z-[1] bg-background">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((f) => {
              const del = deleteFaq.bind(null, f.id);
              return (
                <TableRow key={f.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">{f.sortOrder}</TableCell>
                  <TableCell className="min-w-48 whitespace-normal font-medium">{f.question}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
                  </TableCell>
                  <TableCell>
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (f.active ? "bg-mint/40 text-foreground" : "bg-secondary text-muted-foreground")}>
                      {f.active ? "Активен" : "Скрит"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap sticky right-0 z-[1] bg-background group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.18)] lg:shadow-none">
                    <div className="flex justify-end gap-1">
                      <FaqForm initial={f} trigger={<Button variant="outline" size="sm">Редакция</Button>} />
                      <DeleteButton action={del} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Няма въпроси.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
