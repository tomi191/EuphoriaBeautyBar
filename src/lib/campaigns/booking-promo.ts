/**
 * Промоциите при записването (№11, част 3; решение 23): коя промоция важи за един час и текстовете за клиента.
 * Без база: фактите (промоциите на специалиста, заетите места, първо ли е посещението) ги подава сървърът
 * (resolveBookingPrice в src/lib/booking/offering.ts). Правилата: доклад 2026-11-24-manager-кампании-правила.md,
 * раздел 4; текстовете: Саиф, 2026-11-24-content-кампании-текстове.md, точка 3.
 */

import { formatEuro } from "@/lib/booking/price";
import { campaignPhase, longDay, type CampaignKind, type CampaignStatus } from "@/lib/campaigns/rules";

export interface PromoFacts {
  id: string;
  kind: CampaignKind;
  status: CampaignStatus;
  startsOn: string;
  endsOn: string;
  slots: number | null;
  firstVisitOnly: boolean;
  gift: string | null;
  services: { serviceItemId: string; newEur: number | null }[];
  /** Заетите места: часовете по промоцията, без отказаните (неявилият се остава); без часа, който се мести. */
  taken: number;
}

export type PromoRefusal = "out_of_range" | "slots" | "not_first" | "ended";

export type PromoOutcome =
  | { state: "none" }
  | {
      state: "applied" | "refused";
      reason?: PromoRefusal;
      campaignId: string;
      kind: CampaignKind;
      serviceItemId: string;
      /** Новата цена на услугата от промоцията (само при намаление). */
      newEur: number | null;
      gift: string | null;
      endsOn: string;
      firstVisitOnly: boolean;
    };

export interface DecideInput {
  promos: PromoFacts[];
  /** Услугите в часа, по реда на избора. */
  serviceItemIds: string[];
  /** Денят на часа (Europe/Sofia, YYYY-MM-DD). */
  day: string;
  /** Денят на записа (днес, Europe/Sofia). */
  today: string;
  /** Първо посещение при този специалист: true / false; null, докато телефонът и имейлът не са въведени. */
  isFirstVisit: boolean | null;
  /** Промоцията от адреса (бутонът на картата): ако вече не тече, клиентът вижда «Промоцията приключи». */
  promoId?: string | null;
}

/**
 * Коя промоция важи за часа. Важи само промоция, която тече в деня на записа (одобрена, днес в периода), и само
 * за час, чийто ден е в периода; час, записан преди началото, остава на редовната цена. Местата и първото
 * посещение се гледат след деня. В един час важи най-много една промоция (часът пази една), първата по реда на
 * услугите. Ако никоя не важи, връща първия отказ (за реда преди бутона).
 */
export function decidePromo(input: DecideInput): PromoOutcome {
  const { promos, serviceItemIds, day, today, isFirstVisit, promoId } = input;
  let refused: PromoOutcome | null = null;
  for (const sid of serviceItemIds) {
    for (const p of promos) {
      const svc = p.services.find((s) => s.serviceItemId === sid);
      if (!svc) continue;
      const base = {
        campaignId: p.id,
        kind: p.kind,
        serviceItemId: sid,
        newEur: p.kind === "discount" ? svc.newEur : null,
        gift: p.kind === "gift" ? p.gift : null,
        endsOn: p.endsOn,
        firstVisitOnly: p.firstVisitOnly,
      };
      const phase = campaignPhase(p, today);
      if (phase !== "running") {
        // Записан преди началото (предстои) или след края: редовна цена. «Приключи» само за промоцията, която клиентът е видял.
        if (!refused && p.id === promoId && (phase === "ended" || phase === "stopped")) refused = { state: "refused", reason: "ended", ...base };
        continue;
      }
      if (p.kind === "discount" && svc.newEur == null) continue;
      let reason: PromoRefusal | null = null;
      if (day < p.startsOn || day > p.endsOn) reason = "out_of_range";
      else if (p.slots != null && p.taken >= p.slots) reason = "slots";
      else if (p.firstVisitOnly && isFirstVisit === false) reason = "not_first";
      if (!reason) return { state: "applied", ...base };
      if (!refused) refused = { state: "refused", reason, ...base };
    }
  }
  return refused ?? { state: "none" };
}

