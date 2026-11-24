import Link from "next/link";
import { loadCampaignViews, todaySofia, type CampaignView } from "@/lib/campaigns/core";
import { PHASE_LABEL, checkPassedLine, returnedLine, shortDay, stopReasonText, type CampaignPhase } from "@/lib/campaigns/rules";
import { AdminCampaignCard } from "@/components/campaigns/admin-campaign-card";
import { StopCampaignSheet } from "@/components/campaigns/stop-campaign-sheet";

export const dynamic = "force-dynamic";

type Tab = "pending" | "running" | "upcoming" | "ended";
const TABS: [Tab, string][] = [
  ["pending", "Чакат"],
  ["running", "Текат"],
  ["upcoming", "Предстоят"],
  ["ended", "Свършили"],
];
const IN_TAB: Record<Tab, CampaignPhase[]> = {
  pending: ["pending"],
  running: ["running"],
  upcoming: ["upcoming"],
  ended: ["ended", "stopped", "expired", "returned"],
};

/**
 * «Промоции» при Снежана (№11, кадри кръг-2/админ-промоции-1440 и админ-telegram-спри-390; Саиф 5.7–5.14).
 * «Чакат» носи картите за одобрение и под тях течащите; «Свършили» е историята. ?return=<id> идва от «Друго» в Telegram.
 */
export default async function AdminPromotionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; return?: string }> }) {
  const sp = await searchParams;
  const today = todaySofia();
  const views = await loadCampaignViews({});
  const focus = sp.return ? views.find((v) => v.id === sp.return && v.phase === "pending") : undefined;
  const tab: Tab = focus ? "pending" : (TABS.find(([t]) => t === sp.tab)?.[0] ?? "pending");
  const of = (t: Tab) => views.filter((v) => IN_TAB[t].includes(v.phase));
  const d = (x: string) => shortDay(x, today);
  const nameOf = (v: CampaignView) => (v.isOwner ? "Снежана" : v.resourceName);

  const rows = (list: CampaignView[], stop: boolean) => (
    <ul className="space-y-2 lg:max-w-[72rem]">
      {list.map((v) => {
        const title = v.services.map((s) => s.name).join(", ");
        const left = v.slots != null ? Math.max(v.slots - v.stats.total, 0) : null;
        const parts = [title, nameOf(v)];
        if (v.phase === "running") parts.push(`до ${d(v.endsOn)}`);
        if (v.phase === "upcoming") parts.push(`от ${d(v.startsOn)} до ${d(v.endsOn)}`);
        if ((v.phase === "running" || v.phase === "upcoming") && left != null) parts.push(left === 1 ? "остава 1 място" : `остават ${left} места`);
        const history =
          v.phase === "ended"
            ? `${PHASE_LABEL.ended} на ${d(v.endsOn)}, записани часове: ${v.stats.total}.`
            : v.phase === "stopped"
              ? `Спряна на ${d(v.stoppedOn ?? v.endsOn)}: ${stopReasonText(v.stopReason, v.stopNote)}.`
              : v.phase === "expired"
                ? "Изтече, без да е одобрена."
                : v.phase === "returned"
                  ? returnedLine(v.returnReason, v.returnReason === "other" ? v.returnNote : null)
                  : null;
        return (
          <li key={v.id} className="flex min-h-16 items-center gap-4 rounded-xl border border-border bg-background py-2 pl-5 pr-2">
            <div className="min-w-0 flex-1">
              <p className="text-[17px] leading-snug lg:text-xl">{parts.join(" · ")}</p>
              {history && <p className="text-[15px] text-muted-foreground">{history}</p>}
            </div>
            {stop && <StopCampaignSheet id={v.id} title={title} as="admin" compact />}
          </li>
        );
      })}
    </ul>
  );

  const pending = of("pending");
  const empty = (text: string) => (
    <p className="rounded-lg border border-border bg-card px-5 py-8 text-center text-[15px] text-muted-foreground lg:max-w-[72rem]">{text}</p>
  );

  return (
    <>
      <h1 className="mb-5 font-display text-3xl font-medium md:text-[2.75rem]">Промоции</h1>
      <nav aria-label="Раздели" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:gap-3 lg:px-0">
        {TABS.map(([t, label]) => (
          <Link key={t} href={t === "pending" ? "/admin/promotions" : `/admin/promotions?tab=${t}`} aria-current={tab === t ? "page" : undefined} className="flex h-12 shrink-0 items-center">
            <span
              className={
                "inline-flex h-11 items-center whitespace-nowrap rounded-full border px-5 text-base lg:px-8 lg:text-lg " +
                (tab === t ? "border-foreground bg-foreground font-medium text-background" : "border-border bg-background text-foreground hover:border-foreground/40")
              }
            >
              {label}
            </span>
          </Link>
        ))}
      </nav>

      {tab === "pending" && (
        <>
          {pending.length === 0
            ? empty("Няма промоции за одобрение.")
            : (
                <div className="space-y-4">
                  {pending.map((v) => (
                    <AdminCampaignCard
                      key={v.id}
                      v={v}
                      name={nameOf(v)}
                      dates={`От ${d(v.startsOn)} до ${d(v.endsOn)}.${v.slots != null ? ` Места: ${v.slots}.` : ""}${v.firstVisitOnly ? " Само за първо посещение." : ""}`}
                      checkLine={checkPassedLine(v, v.services[0]?.prevEur ?? null, "admin")}
                      openReturn={focus?.id === v.id}
                    />
                  ))}
                </div>
              )}
          {of("running").length > 0 && (
            <>
              <h2 className="mb-3 mt-8 font-display text-[1.75rem] font-semibold">Текат</h2>
              {rows(of("running"), true)}
            </>
          )}
        </>
      )}
      {tab === "running" && (of("running").length ? rows(of("running"), true) : empty("Сега не тече промоция."))}
      {tab === "upcoming" && (of("upcoming").length ? rows(of("upcoming"), true) : empty("Няма одобрени промоции, които предстоят."))}
      {tab === "ended" && (of("ended").length ? rows(of("ended"), false) : empty("Още няма свършили промоции."))}
    </>
  );
}
