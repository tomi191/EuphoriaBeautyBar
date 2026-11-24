import Link from "next/link";
import { formatEuro } from "@/lib/booking/price";
import type { CampaignView } from "@/lib/campaigns/core";
import { CAMPAIGN_TEXT, PHASE_LABEL, returnedLine, shortDay, stopReasonText, type CampaignPhase } from "@/lib/campaigns/rules";
import { StopCampaignSheet } from "@/components/campaigns/stop-campaign-sheet";
import { cn } from "@/lib/utils";

// «Промоции» в приложението на специалиста (№11, кадри кръг-2/приложение-промоции-390, приложение-кампания-390,
// приложение-1440): редът в списъка, хапчето за статуса и панелът с числата. Без състояние: данните идват от
// loadCampaignViews, «Спри» е отделният лист.

const PILL: Record<CampaignPhase, string> = {
  pending: "bg-secondary text-foreground",
  returned: "bg-destructive-deep text-white",
  upcoming: "bg-sand-pill text-foreground",
  running: "bg-mint-soft text-primary",
  ended: "bg-secondary text-muted-foreground",
  stopped: "bg-secondary text-muted-foreground",
  expired: "bg-secondary text-muted-foreground",
};

export function PhasePill({ phase, className }: { phase: CampaignPhase; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 shrink-0 items-center rounded-full px-3 py-1 text-center text-sm font-medium leading-tight",
        phase === "pending" && "max-w-[6.5rem] lg:max-w-none",
        PILL[phase],
        className,
      )}
    >
      {PHASE_LABEL[phase]}
    </span>
  );
}

export const campaignTitle = (v: CampaignView) => v.services.map((s) => s.name).join(", ");

/** «~~25 €~~ 20 €» за първата услуга при намаление; null при подарък. */
function Prices({ v, big }: { v: CampaignView; big?: boolean }) {
  const s = v.services[0];
  if (v.kind !== "discount" || !s || s.prevEur == null || s.newEur == null) return null;
  return (
    <>
      <s className={cn("text-muted-foreground", big && "decoration-2")}>{formatEuro(s.prevEur)}</s>{" "}
      <span className={cn("font-semibold text-foreground", big && "font-medium")}>{formatEuro(s.newEur)}</span>
      <span className="sr-only">: предишна цена {formatEuro(s.prevEur)}, нова цена {formatEuro(s.newEur)}</span>
    </>
  );
}

const left = (v: CampaignView) => (v.slots != null ? Math.max(v.slots - v.stats.total, 0) : null);
const placesWord = (n: number) => (n === 1 ? "1\u00a0място" : `${n}\u00a0места`);

