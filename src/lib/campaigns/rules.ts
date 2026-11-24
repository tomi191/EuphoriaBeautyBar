/**
 * Промоциите на специалистите (№11, част 1): чистите правила, без база. Проверките по закона се правят САМО на
 * сървъра (src/lib/campaigns/core.ts подава фактите от базата и дневника на цените); браузърът показва същите
 * текстове, но не решава. Правилата: доклад 2026-11-24-manager-кампании-правила.md, раздели 2–4; решения 23 и 24;
 * текстовете: Саиф, 2026-11-24-content-кампании-текстове.md, раздели 4–6.
 *
 * Датите са дни в Europe/Sofia като «YYYY-MM-DD»; смятат се като UTC дни (без часове), за да не играе лятното време.
 */

import { formatEuro } from "@/lib/booking/price";

export const MIN_PERCENT = 10;
export const MAX_PERCENT = 30; // решение 24
export const MAX_DAYS = 30;
export const MAX_SERVICES = 5;
export const GIFT_MAX = 40;
export const REASON_MAX = 60;
export const NOTE_MAX = 60;
export const MAX_PENDING = 2;
export const MAX_ACTIVE = 2;
/** Между края на едно намаление и началото на следващото на същата услуга: 30 пълни дни. */
export const DISCOUNT_PAUSE_DAYS = 30;

export type CampaignKind = "discount" | "gift";
export type CampaignStatus = "pending" | "returned" | "approved" | "stopped";
/** Какво вижда човек: решението плюс датите. */
export type CampaignPhase = "pending" | "expired" | "returned" | "upcoming" | "running" | "ended" | "stopped";

// ── Дати ──

const DAY_MS = 86_400_000;
const toUtc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const isDateStr = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(toUtc(d));
export function addDays(d: string, n: number): string {
  return new Date(toUtc(d) + n * DAY_MS).toISOString().slice(0, 10);
}
/** b − a в дни. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}
/** «15.12» (вътре: приложението, администрацията, Telegram). Годината само ако не е тази на `today`. */
export function shortDay(d: string, today?: string): string {
  const base = `${d.slice(8, 10)}.${d.slice(5, 7)}`;
  return today && today.slice(0, 4) !== d.slice(0, 4) ? `${base}.${d.slice(0, 4)}` : base;
}
const MONTHS = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];
/** «15 декември» (публично). Годината само ако не е тази на `today`. */
export function longDay(d: string, today?: string): string {
  const base = `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}`;
  return today && today.slice(0, 4) !== d.slice(0, 4) ? `${base} ${d.slice(0, 4)}` : base;
}
const daysWord = (n: number) => (n === 1 ? "1 ден" : `${n} дни`);

// ── Статус по дата (при четене, без крон) ──

export function campaignPhase(c: { status: CampaignStatus; startsOn: string; endsOn: string }, today: string): CampaignPhase {
  switch (c.status) {
    case "pending":
      return today > c.endsOn ? "expired" : "pending";
    case "returned":
      return "returned";
    case "stopped":
      return "stopped";
    case "approved":
      if (today < c.startsOn) return "upcoming";
      if (today <= c.endsOn) return "running";
      return "ended";
  }
}

/** Чакаща или одобрена, която не е свършила: заключва цената и заема услугата. */
export const isOpen = (c: { status: CampaignStatus; endsOn: string }, today: string) =>
  (c.status === "pending" || c.status === "approved") && today <= c.endsOn;

/**
 * Последният ден, в който намалението е текло (за паузата от 30 дни): краят, или денят на спирането, ако е
 * спряна, докато тече. null = не е текла (чакаща, върната, спряна преди началото).
 */
export function discountRanUntil(
  c: { kind: CampaignKind; status: CampaignStatus; startsOn: string; endsOn: string; stoppedOn?: string | null },
  today: string,
): string | null {
  if (c.kind !== "discount") return null;
  if (c.status === "approved") return today < c.startsOn ? null : c.endsOn < today ? c.endsOn : today;
  if (c.status === "stopped" && c.stoppedOn && c.stoppedOn >= c.startsOn) return c.stoppedOn < c.endsOn ? c.stoppedOn : c.endsOn;
  return null;
}

// ── Цената ──

