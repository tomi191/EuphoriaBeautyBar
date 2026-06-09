import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { TeamForm } from "@/components/admin/team-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteTeamMember } from "@/lib/actions/team";

export default async function AdminTeamPage() {
  const members = await db.query.teamMembers.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  });

  return (
    <>
      <PageHeader
        title="Екип"
        subtitle="Управление на стилистите и специалистите, видими на сайта."
        action={
          <TeamForm
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="size-4" /> Нов член
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
              <TableHead>Роля</TableHead>
              <TableHead>Опит</TableHead>
              <TableHead>Специализации</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const deleteAction = deleteTeamMember.bind(null, m.id);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.role}</TableCell>
                  <TableCell className="text-sm">{m.experience}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {m.specialties.slice(0, 3).map((s, i) => (
                        <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                          {s}
                        </span>
                      ))}
                      {m.specialties.length > 3 && (
                        <span className="text-[11px] text-muted-foreground">+{m.specialties.length - 3}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (m.active ? "bg-mint/40 text-foreground" : "bg-secondary text-muted-foreground")
                      }
                    >
                      <span className={"size-1.5 rounded-full " + (m.active ? "bg-foreground" : "bg-muted-foreground")} />
                      {m.active ? "Активен" : "Скрит"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <TeamForm
                        initial={m}
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
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Все още няма добавен екип. Натисни &quot;Нов член&quot;.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
