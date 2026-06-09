import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { PositionForm } from "@/components/admin/position-form";
import { RentalOpenToggle } from "@/components/admin/rental-open-toggle";
import { DeleteButton } from "@/components/admin/delete-button";
import { deletePosition } from "@/lib/actions/positions";

export default async function AdminPositionsPage() {
  const [positions, rentalOpenRow] = await Promise.all([
    db.query.rentalPositions.findMany({ orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.title)] }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "rental_open") }),
  ]);
  const rentalOpen = rentalOpenRow ? Boolean(rentalOpenRow.value) : true;

  return (
    <>
      <PageHeader
        title="Места под наем"
        subtitle="Свободни работни места в салона, видими на /karieri."
        action={
          <PositionForm
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="size-4" /> Нова позиция
              </Button>
            }
          />
        }
      />

      <div className="mb-6">
        <RentalOpenToggle initial={rentalOpen} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Позиция</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Умения</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((p) => {
              const deleteAction = deletePosition.bind(null, p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {p.skills.slice(0, 3).map((s, i) => (
                        <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                          {s}
                        </span>
                      ))}
                      {p.skills.length > 3 && (
                        <span className="text-[11px] text-muted-foreground">+{p.skills.length - 3}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (p.active ? "bg-mint/40 text-foreground" : "bg-secondary text-muted-foreground")
                      }
                    >
                      <span className={"size-1.5 rounded-full " + (p.active ? "bg-foreground" : "bg-muted-foreground")} />
                      {p.active ? "Активна" : "Скрита"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <PositionForm
                        initial={p}
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
            {positions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  Няма добавени позиции. Натисни &quot;Нова позиция&quot;.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