const round2 = (v: number) => Math.round(v * 100) / 100;
/** Процентът на картата: цял, закръглен надолу, никога нагоре. */
export function displayPercent(prev: number, next: number): number {
  return Math.floor(((prev - next) / prev) * 100 + 1e-9);
}
/** Новата цена от процент (за полето «Процент»). */
export const priceFromPercent = (prev: number, pct: number) => round2(prev * (1 - pct / 100));
/** Границите на новата цена: от −30% до −10% (до цент, навътре). */
export function priceBounds(prev: number): { min: number; max: number } {
  return {
    min: Math.ceil(round2(prev * (1 - MAX_PERCENT / 100)) * 100 - 1e-6) / 100,
    max: Math.floor(round2(prev * (1 - MIN_PERCENT / 100)) * 100 + 1e-6) / 100,
  };
}
export function priceInBounds(prev: number, next: number): boolean {
  const { min, max } = priceBounds(prev);
  return next >= min - 1e-9 && next <= max + 1e-9;
}

// ── Текстовете (Саиф, раздел 4) ──

export const CAMPAIGN_TEXT = {
  sectionName: "Промоции",
  empty: "Още нямаш промоции.",
  emptyHint: "Пусни първата за услуга, която искаш да запълниш.",
  newButton: "Нова промоция",
  steps: ["Услуги", "Условия", "Цената", "Датите", "Преглед"] as const,
  servicesHelp: "Избери от 1 до 5 свои услуги с онлайн запис.",
  kinds: { discount: "Намаление", gift: "Подарък" } as const,
  prevPrice: "Предишна цена",
  prevPriceHelp: "Най-ниската ти цена за последните 30 дни. Смята я системата.",
  newPrice: "Нова цена",
  percent: "Процент",
  priceHelp: "Пишеш едното, другото се смята само. От 10% до 30%.",
  percentRange: "Процентът е от 10 до 30.",
  gift: "Подарък",
  giftPlaceholder: "напр. парафинова терапия",
  giftHelp: "Какво получава клиентът в същия час. До 40 знака. Не удължава часа.",
  giftBad: "Подаръкът се описва с думи: без сума, без „на стойност“ и без „безплатно“.",
  giftLong: "Подаръкът е до 40 знака.",
  giftEmpty: "Напиши какво получава клиентът.",
  firstVisit: "Само за първо посещение при мен",
  firstVisitHelp: "За клиент без предишен час при теб. Проверява се по телефона или имейла.",
  slots: "Места",
  slotsHelp: "Колко часа най-много по тази цена. Празно значи без лимит.",
  slotsBad: "Местата са от 1 нагоре.",
  reason: "Защо",
  reasonHelp: "По желание, до 60 знака: истинската причина с една фраза.",
  reasonPlaceholder: "напр. Нов сезон, нови цветове",
  reasonLong: "Причината е до 60 знака.",
  datesFrom: "От",
  datesTo: "До",
  datesHelp: "Изчезва от сайта в 23:59 на последния ден. Краят не се мести.",
  endBeforeStart: "Краят трябва да е след началото.",
  startPast: "Началото не може да е в миналото.",
  noWorkDay: "В тези дати не работиш. Избери ден, в който приемаш часове.",
  previewTitle: "Така ще излезе на сайта",
  sendForApproval: "Изпрати за одобрение",
  launchOwn: "Пусни промоцията",
  launchOwnHint: "Твоите промоции тръгват без одобрение.",
  sentScreen: "Изпратена. Снежана ще я види и ще получиш отговор в Telegram и тук.",
  sentToast: "Изпратена за одобрение.",
  snezhanaSees: "Снежана я вижда, преди да излезе.",
  change: "Промени",
  servicesNone: "Избери поне една услуга.",
  servicesTooMany: "Най-много 5 услуги в една промоция.",
  priceFromOnly: "Цената е „от“, затова крайната сума не е известна. За тази услуга има само подарък.",
  noOnline: "Услугата е без онлайн запис. Включи го от «Услуги», за да я добавиш.",
  pendingLimit: "Имаш 2 промоции, които чакат одобрение. Изчакай отговор.",
  activeLimit: "Имаш 2 одобрени или течащи промоции. Спри една, за да пуснеш нова.",
  locked: (until: string) => `Цената е заключена до ${until}: има промоция.`,
  lockedStop: "Спри промоцията",
  returnedFix: "Поправи и изпрати пак",
  stop: "Спри промоцията",
  stopTitle: "Да спрем ли промоцията?",
  stopText: "Сайтът я маха веднага. Часовете, записани по нея, пазят цената си.",
  stopWhy: "Защо я спираш?",
  stopKeep: "Не, остави я",
  stopDone: "Промоцията е спряна.",
  stopKeepsPrice: "Записаните часове пазят цената си.",
  stopOtherEmpty: "Напиши причината.",
  noEdit: "Одобрената промоция не се сменя: спираш я и пускаш нова. Краят не се мести.",
} as const;

