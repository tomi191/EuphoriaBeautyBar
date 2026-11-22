import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getReadiness, notReadyLabel } from "@/lib/booking/readiness";
import { FUTURE_STATUSES, futureBookingsLabel } from "@/lib/booking/future-bookings";
import { isEnded } from "@/lib/booking/ended";
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

/** Връщане само към «Места под наем» (от «Добави нов изпълнител» в листа «Кой зае мястото?»). */
function safeBack(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && /^\/admin\/positions(\?[\w=&%-]*)?$/.test(v) ? v : undefined;
}

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const back = safeBack(sp.back);
  const resources = await db.query.resources.findMany({
    orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.name)],
  });
  // Активен, но неготов → етикет какво липсва; приключил с бъдещи часове → връзка към тях.
  // Бъдещите часове на всеки → потвърждението при „Приключи сътрудничеството" ги показва.
  const readiness = await getReadiness(resources.filter((r) => r.active).map((r) => r.id));
  const future = await db.query.bookings.findMany({
    where: (b, { and, gt, inArray }) => and(gt(b.startAt, new Date()), inArray(b.status, FUTURE_STATUSES)),
    columns: { resourceId: true },
  });
  const futureCount = new Map<string, number>();
  for (const b of future) futureCount.set(b.resourceId, (futureCount.get(b.resourceId) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Изпълнители"
        subtitle="Кой работи в салона и приема записвания. Часовете и графикът се водят по изпълнител."
        action={
          <ResourceForm
            defaultOpen={sp.new === "1"}
            returnTo={back}
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
              <TableHead className="text-right whitespace-nowrap sticky right-0 z-[1] bg-background">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((r) => {
              const deleteAction = deleteResource.bind(null, r.id);
              return (
                <TableRow key={r.id} id={`r-${r.id}`} className="group scroll-mt-24 target:bg-mint/20">
                  <TableCell className="font-medium">
                    {r.name}
                    {r.active && readiness.get(r.id) && notReadyLabel(readiness.get(r.id)!) && (
                      <span className="mt-1 block w-fit max-w-44 whitespace-normal rounded-xl bg-blush/50 px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {notReadyLabel(readiness.get(r.id)!)}
                      </span>
                    )}
                    {isEnded(r) && (futureCount.get(r.id) ?? 0) > 0 && (
                      <span className="mt-1 block max-w-44 whitespace-normal text-xs font-normal text-foreground">
                        {futureBookingsLabel(futureCount.get(r.id)!, r.name).text}:{" "}
                        <Link href={`/admin/bookings?resource=${r.id}&upcoming=1`} className="underline underline-offset-2">
                          {futureBookingsLabel(futureCount.get(r.id)!, r.name).see}
                        </Link>
                      </span>
                    )}
                  </TableCell>
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
                      {r.active ? "Активен" : isEnded(r) ? "Приключил" : "Скрит"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap sticky right-0 z-[1] bg-background group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.18)] lg:shadow-none">
                    <div className="flex justify-end gap-1">
                      <ResourceForm
                        initial={r}
                        futureBookings={futureCount.get(r.id) ?? 0}
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
