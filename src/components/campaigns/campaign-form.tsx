"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { checkCampaignDraft, submitCampaign } from "@/lib/actions/campaigns";
import { formatEuro } from "@/lib/booking/price";
import {
  CAMPAIGN_TEXT,
  GIFT_MAX,
  MAX_PERCENT,
  MAX_SERVICES,
  MIN_PERCENT,
  REASON_MAX,
  displayPercent,
  priceFromPercent,
  serviceProblem,
  shortDay,
  type CampaignInput,
  type CampaignKind,
  type Problem,
  type ProblemField,
  type ServiceFacts,
} from "@/lib/campaigns/rules";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { cn } from "@/lib/utils";

// Формата «Нова промоция» на 5 стъпки (Саиф 4.11–4.43; кадри A-форма-390, приложение-промоции-390 екрани 3–4,
// приложение-кампания-390 екрани 1–2). Всяка стъпка пита сървъра (checkCampaignDraft); браузърът само показва.

const STEP_FIELDS: ProblemField[][] = [["services", "limits"], ["conditions"], ["price"], ["dates"], []];
const NEXT = ["Към условията", "Към цената", "Към датите", "Към прегледа"];
const fieldsUpTo = (step: number) => STEP_FIELDS.slice(0, step + 1).flat();
const stepOf = (f: ProblemField) => Math.max(STEP_FIELDS.findIndex((x) => x.includes(f)), 0);

const parseMoney = (t: string) => {
  const n = Number(t.replace(",", ".").replace(/[^\d.]/g, ""));
  return t.trim() && Number.isFinite(n) ? n : null;
};
const moneyText = (n: number) => String(n).replace(".", ",");

const inputCls = "h-14 w-full rounded-2xl border border-input bg-background px-4 text-[19px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";
const primaryBtn =
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-secondary disabled:text-foreground/70";

