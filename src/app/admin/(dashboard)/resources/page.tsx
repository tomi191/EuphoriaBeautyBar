import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { ResourceForm } from "@/components/admin/resource-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { StaffAccountButton } from "@/components/admin/staff-account-button";
import { deleteResource } from "@/lib/actions/resources";

const KIND_LABEL: Record<string, string> = {
  hair: "Коса",
  nails: "Нокти",
  cosmetics: "Лице / Козметика",
};

export default async function AdminResourcesPage() {
  const resources = await db.query.resources.findMany({
    orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.name)],
  });

  return (
    <>
      <PageHeader
        title="Изпълнители"
        subtitle="Кой работи в салона и приема записвания. Часовете и графикът се водят по изпълнител."
        action={
          <ResourceForm
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="size-4" /> Нов изпълнител
              </Button>
            }
          />
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Име</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Цвят</TableHead>
              <TableHead>Вход</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((r) => {
              const deleteAction = deleteResource.bind(null, r.id);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{KIND_LABEL[r.kind] ?? r.kind}</TableCell>
                  <TableCell>
                    <span className="inline-block size-4 rounded-full border border-border" style={{ background: r.color ?? "transparent" }} />
                  </TableCell>
                  <TableCell>
                    <StaffAccountButton resourceId={r.id} resourceName={r.name} hasAccount={!!r.userId} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (r.active ? "bg-mint/40 text-foreground" : "bg-secondary text-muted-foreground")
                      }
                    >
                      <span className={"size-1.5 rounded-full " + (r.active ? "bg-foreground" : "bg-muted-foreground")} />
                      {r.active ? "Активен" : "Скрит"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ResourceForm
                        initial={r}
                        trigger={
                          <Button variant="outline" size="sm">
                            Редакция
                          </Button>
                        }
                      />
                      <DeleteButton action={deleteAction} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {resources.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Няма добавени изпълнители. Натисни &quot;Нов изпълнител&quot;.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