/** Редът под името в списъка (Саиф 4.4–4.10). */
function RowDetail({ v, today }: { v: CampaignView; today: string }) {
  const d = (x: string) => shortDay(x, today);
  const sep = " · ";
  switch (v.phase) {
    case "pending":
      return (
        <>
          <p className="text-[15px] leading-snug">
            {v.kind === "discount" ? <Prices v={v} /> : <>Подарък: {v.gift}</>}
            {sep}
            {d(v.startsOn)}–{d(v.endsOn)}
            {v.slots != null && <>{sep}{placesWord(v.slots)}</>}
          </p>
          {v.submittedAt && (
            <p className="mt-0.5 hidden text-sm text-muted-foreground lg:block">
              Изпратена на {d(v.submittedAt.slice(0, 10))}. Снежана още не е отговорила.
            </p>
          )}
        </>
      );
    case "returned":
      return (
        <>
          <p className="text-[15px] leading-snug text-muted-foreground">{returnedLine(v.returnReason, v.returnReason === "other" ? v.returnNote : null)}</p>
          {v.returnNote && v.returnReason !== "other" && <p className="text-[15px] italic leading-snug text-muted-foreground">„{v.returnNote}“</p>}
        </>
      );
    case "upcoming":
      return (
        <p className="text-[15px] leading-snug text-muted-foreground">
          {v.kind === "gift" ? <>Подарък: {v.gift}</> : <Prices v={v} />}
          <span className="lg:hidden">{sep}</span>
          <br className="hidden lg:block" />
          Тръгва на {d(v.startsOn)}
          <span className="hidden lg:inline">.</span>
        </p>
      );
    case "running": {
      const n = left(v);
      return (
        <p className="text-[15px] leading-snug">
          {v.kind === "discount" ? <Prices v={v} /> : <>Подарък: {v.gift}</>}
          {sep}до&nbsp;{d(v.endsOn)}
          {n != null && (
            <>
              <span className="hidden lg:inline">{sep}остават {placesWord(n)}</span>
              <span className="block lg:hidden">Остават {placesWord(n)}</span>
            </>
          )}
        </p>
      );
    }
    case "ended":
      return (
        <p className="text-[15px] leading-snug text-muted-foreground">
          Свърши на {d(v.endsOn)}
          {sep}
          {v.stats.total === 1 ? "1 час" : `${v.stats.total} часа`}
        </p>
      );
    case "stopped":
      return (
        <p className="text-[15px] leading-snug text-muted-foreground">
          Спряна на {d(v.stoppedOn ?? v.endsOn)}
          {stopReasonText(v.stopReason, v.stopNote) ? `: ${stopReasonText(v.stopReason, v.stopNote)}` : ""}.
        </p>
      );
    case "expired":
      return <p className="text-[15px] leading-snug text-muted-foreground">Времето мина, преди Снежана да я одобри.</p>;
  }
}