export const STOP_REASONS = [
  { key: "wrong_price", label: "Грешна цена" },
  { key: "wrong_text", label: "Грешен текст" },
  { key: "cannot_take", label: "Не мога да приемам часове" },
  { key: "other", label: "Друго" },
] as const;
export type StopReasonKey = (typeof STOP_REASONS)[number]["key"];

export const RETURN_REASONS = [
  { key: "price", label: "Цената", because: "цената" },
  { key: "text", label: "Текстът", because: "текста" },
  { key: "dates", label: "Датите", because: "датите" },
  { key: "other", label: "Друго", because: "" },
] as const;
export type ReturnReasonKey = (typeof RETURN_REASONS)[number]["key"];

export const PHASE_LABEL: Record<CampaignPhase, string> = {
  pending: "Чака одобрение",
  returned: "Върната",
  upcoming: "Предстои",
  running: "Тече",
  ended: "Свършила",
  stopped: "Спряна",
  expired: "Изтекла",
};

/** Редът под името на върнатата (Саиф 4.54–4.57). */
export function returnedLine(reason: ReturnReasonKey | null, note: string | null): string {
  if (reason === "other" || !reason) return `Върната: ${note ?? ""}`.trim();
  return `Върната заради ${RETURN_REASONS.find((r) => r.key === reason)!.because}.`;
}

export function stopReasonText(key: string | null, note: string | null): string {
  if (key === "other") return note ?? "друго";
  if (key === "system_hidden") return "услугата вече не е в онлайн записването";
  if (key === "system_ended") return "сътрудничеството приключи";
  if (key === "system_paused") return "специалистът е скрит от сайта";
  const r = STOP_REASONS.find((s) => s.key === key);
  return r ? r.label.toLowerCase() : (note ?? "");
}

// ── «При кого» (решение 9 и 21: наемател с име само със съгласие) ──

const KIND_WORD: Record<string, string> = { nails: "маникюр", cosmetics: "козметика", hair: "коса" };
/** «при Снежана», «при Виолета» (със съгласие) или «при специалиста по маникюр». */
export function whoLabel(p: { name: string; kind: string; isOwner: boolean; hasConsent: boolean }): string {
  if (p.isOwner || p.hasConsent) return `при ${p.name.trim().split(/\s+/)[0]}`;
  return `при специалиста по ${KIND_WORD[p.kind] ?? "красота"}`;
}
export const kindWord = (kind: string) => KIND_WORD[kind] ?? "красота";

// ── Проверките ──

export type ProblemField = "services" | "conditions" | "price" | "dates" | "limits";
export interface Problem {
  field: ProblemField;
  /** За коя услуга е (при «Услуги» и «Цената»). */
  serviceItemId?: string;
  text: string;
  /** От коя дата ще може (YYYY-MM-DD), ако е известна. */
  from?: string | null;
  /** «Направи подарък» (Саиф 4.44): намаление не може, подарък може сега. */
  giftOk?: boolean;
}

/** Фактите за една услуга, които сървърът събира от базата и дневника на цените. */
export interface ServiceFacts {
  serviceItemId: string;
  name: string;
  /** Предлага я и е с онлайн запис. */
  offered: boolean;
  onlineBookable: boolean;
  /** Цената сега, в €. */
  priceEur: number | null;
  priceFrom: boolean;
  priceMax: number | null;
  /** Друга отворена промоция на услугата (чакаща или одобрена, която не е свършила): краят ѝ. */
  openCampaignUntil: string | null;
  /** Последният ден, в който е текло намаление на услугата (за паузата). */
  lastDiscountRanUntil: string | null;
  /** От дневника на цените (lowestPriceLast30Days към началото на промоцията). */
  lowest: {
    lowestEur: number | null;
    discountAllowed: boolean;
    discountAllowedFrom: string | null; // YYYY-MM-DD
    reason: "ok" | "changed_recently" | "history_short" | "price_not_fixed" | "no_data";
    lastChangeOn: string | null; // YYYY-MM-DD
    createdOn: string | null; // кога е добавена при специалиста
  };
  /** Последното вдигане на цената в 30-те дни (подаръкът). */
  lastRaiseOn: string | null;
}