export interface PricedLine {
  serviceItemId: string;
  /** Редовната цена в момента (собствената на специалиста или каталожната), €. */
  regularEur: number | null;
}

/** Сборът (€) с промоцията: намалението е само за услугата от промоцията; null, ако нито една цена не е известна. */
export function promoTotals(lines: PricedLine[], outcome: PromoOutcome): { totalEur: number | null; regularTotalEur: number | null } {
  const sum = (xs: (number | null)[]) => {
    const known = xs.filter((x): x is number => x != null);
    return known.length ? Math.round(known.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  };
  const regular = sum(lines.map((l) => l.regularEur));
  if (outcome.state !== "applied" || outcome.kind !== "discount") return { totalEur: regular, regularTotalEur: regular };
  const total = sum(lines.map((l) => (l.serviceItemId === outcome.serviceItemId ? outcome.newEur : l.regularEur)));
  return { totalEur: total, regularTotalEur: regular };
}

// ── Текстовете (Саиф, точка 3) ──

/** Ред под цената в «Твоят час» (3.5, 3.6, 3.8) или ред преди бутона при отказ (3.9–3.12). */
export function promoNotes(
  o: PromoOutcome,
  opts: { today: string; regularLabel: string; serviceName: string; manyServices: boolean },
): { under: string[]; beforeButton: string | null } {
  if (o.state === "none") return { under: [], beforeButton: null };
  if (o.state === "applied") {
    const under: string[] = [];
    if (o.kind === "discount") under.push(`Цена по промоцията, важи до ${longDay(o.endsOn, opts.today)}.`);
    if (o.kind === "discount" && opts.manyServices) under.push(`Промоцията е за ${opts.serviceName}. Общата сума е с нея.`);
    return { under, beforeButton: null };
  }
  const price = opts.regularLabel;
  switch (o.reason) {
    case "out_of_range":
      return { under: [], beforeButton: `Промоцията е за часове до ${longDay(o.endsOn, opts.today)}. За този ден цената е ${price}.` };
    case "slots":
      return { under: [], beforeButton: `Местата по промоцията свършиха. Цената е ${price}.` };
    case "not_first":
      return { under: [], beforeButton: `Промоцията е за първо посещение. По тези данни такова вече има, затова цената е ${price}.` };
    default:
      return { under: [], beforeButton: `Промоцията приключи. Цената е ${price}.` };
  }
}

/** Ред на екрана «Часът е запазен» (3.13) и в писмото (3.14, 3.15). */
export function promoDoneLine(
  o: PromoOutcome,
  totals: { totalEur: number | null; regularTotalEur: number | null },
  where: "screen" | "email",
): string | null {
  if (o.state !== "applied") return null;
  if (o.kind === "gift") return o.gift ? `Подарък в същия час: ${o.gift}.` : null;
  if (totals.totalEur == null || totals.regularTotalEur == null) return null;
  const head = `Нова цена по промоцията: ${formatEuro(totals.totalEur)} (предишна цена ${formatEuro(totals.regularTotalEur)}).`;
  return where === "screen" ? `${head} Остава в часа ти.` : `${head} Тя остава записана в часа ти, дори промоцията да спре.`;
}

/** Ред в известието до специалиста (Саиф 6.7). */
export function promoStaffLine(o: PromoOutcome, serviceName: string, when: string, totalEur: number | null): string | null {
  if (o.state !== "applied") return null;
  if (o.kind === "gift") return `Нов час по промоцията „${serviceName}“: ${when}, подарък: ${o.gift ?? ""}.`;
  return `Нов час по промоцията „${serviceName}“: ${when}${totalEur != null ? `, нова цена ${formatEuro(totalEur)}` : ""}.`;
}