export function CampaignForm({
  services,
  today,
  who,
  isOwner,
  showConsentLine,
  initial,
  editId,
}: {
  services: ServiceFacts[];
  today: string;
  who: string;
  isOwner: boolean;
  showConsentLine: boolean;
  initial: CampaignInput;
  editId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [facts, setFacts] = React.useState(() => new Map(services.map((s) => [s.serviceItemId, s])));
  const [kind, setKind] = React.useState<CampaignKind>(initial.kind);
  const [ids, setIds] = React.useState<string[]>(initial.serviceItemIds);
  const [prices, setPrices] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initial.newPrices).filter(([, v]) => v != null).map(([k, v]) => [k, moneyText(v as number)])),
  );
  const [pcts, setPcts] = React.useState<Record<string, string>>({});
  const [gift, setGift] = React.useState(initial.gift ?? "");
  const [reason, setReason] = React.useState(initial.reason ?? "");
  const [slots, setSlots] = React.useState(initial.slots != null ? String(initial.slots) : "");
  const [firstVisit, setFirstVisit] = React.useState(initial.firstVisitOnly);
  const [startsOn, setStartsOn] = React.useState(initial.startsOn);
  const [endsOn, setEndsOn] = React.useState(initial.endsOn);
  const [problems, setProblems] = React.useState<Problem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const topRef = React.useRef<HTMLDivElement>(null);

  const offered = services.filter((s) => s.offered);
  const chosen = ids.map((id) => facts.get(id)).filter((s): s is ServiceFacts => !!s);

  function buildInput(forStep: number): CampaignInput {
    return {
      kind,
      serviceItemIds: ids,
      newPrices: Object.fromEntries(ids.map((id) => [id, parseMoney(prices[id] ?? "")])),
      gift: kind === "gift" ? gift : null,
      reason: reason.trim() || null,
      // До стъпка «Датите» цената се проверява към днес (кадърът: «Намаление може от …» още на стъпка 3).
      startsOn: startsOn || (forStep >= 2 ? today : ""),
      endsOn: endsOn || (forStep >= 2 && forStep < 3 ? today : ""),
      slots: slots.trim() === "" ? null : Number(slots),
      firstVisitOnly: firstVisit,
    };
  }

  /** «Започни от ДД.ММ»: началото става датата, от която намалението е позволено, и сървърът смята пак към нея. */
  async function startFrom(from: string) {
    if (busy) return;
    setStartsOn(from);
    setProblems([]);
    setBusy(true);
    try {
      const r = await checkCampaignDraft({ ...buildInput(2), startsOn: from }, editId);
      setFacts(new Map(r.services.map((s) => [s.serviceItemId, s])));
    } catch (e) {
      console.error("[campaigns] проверката падна:", e);
      setProblems([{ field: "price", text: "Няма връзка. Опитай пак." }]);
    } finally {
      setBusy(false);
    }
  }

  function go(n: number) {
    setStep(n);
    topRef.current?.scrollIntoView({ block: "start" });
  }

  async function next() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await checkCampaignDraft(buildInput(step), editId);
      setFacts(new Map(r.services.map((s) => [s.serviceItemId, s])));
      const rel = r.problems.filter((p) => fieldsUpTo(step).includes(p.field));
      setProblems(rel);
      if (rel.length === 0) go(step + 1);
      else go(Math.min(...rel.map((p) => stepOf(p.field))));
    } catch (e) {
      console.error("[campaigns] проверката падна:", e);
      setProblems([{ field: STEP_FIELDS[step][0] ?? "services", text: "Няма връзка. Опитай пак." }]);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await submitCampaign(buildInput(4), editId);
      if (!r.ok) {
        const ps = r.problems?.length ? r.problems : [{ field: "services" as const, text: r.error }];
        setProblems(ps);
        go(Math.min(...ps.map((p) => stepOf(p.field))));
        return;
      }
      if (r.status === "approved") {
        router.push(`/staff/promotions?id=${r.id}`);
        return;
      }
      toast.success(CAMPAIGN_TEXT.sentToast);
      setSent(true);
    } catch (e) {
      console.error("[campaigns] изпращането падна:", e);
      setProblems([{ field: "services", text: "Няма връзка. Промоцията не е изпратена. Опитай пак." }]);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center pt-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden>
          <Check className="size-7" strokeWidth={2.6} />
        </span>
        <p className="mt-8 font-display text-[22px] font-medium leading-snug" aria-live="polite">
          {CAMPAIGN_TEXT.sentScreen}
        </p>
        <Link href="/staff/promotions" className={cn(primaryBtn, "mt-9")}>
          {CAMPAIGN_TEXT.sectionName}
        </Link>
      </div>
    );
  }

  const stepProblems = (f: ProblemField, serviceId?: string) =>
    problems.filter((p) => p.field === f && (serviceId === undefined ? !p.serviceItemId : p.serviceItemId === serviceId));
  const Errors = ({ list }: { list: Problem[] }) =>
    list.length ? (
      <div role="alert" className="mt-3 space-y-1">
        {list.map((p, i) => (
          <p key={i} className="text-[15px] leading-snug text-destructive">
            {p.text}
          </p>
        ))}
      </div>
    ) : null;

  // Стъпка «Цената»: какво спира услуга сега (сменена цена, цена «от», пауза), по чистото правило; сървърът решава.
  const priceStart = startsOn || today;
  // Проверката е към началото на промоцията: забрана «от ДД.ММ» не спира, ако началото вече е от тази дата.
  const blockers = new Map(
    chosen
      .map((s) => [s.serviceItemId, serviceProblem(kind, s, priceStart, today)] as const)
      .filter(([, p]) => !!p && !(p.from && priceStart >= p.from)),
  );

  const card = {
    kind,
    who,
    services: chosen.map((s) => {
      const prev = s.lowest.lowestEur;
      const nv = parseMoney(prices[s.serviceItemId] ?? "");
      return {
        name: s.name,
        prevEur: kind === "discount" ? prev : null,
        newEur: kind === "discount" ? nv : null,
        percent: kind === "discount" && prev != null && nv != null ? displayPercent(prev, nv) : null,
        regularEur: s.priceEur,
        priceFrom: s.priceFrom,
      };
    }),
    gift: kind === "gift" ? gift.trim() : null,
    reason: reason.trim() || null,
    endsOn: endsOn || today,
    firstVisitOnly: firstVisit,
    slotsLeft: slots.trim() ? Number(slots) : null,
    sameWho: isOwner ? "Снежана" : "този специалист",
  };

  return (
    <div ref={topRef} className="scroll-mt-16">
      <div className="-ml-1 -mt-3 flex h-12 items-center gap-6 px-1">
        {step === 0 ? (
          <Link href="/staff/promotions" aria-label={CAMPAIGN_TEXT.sectionName} className="grid size-11 place-items-center -ml-3">
            <ArrowLeft className="size-6" strokeWidth={1.7} aria-hidden />
          </Link>
        ) : (
          <button type="button" onClick={() => go(step - 1)} aria-label="Назад" className="grid size-11 place-items-center -ml-3">
            <ArrowLeft className="size-6" strokeWidth={1.7} aria-hidden />
          </button>
        )}
        <h1 className="font-display text-[22px] font-medium">{CAMPAIGN_TEXT.newButton}</h1>
      </div>

      {step < 4 && (
        <>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((step + 1) / 5) * 100}%` }} />
          </div>
          <p className="mt-4 text-center text-[19px] text-muted-foreground">
            {step + 1} от 5 · {CAMPAIGN_TEXT.steps[step]}
          </p>
        </>
      )}

      {step === 0 && (
        <section className="mt-8">
          <h2 className="font-display text-[30px] font-medium">Услугите</h2>
          <p className="mt-1 text-[17px] text-muted-foreground">{CAMPAIGN_TEXT.servicesHelp}</p>
          <Errors list={stepProblems("limits")} />
          <ul className="mt-4 space-y-3">
            {offered.map((s) => {
              const on = ids.includes(s.serviceItemId);
              const lockedUntil = s.openCampaignUntil;
              const disabled = !!lockedUntil || !s.onlineBookable || (!on && ids.length >= MAX_SERVICES);
              const err = stepProblems("services", s.serviceItemId);
              return (
                <li key={s.serviceItemId}>
                  <label
                    className={cn(
                      "flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border border-border bg-background px-4 py-3",
                      disabled && !on && "cursor-default",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={disabled && !on}
                      onChange={() => setIds((x) => (on ? x.filter((i) => i !== s.serviceItemId) : [...x, s.serviceItemId]))}
                      className="size-7 shrink-0 rounded-full accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("flex items-center gap-3 text-[16px] leading-snug [text-wrap:pretty]", disabled && !on && "text-foreground/80")}>
                        {s.name}
                        {lockedUntil && <Lock className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.7} aria-hidden />}
                      </span>
                      {lockedUntil && <span className="block text-[15px] text-muted-foreground [text-wrap:pretty]">Вече има промоция до {shortDay(lockedUntil, today)}.</span>}
                      {!lockedUntil && !s.onlineBookable && <span className="block text-[15px] text-muted-foreground">{CAMPAIGN_TEXT.noOnline}</span>}
                      <Errors list={err} />
                    </span>
                    <span className="shrink-0 border-l border-border pl-4 text-[18px]">
                      {s.priceEur != null ? `${s.priceFrom ? "от " : ""}${formatEuro(s.priceEur)}` : ""}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <Errors list={stepProblems("services")} />
        </section>
      )}

      {step === 1 && (
        <section className="mt-8">
          <h2 className="font-display text-[30px] font-medium">{CAMPAIGN_TEXT.steps[1]}</h2>
          <label className="mt-5 flex min-h-12 cursor-pointer items-start gap-4">
            <input type="checkbox" checked={firstVisit} onChange={(e) => setFirstVisit(e.target.checked)} className="mt-0.5 size-7 shrink-0 accent-primary" />
            <span>
              <span className="block text-[19px] leading-snug">{CAMPAIGN_TEXT.firstVisit}</span>
              <span className="mt-1 block text-[15px] leading-snug text-muted-foreground">{CAMPAIGN_TEXT.firstVisitHelp}</span>
            </span>
          </label>

          <label htmlFor="cmp-slots" className="mt-8 block font-display text-[26px] font-medium">
            {CAMPAIGN_TEXT.slots}
          </label>
          <input
            id="cmp-slots"
            inputMode="numeric"
            value={slots}
            onChange={(e) => setSlots(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className={cn(inputCls, "mt-2")}
            aria-describedby="cmp-slots-help"
          />
          <p id="cmp-slots-help" className="mt-2 text-center text-[15px] text-muted-foreground">
            {CAMPAIGN_TEXT.slotsHelp}
          </p>

          <label htmlFor="cmp-reason" className="mt-8 block font-display text-[26px] font-medium">
            {CAMPAIGN_TEXT.reason}
          </label>
          <div className="relative mt-2">
            <textarea
              id="cmp-reason"
              value={reason}
              onChange={(e) => setReason([...e.target.value].slice(0, REASON_MAX).join(""))}
              placeholder={CAMPAIGN_TEXT.reasonPlaceholder}
              rows={4}
              className="w-full resize-none rounded-2xl border border-input bg-background px-5 pb-10 pt-4 text-[22px] leading-snug outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-describedby="cmp-reason-help"
            />
            <span className="pointer-events-none absolute bottom-3 right-4 text-[17px] text-muted-foreground" aria-hidden>
              {[...reason].length} / {REASON_MAX}
            </span>
          </div>
          <p id="cmp-reason-help" className="mt-3 text-center text-[15px] leading-snug text-muted-foreground">
            {CAMPAIGN_TEXT.reasonHelp}
          </p>
          <Errors list={stepProblems("conditions")} />
        </section>
      )}

      {step === 2 && (
        <section className="mt-8">
          <h2 className="font-display text-[30px] font-medium">{CAMPAIGN_TEXT.steps[2]}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Вид">
            {(["discount", "gift"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => {
                  setKind(k);
                  setProblems([]);
                }}
                className={cn(
                  "h-14 rounded-2xl border text-[19px] transition-colors",
                  kind === k ? "border-foreground bg-foreground font-medium text-background" : "border-border bg-background",
                )}
              >
                {CAMPAIGN_TEXT.kinds[k]}
              </button>
            ))}
          </div>

          {kind === "gift" && (
            <div className="mt-6">
              <label htmlFor="cmp-gift" className="block font-display text-[22px] font-medium">
                {CAMPAIGN_TEXT.gift}
              </label>
              <div className="relative mt-2">
                <input
                  id="cmp-gift"
                  value={gift}
                  onChange={(e) => setGift([...e.target.value].slice(0, GIFT_MAX).join(""))}
                  placeholder={CAMPAIGN_TEXT.giftPlaceholder}
                  className={cn(inputCls, "pr-16")}
                  aria-describedby="cmp-gift-help"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground" aria-hidden>
                  {[...gift].length}/{GIFT_MAX}
                </span>
              </div>
              <p id="cmp-gift-help" className="mt-2 text-[15px] leading-snug text-muted-foreground">
                {CAMPAIGN_TEXT.giftHelp}
              </p>
              <Errors list={stepProblems("price")} />
            </div>
          )}

          {chosen.map((s) => {
            const id = s.serviceItemId;
            const block = blockers.get(id);
            const prev = s.lowest.lowestEur;
            const pctText = pcts[id] ?? (() => {
              const n = parseMoney(prices[id] ?? "");
              return prev != null && n != null ? String(displayPercent(prev, n)) : "";
            })();
            const pctNum = pctText ? Number(pctText) : null;
            const pctBad = pctNum != null && (pctNum < MIN_PERCENT || pctNum > MAX_PERCENT);
            return (
              <div key={id} className="mt-7">
                <h3 className="font-display text-[26px] font-medium leading-tight">{s.name}</h3>
                {block && (
                  <div className="mt-4 rounded-2xl border border-sand-line bg-sand px-5 py-4 text-[19px] leading-snug">
                    <p>{block.text}</p>
                    {block.giftOk && kind === "discount" && (
                      <button
                        type="button"
                        onClick={() => {
                          setKind("gift");
                          setProblems([]);
                        }}
                        className="mt-1 flex min-h-12 items-center text-primary underline underline-offset-4"
                      >
                        Направи подарък
                      </button>
                    )}
                    {kind === "discount" && block.from && block.from > today && (
                      <button
                        type="button"
                        onClick={() => startFrom(block.from!)}
                        className="mt-2 flex min-h-12 items-center text-primary underline underline-offset-4"
                      >
                        Започни от {shortDay(block.from, today)}
                      </button>
                    )}
                  </div>
                )}
                {kind === "discount" && (
                  <>
                    <div className="mt-4 flex items-center gap-6 rounded-2xl bg-secondary px-8 py-4">
                      <Lock className="size-8 shrink-0" strokeWidth={1.6} aria-hidden />
                      <div>
                        <p className="text-[17px] text-muted-foreground">{CAMPAIGN_TEXT.prevPrice}</p>
                        <p className="text-[28px] leading-tight">{prev != null ? formatEuro(prev) : "–"}</p>
                      </div>
                    </div>
                    {!block && <p className="mt-3 text-center text-[16px] leading-snug text-muted-foreground">{CAMPAIGN_TEXT.prevPriceHelp}</p>}
                    <div className={cn("mt-4 grid gap-2", block ? "grid-cols-1" : "grid-cols-2")}>
                      <label className="rounded-2xl border border-input bg-background px-4 pb-3 pt-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                        <span className={cn("block text-[17px] text-muted-foreground", block && "sr-only")}>{CAMPAIGN_TEXT.newPrice}</span>
                        <span className="flex items-baseline">
                          <input
                            inputMode="decimal"
                            value={prices[id] ?? ""}
                            disabled={!!block}
                            placeholder={block ? CAMPAIGN_TEXT.newPrice : undefined}
                            onChange={(e) => {
                              const t = e.target.value.replace(/[^\d.,]/g, "").slice(0, 7);
                              setPrices((x) => ({ ...x, [id]: t }));
                              setProblems([]);
                              setPcts((x) => {
                                const { [id]: _drop, ...rest } = x;
                                return rest;
                              });
                            }}
                            style={block ? undefined : { width: `${Math.max((prices[id] ?? "").length, 1) + 0.6}ch` }}
                            className="w-full min-w-0 bg-transparent text-[28px] outline-none placeholder:text-[22px] placeholder:text-muted-foreground disabled:bg-transparent"
                          />
                          {!block && prices[id] && <span className="text-[28px]">€</span>}
                        </span>
                      </label>
                      {!block && (
                        <label className="rounded-2xl border border-input bg-background px-4 pb-3 pt-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                          <span className="block text-[17px] text-muted-foreground">{CAMPAIGN_TEXT.percent}</span>
                          <span className="flex items-baseline">
                            <input
                              inputMode="numeric"
                              value={pctText}
                              onChange={(e) => {
                                const t = e.target.value.replace(/\D/g, "").slice(0, 2);
                                setPcts((x) => ({ ...x, [id]: t }));
                                setProblems([]);
                                const n = Number(t);
                                if (prev != null && t && n >= MIN_PERCENT && n <= MAX_PERCENT) {
                                  setPrices((x) => ({ ...x, [id]: moneyText(priceFromPercent(prev, n)) }));
                                }
                              }}
                              style={{ width: `${Math.max(pctText.length, 1) + 0.6}ch` }}
                              className="w-full min-w-0 bg-transparent text-[28px] outline-none"
                            />
                            {pctText && <span className="text-[28px]">%</span>}
                          </span>
                        </label>
                      )}
                    </div>
                    {block ? (
                      <p className="mt-3 text-[16px] text-muted-foreground">За да продължиш: избери подарък или друга услуга.</p>
                    ) : (
                      <p className="mt-2 text-[15px] leading-snug text-muted-foreground">{CAMPAIGN_TEXT.priceHelp}</p>
                    )}
                    {pctBad && <p role="alert" className="mt-1 text-[15px] text-destructive">{CAMPAIGN_TEXT.percentRange}</p>}
                  </>
                )}
                <Errors list={stepProblems("price", id).filter((p) => p.text !== block?.text)} />
              </div>
            );
          })}

          {kind === "discount" && blockers.size === 0 && chosen.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-[21px]">{CAMPAIGN_TEXT.previewTitle}</p>
              <p className="font-serif text-[30px] italic leading-tight text-primary">{who}</p>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="mt-8">
          <h2 className="font-display text-[30px] font-medium">{CAMPAIGN_TEXT.steps[3]}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(
              [
                ["cmp-from", CAMPAIGN_TEXT.datesFrom, startsOn, setStartsOn],
                ["cmp-to", CAMPAIGN_TEXT.datesTo, endsOn, setEndsOn],
              ] as const
            ).map(([htmlId, label, value, set]) => (
              <div key={htmlId}>
                <label htmlFor={htmlId} className="block px-1 text-[19px]">
                  {label}
                </label>
                <input
                  id={htmlId}
                  type="date"
                  min={today}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className={cn(inputCls, "mt-1 px-3 text-[18px]")}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[15px] leading-snug text-muted-foreground">{CAMPAIGN_TEXT.datesHelp}</p>
          <Errors list={stepProblems("dates")} />
          <Errors list={problems.filter((p) => p.field === "price")} />
        </section>
      )}

      {step === 4 && (
        <section className="mt-6">
          <h2 className="font-display text-[28px] font-medium leading-tight">{CAMPAIGN_TEXT.previewTitle}</h2>
          <CampaignCard data={card} today={today} className="mt-4" />
          {showConsentLine && (
            <p className="mt-3 text-[15px] leading-snug text-muted-foreground">
              Името ти не е на сайта: няма записано съгласие. Пише „{who}“.
            </p>
          )}
          <Errors list={problems} />
          <p className="mt-4 text-center text-[16px] text-muted-foreground">
            {isOwner ? CAMPAIGN_TEXT.launchOwnHint : CAMPAIGN_TEXT.snezhanaSees}
          </p>
          <button type="button" onClick={send} disabled={busy} className={cn(primaryBtn, "mt-3")}>
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {isOwner ? CAMPAIGN_TEXT.launchOwn : CAMPAIGN_TEXT.sendForApproval}
          </button>
          <button
            type="button"
            onClick={() => go(0)}
            className="mx-auto mt-2 flex h-12 items-center px-3 font-serif text-[22px] text-primary underline underline-offset-4"
          >
            {CAMPAIGN_TEXT.change}
          </button>
        </section>
      )}

      {step < 4 && (
        <button
          type="button"
          onClick={next}
          disabled={busy || (step === 0 && ids.length === 0) || (step === 2 && (blockers.size > 0 || chosen.length === 0))}
          className={cn(primaryBtn, "mt-8")}
        >
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {NEXT[step]}
        </button>
      )}
    </div>
  );
}