export interface CampaignInput {
  kind: CampaignKind;
  serviceItemIds: string[];
  /** Нова цена в € по услуга (при намаление). */
  newPrices: Record<string, number | null | undefined>;
  gift: string | null;
  reason: string | null;
  startsOn: string;
  endsOn: string;
  slots: number | null;
  firstVisitOnly: boolean;
}

export interface CheckContext {
  today: string;
  services: ServiceFacts[];
  /** Чакащите и одобрените, които не са свършили, без тази. */
  pendingCount: number;
  activeCount: number;
  /** Има ли поне един работен ден на специалиста в периода. */
  hasWorkDay: boolean;
  /** При одобрение: срокът може да е почнал; лимитите не се броят наново. */
  forApproval?: boolean;
}

export const giftTextBad = (g: string) => /\d\s*(€|лв|евро|eur)|стойност|безплат|free/i.test(g);

/** Проверката за услуга и вид: намалението и подаръкът (Саиф 4.44–4.50). */
export function serviceProblem(kind: CampaignKind, s: ServiceFacts, startsOn: string, today: string): Problem | null {
  const P = (text: string, extra: Partial<Problem> = {}): Problem => ({ field: "price", serviceItemId: s.serviceItemId, text, ...extra });
  if (kind === "gift") {
    if (s.lastRaiseOn) {
      const from = addDays(s.lastRaiseOn, DISCOUNT_PAUSE_DAYS + 1);
      if (startsOn < from) {
        return P(`Цената е вдигната преди ${daysWord(Math.max(diffDays(s.lastRaiseOn, today), 0))}. Подарък може от ${shortDay(from, today)}.`, { from });
      }
    }
    return null;
  }
  // Намаление
  if (s.priceFrom || (s.priceMax != null && s.priceEur != null && s.priceMax > s.priceEur) || s.lowest.reason === "price_not_fixed") {
    return P(CAMPAIGN_TEXT.priceFromOnly, { giftOk: true });
  }
  if (s.lastDiscountRanUntil) {
    const from = addDays(s.lastDiscountRanUntil, DISCOUNT_PAUSE_DAYS + 1);
    if (startsOn < from) {
      return P(`Между две намаления на една услуга минават 30 дни. Следващо: от ${shortDay(from, today)}. Подарък може сега.`, { from, giftOk: true });
    }
  }
  if (!s.lowest.discountAllowed || s.lowest.lowestEur == null) {
    const from = s.lowest.discountAllowedFrom;
    const fromText = from ? shortDay(from, today) : null;
    const isNew = s.lowest.createdOn != null && s.lowest.createdOn === s.lowest.lastChangeOn;
    const ago = s.lowest.lastChangeOn ? daysWord(Math.max(diffDays(s.lowest.lastChangeOn, today), 0)) : null;
    if (ago && fromText) {
      return P(
        isNew
          ? `Услугата е добавена преди ${ago}. Намаление може от ${fromText}, подарък може сега.`
          : `Цената е сменена преди ${ago}. Намаление може от ${fromText}, подарък може сега.`,
        { from, giftOk: true },
      );
    }
    return P(
      fromText
        ? `Дневникът на цените още няма 30 дни. Намаление може от ${fromText}, подарък може сега.`
        : "Предишната цена не може да се смята. Подарък може сега.",
      { from, giftOk: true },
    );
  }
  return null;
}