export function PromotionRow({ v, today, selected }: { v: CampaignView; today: string; selected: boolean }) {
  return (
    <li
      className={cn(
        "relative rounded-2xl border bg-background px-4 py-3.5 transition-colors",
        selected ? "border-border lg:border-primary lg:ring-1 lg:ring-primary" : "border-border hover:border-foreground/30",
      )}
    >
      {/* На телефона редът под името е на цялата ширина, под хапчето (Канопус, обща сверка, т. Е). */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
        <div className="min-w-0 [text-wrap:balance]">
          <Link
            href={`/staff/promotions?id=${v.id}`}
            aria-current={selected ? "true" : undefined}
            className="text-[16px] font-medium leading-snug after:absolute after:inset-0 after:rounded-2xl"
          >
            {campaignTitle(v)}
          </Link>
        </div>
        <PhasePill phase={v.phase} />
        <div className="col-span-2 mt-0.5 min-w-0 lg:col-span-1">
          <RowDetail v={v} today={today} />
        </div>
      </div>
      {v.phase === "returned" && (
        <div className="relative z-10 mt-2 hidden justify-end lg:flex">
          <Link
            href={`/staff/promotions/new?edit=${v.id}`}
            className="inline-flex h-11 items-center rounded-full border border-primary px-6 text-[15px] font-medium text-primary transition-colors hover:bg-primary/5"
          >
            {CAMPAIGN_TEXT.returnedFix}
          </Link>
        </div>
      )}
    </li>
  );
}

/** Панелът на една промоция: на 390 е цял екран (?id=), на 1440 стои до списъка. */
export function PromotionPanel({ v, today }: { v: CampaignView; today: string }) {
  const s = v.services[0];
  const n = left(v);
  const canStop = v.phase === "pending" || v.phase === "upcoming" || v.phase === "running";
  const stats: [number, string][] = [[v.stats.total, "записани часа"]];
  if (v.slots != null) stats.push([n ?? 0, "остават места"], [v.slots, "места общо"]);
  const ways = [`сайт ${v.stats.site}`, `приложение ${v.stats.app}`, `телефон ${v.stats.phone}`].join(" · ");

  return (
    <section aria-labelledby="promo-title" className="lg:rounded-3xl lg:border lg:border-border lg:bg-background lg:px-12 lg:py-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="promo-title" className="font-display text-[28px] font-medium leading-tight lg:text-[3.25rem]">
          {campaignTitle(v)}
        </h2>
        <PhasePill phase={v.phase} className="lg:h-12 lg:px-6 lg:text-[1.75rem]" />
      </div>

      {v.kind === "discount" && s?.prevEur != null && s.newEur != null ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[24px] leading-none lg:mt-6 lg:flex-nowrap lg:gap-x-5 lg:border-b lg:border-border lg:pb-8">
          <s className="text-muted-foreground lg:text-[2.75rem] lg:font-medium lg:decoration-[3px]">{formatEuro(s.prevEur)}</s>
          <span className="lg:text-[5rem] lg:font-semibold lg:tracking-tight">{formatEuro(s.newEur)}</span>
          {s.percent != null && (
            <span className="hidden rounded-full bg-mint-soft px-5 py-3 text-[2.25rem] font-medium text-primary lg:inline-block lg:shrink-0">−{s.percent}%</span>
          )}
          <span className="lg:hidden">·</span>
          <span className="whitespace-nowrap lg:ml-2 lg:border-l lg:border-border lg:py-3 lg:pl-8 lg:text-[2.25rem]">до {shortDay(v.endsOn, today)}</span>
          <span className="sr-only">
            Предишна цена {formatEuro(s.prevEur)}, нова цена {formatEuro(s.newEur)}.
          </span>
        </div>
      ) : (
        <p className="mt-3 text-[19px] leading-snug lg:mt-6 lg:border-b lg:border-border lg:pb-8 lg:text-[1.75rem]">
          Подарък: {v.gift} · до {shortDay(v.endsOn, today)}
        </p>
      )}

      {v.phase === "returned" && (
        <div className="mt-5">
          <p className="text-[17px] text-muted-foreground">{returnedLine(v.returnReason, v.returnReason === "other" ? v.returnNote : null)}</p>
          {v.returnNote && v.returnReason !== "other" && <p className="text-[17px] italic text-muted-foreground">„{v.returnNote}“</p>}
          <Link
            href={`/staff/promotions/new?edit=${v.id}`}
            className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {CAMPAIGN_TEXT.returnedFix}
          </Link>
        </div>
      )}

      {v.phase !== "returned" && v.phase !== "pending" && v.phase !== "expired" && (
        <>
          <dl
            className={cn(
              "mt-6 grid gap-3 lg:mt-0 lg:gap-0 lg:divide-x lg:divide-border lg:border-b lg:border-border lg:py-8",
              stats.length === 3 ? "grid-cols-3" : "grid-cols-1",
            )}
          >
            {stats.map(([num, label]) => (
              <div key={label} className="flex flex-col-reverse items-center justify-end rounded-2xl border border-border bg-background px-2 py-4 text-center lg:rounded-none lg:border-0 lg:py-0">
                <dt className="mt-1 max-w-[6rem] text-[15px] leading-tight text-muted-foreground lg:max-w-none lg:text-[1.75rem] lg:text-foreground/70">{label}</dt>
                <dd className="text-[40px] font-medium leading-none lg:text-[3.5rem]">{num}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[15px] text-muted-foreground lg:mt-8 lg:text-[1.75rem]">{ways}</p>
        </>
      )}

      {v.firstVisitOnly && (
        <p className="mt-4 hidden border-b border-border pb-8 text-[1.75rem] lg:block">{CAMPAIGN_TEXT.firstVisit}</p>
      )}

      {canStop && (
        <div className="mt-8 border-t border-border pt-8 lg:border-0 lg:pt-0">
          <StopCampaignSheet id={v.id} title={campaignTitle(v)} as="staff" />
          <p className="mt-3 text-center text-[15px] text-muted-foreground lg:text-xl">
            <span className="lg:hidden">{CAMPAIGN_TEXT.stopKeepsPrice}</span>
            <span className="hidden lg:inline">{CAMPAIGN_TEXT.stopText}</span>
          </p>
        </div>
      )}
    </section>
  );
}
