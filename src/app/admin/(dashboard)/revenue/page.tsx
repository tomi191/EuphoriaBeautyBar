import { PageHeader } from "@/components/admin/page-header";
import { getSalonRevenue } from "@/lib/actions/revenue";
import { RevenueTriCards } from "@/components/revenue/revenue-tri-cards";
import { formatEur } from "@/lib/booking/revenue";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  hair: "Коса",
  nails: "Маникюр",
  cosmetics: "Козметика",
};

export default async function AdminRevenuePage() {
  const { total, byResource } = await getSalonRevenue();

  return (
    <>
      <PageHeader
        title="Оборот"
        subtitle="Приходи от записаните часове — изкарано досега и очаквано от предстоящите."
      />

      <section className="mb-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Целият салон</h2>
        <RevenueTriCards stats={total} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          По изпълнител (този месец)
        </h2>
        {byResource.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Още няма онлайн записи за този период.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Изпълнител</th>
                  <th className="px-4 py-3 text-right font-medium">Изкарано</th>
                  <th className="px-4 py-3 text-right font-medium">Очаквано</th>
                  <th className="px-4 py-3 text-right font-medium">Часа</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byResource.map((r) => (
                  <tr key={r.id} className="bg-background">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.name}</p>
                      {r.kind && <p className="text-xs text-muted-foreground">{KIND_LABEL[r.kind] ?? r.kind}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatEur(r.stats.month.earned.total)} €</td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary">
                      {r.stats.month.expected.total > 0 ? `+ ${formatEur(r.stats.month.expected.total)} €` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.stats.month.earned.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-medium text-foreground">Изкарано</strong> = минали часове (без отменените и неявилите
          се). <strong className="font-medium text-foreground">Очаквано</strong> = предстоящи потвърдени часове за
          периода. Броят се всички записани часове (онлайн, по телефон и на място). Сумите са по цените на услугите към
          момента на записване; за стари часове без снимка на цената — по текущата цена.
        </p>
      </section>
    </>
  );
}