/** Всички проверки по закона и по правилата на салона. Празен списък = минава. */
export function checkCampaign(input: CampaignInput, ctx: CheckContext): Problem[] {
  const out: Problem[] = [];
  const { today } = ctx;
  const ids = [...new Set(input.serviceItemIds)];

  // Лимитите на специалиста (при одобрение не се броят наново: решени са при изпращането).
  if (!ctx.forApproval) {
    if (ctx.pendingCount >= MAX_PENDING) out.push({ field: "limits", text: CAMPAIGN_TEXT.pendingLimit });
    if (ctx.activeCount >= MAX_ACTIVE) out.push({ field: "limits", text: CAMPAIGN_TEXT.activeLimit });
  }

  // Услугите
  if (ids.length === 0) out.push({ field: "services", text: CAMPAIGN_TEXT.servicesNone });
  if (ids.length > MAX_SERVICES) out.push({ field: "services", text: CAMPAIGN_TEXT.servicesTooMany });
  const byId = new Map(ctx.services.map((s) => [s.serviceItemId, s]));
  for (const id of ids) {
    const s = byId.get(id);
    if (!s || !s.offered) {
      out.push({ field: "services", serviceItemId: id, text: "Услугата не е сред твоите." });
      continue;
    }
    if (!s.onlineBookable) out.push({ field: "services", serviceItemId: id, text: CAMPAIGN_TEXT.noOnline });
    if (s.openCampaignUntil) {
      out.push({ field: "services", serviceItemId: id, text: `Тази услуга вече има промоция до ${shortDay(s.openCampaignUntil, today)}.` });
    }
  }

  // Условията
  if (input.slots != null && (!Number.isInteger(input.slots) || input.slots < 1)) {
    out.push({ field: "conditions", text: CAMPAIGN_TEXT.slotsBad });
  }
  if (input.reason && [...input.reason].length > REASON_MAX) out.push({ field: "conditions", text: CAMPAIGN_TEXT.reasonLong });

  // Цената
  if (input.kind === "gift") {
    const g = (input.gift ?? "").trim();
    if (!g) out.push({ field: "price", text: CAMPAIGN_TEXT.giftEmpty });
    else if ([...g].length > GIFT_MAX) out.push({ field: "price", text: CAMPAIGN_TEXT.giftLong });
    else if (giftTextBad(g)) out.push({ field: "price", text: CAMPAIGN_TEXT.giftBad });
  }
  if (isDateStr(input.startsOn)) {
    for (const id of ids) {
      const s = byId.get(id);
      if (!s || !s.offered) continue;
      const p = serviceProblem(input.kind, s, input.startsOn, today);
      if (p) {
        out.push(p);
        continue;
      }
      if (input.kind === "discount") {
        const prev = s.lowest.lowestEur!;
        const next = input.newPrices[id];
        if (next == null || !Number.isFinite(next)) {
          out.push({ field: "price", serviceItemId: id, text: "Напиши новата цена или процента." });
        } else if (!priceInBounds(prev, next)) {
          const { min, max } = priceBounds(prev);
          out.push({
            field: "price",
            serviceItemId: id,
            text: `За ${formatEuro(prev)} новата цена е от ${formatEuro(min)} до ${formatEuro(max)}.`,
          });
        }
      }
    }
  }

  // Датите
  if (!isDateStr(input.startsOn) || !isDateStr(input.endsOn)) {
    out.push({ field: "dates", text: "Избери началото и края." });
  } else {
    if (!ctx.forApproval && input.startsOn < today) out.push({ field: "dates", text: CAMPAIGN_TEXT.startPast });
    if (input.endsOn < input.startsOn) out.push({ field: "dates", text: CAMPAIGN_TEXT.endBeforeStart });
    else if (diffDays(input.startsOn, input.endsOn) + 1 > MAX_DAYS) {
      out.push({
        field: "dates",
        text: `Промоцията е най-много 30 дни. Последната дата е ${shortDay(addDays(input.startsOn, MAX_DAYS - 1), today)}.`,
      });
    } else if (!ctx.hasWorkDay) out.push({ field: "dates", text: CAMPAIGN_TEXT.noWorkDay });
    if (ctx.forApproval && input.endsOn < today) out.push({ field: "dates", text: "Срокът на промоцията мина." });
  }
  return out;
}

/** Проверката, която видя Снежана (Саиф 5.1, 5.2, 5.10). */
export function checkPassedLine(
  c: { kind: CampaignKind; startsOn: string; endsOn: string },
  prevEur: number | null,
  where: "telegram" | "admin",
): string {
  const days = daysWord(diffDays(c.startsOn, c.endsOn) + 1);
  if (c.kind === "gift") {
    return where === "telegram"
      ? `Проверката мина: цената не е вдигана 30 дни, срокът е ${days}.`
      : `Проверка: цената не е вдигана 30 дни, срокът е ${days}.`;
  }
  return where === "telegram"
    ? `Проверката мина: предишната цена е най-ниската за 30 дни, срокът е ${days}.`
    : `Проверка: предишната цена е най-ниската за 30 дни${prevEur != null ? ` (${formatEuro(prevEur)})` : ""}, срокът е ${days}.`;
}
