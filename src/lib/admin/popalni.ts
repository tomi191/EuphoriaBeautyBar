import { db } from "@/lib/db";
import { adminResourceUserIds, getConsentMap, type ConsentMap } from "@/lib/data/tenant-consent";

/**
 * «Какво да попълниш» (визия №45, решение 45). Липсите се смятат при всяко четене от сегашните
 * данни, без своя таблица: (1) специалист под наем без снимка или без отбелязано писмено
 * съгласие (Снежана не); (2) активна услуга без цена или без продължителност, в каталога и при
 * специалиста; (3) активен специалист под наем без свое работно време. Всеки ред води направо
 * към мястото, където се попълва.
 */
export type PopalniIcon = "price" | "camera" | "consent" | "clock";
export type StaffTab = "services" | "hours" | "profile";

export interface PopalniRow {
  key: string;
  icon: PopalniIcon;
  title: string;
  /** Изречението под заглавието в картата. */
  detail: string;
  /** Къде води реда (за камбанката, «Отваря …»). */
  place: string;
  href: string;
  /** Надписът на бутона в картата. */
  action: string;
  /** Надписът на бутона в Telegram. */
  tgLabel: string;
  /** Кой раздел от долното меню на приложението свети с точка. */
  tab?: StaffTab;
}

export interface PopalniData {
  resources: { id: string; name: string; active: boolean; image: string | null; userId: string | null }[];
  adminUserIds: Set<string>;
  consent: ConsentMap;
  /** Услугите от каталога в активни категории. */
  catalog: { id: string; name: string; categoryId: string; price: number; durationMin: number }[];
  /** Включените услуги на специалистите («Предлагам»). */
  offers: { resourceId: string; serviceName: string; price: number; durationMin: number }[];
  /** Редовете със свое работно време. */
  ownHours: { resourceId: string; closed: boolean; openTime: string | null; closeTime: string | null }[];
}

/** Без цена = 0 или по-малко (формите искат над 0); без продължителност = под 5 мин (формите искат поне 5). */
const noPrice = (p: number) => !(p > 0);
const noDuration = (m: number) => !(m >= 5);

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** «А», «А и Б», «А, Б и още 3». */
function names(list: string[], max = 2): string {
  if (list.length <= max) return list.length === 2 ? `${list[0]} и ${list[1]}` : list.join(", ");
  return `${list.slice(0, max).join(", ")} и още ${list.length - max}`;
}

function missingWhat(price: boolean, duration: boolean): string {
  if (price && duration) return "без цена или продължителност";
  return price ? "без цена" : "без продължителност";
}

const isTenant = (r: { userId: string | null }, adminIds: Set<string>) => !(r.userId && adminIds.has(r.userId));

function hasOwnHours(d: PopalniData, resourceId: string): boolean {
  return d.ownHours.some((w) => w.resourceId === resourceId && !w.closed && !!w.openTime && !!w.closeTime);
}

/** Всички липси, за Снежана: картата в «Табло», камбанката и Telegram. */
export function adminPopalni(d: PopalniData): PopalniRow[] {
  const rows: PopalniRow[] = [];
  const active = d.resources.filter((r) => r.active);
  const tenants = active.filter((r) => isTenant(r, d.adminUserIds));
  const byId = new Map(d.resources.map((r) => [r.id, r]));

  const cat = d.catalog.filter((i) => noPrice(i.price) || noDuration(i.durationMin));
  if (cat.length) {
    const first = cat[0];
    rows.push({
      key: "catalog",
      icon: "price",
      title: `${count(cat.length, "услуга", "услуги")} ${missingWhat(cat.some((i) => noPrice(i.price)), cat.some((i) => noDuration(i.durationMin)))}`,
      detail: `${names(cat.map((i) => `«${i.name}»`))} в «Услуги и цени».`,
      place: "Отваря услугата в «Услуги и цени»",
      href: `/admin/services/${first.categoryId}?edit=${first.id}`,
      action: "Попълни",
      tgLabel: "Цени на услугите",
    });
  }

  const activeIds = new Set(active.map((r) => r.id));
  const offers = d.offers.filter((o) => activeIds.has(o.resourceId) && (noPrice(o.price) || noDuration(o.durationMin)));
  if (offers.length) {
    const first = byId.get(offers[0].resourceId)!;
    const own = !isTenant(first, d.adminUserIds);
    rows.push({
      key: "offers",
      icon: "price",
      title: `${count(offers.length, "услуга", "услуги")} на специалист ${missingWhat(offers.some((o) => noPrice(o.price)), offers.some((o) => noDuration(o.durationMin)))}`,
      detail: `${names(offers.map((o) => `${byId.get(o.resourceId)!.name}: «${o.serviceName}»`), 1)}. Попълва се в приложението, в «Услуги».`,
      place: own ? "Отваря «Услуги» в приложението" : "Отваря «Изпълнители»",
      href: own ? "/staff/services" : `/admin/resources#r-${first.id}`,
      action: "Попълни",
      tgLabel: "Услуги на специалистите",
    });
  }

  const noPhoto = tenants.filter((r) => !r.image);
  if (noPhoto.length) {
    rows.push({
      key: "photo",
      icon: "camera",
      title: `${count(noPhoto.length, "специалист", "специалиста")} без снимка`,
      detail: `${names(noPhoto.map((r) => r.name))} ${noPhoto.length === 1 ? "стои" : "стоят"} в «За нас» без снимка.`,
      place: "Отваря «Изпълнители»",
      href: `/admin/resources?edit=${noPhoto[0].id}`,
      action: "Попълни",
      tgLabel: "Снимки на специалистите",
    });
  }

  const noConsent = tenants.filter((r) => !d.consent[r.id]);
  if (noConsent.length) {
    rows.push({
      key: "consent",
      icon: "consent",
      title: `${count(noConsent.length, "специалист", "специалиста")} без писмено съгласие`,
      detail: `${names(noConsent.map((r) => r.name))} ${noConsent.length === 1 ? "стои" : "стоят"} в «За нас» без име и снимка, докато не го отбележиш.`,
      place: "Отваря «Изпълнители»",
      href: `/admin/resources?edit=${noConsent[0].id}`,
      action: "Попълни",
      tgLabel: "Писмено съгласие",
    });
  }

  const noHours = tenants.filter((r) => !hasOwnHours(d, r.id));
  if (noHours.length) {
    rows.push({
      key: "hours",
      icon: "clock",
      title: `${count(noHours.length, "специалист", "специалиста")} без работно време`,
      detail: `${names(noHours.map((r) => r.name))}: онлайн часовете са по работното време на салона. Попълва се в приложението, в «Часове».`,
      place: "Отваря «Изпълнители»",
      href: `/admin/resources#r-${noHours[0].id}`,
      action: "Попълни",
      tgLabel: "Работно време",
    });
  }
  return rows;
}

/** Само липсите на един специалист: картата в «Твоят ден» и точките в долното меню. */
export function staffPopalni(d: PopalniData, resourceId: string): PopalniRow[] {
  const r = d.resources.find((x) => x.id === resourceId);
  if (!r) return [];
  const rows: PopalniRow[] = [];
  const tenant = isTenant(r, d.adminUserIds);

  const mine = d.offers.filter((o) => o.resourceId === resourceId && (noPrice(o.price) || noDuration(o.durationMin)));
  const what = (o: (typeof mine)[number]) =>
    noPrice(o.price) && noDuration(o.durationMin) ? "Няма цена и продължителност." : noPrice(o.price) ? "Няма цена." : "Няма продължителност.";
  if (mine.length > 2) {
    rows.push({
      key: "services",
      icon: "price",
      title: `${mine.length} услуги ${missingWhat(mine.some((o) => noPrice(o.price)), mine.some((o) => noDuration(o.durationMin)))}`,
      detail: `${names(mine.map((o) => `«${o.serviceName}»`))}.`,
      place: "Отваря «Услуги»",
      href: "/staff/services",
      action: "Попълни",
      tgLabel: "Услуги",
      tab: "services",
    });
  } else {
    mine.forEach((o, i) =>
      rows.push({
        key: `service-${i}`,
        icon: "price",
        title: o.serviceName,
        detail: `${what(o)} Попълва се в «Услуги».`,
        place: "Отваря «Услуги»",
        href: "/staff/services",
        action: "Попълни",
        tgLabel: "Услуги",
        tab: "services",
      }),
    );
  }

  if (tenant && !r.image) {
    rows.push({
      key: "photo",
      icon: "camera",
      title: "Снимка в профила",
      detail: "Клиентките те виждат в «За нас» без снимка.",
      place: "Отваря «Профил»",
      href: "/staff/profile",
      action: "Добави",
      tgLabel: "Снимка",
      tab: "profile",
    });
  }

  if (tenant && !hasOwnHours(d, r.id)) {
    rows.push({
      key: "hours",
      icon: "clock",
      title: "Работно време",
      detail: "Без него онлайн часовете ти са по работното време на салона.",
      place: "Отваря «Часове»",
      href: "/staff/hours",
      action: "Попълни",
      tgLabel: "Работно време",
      tab: "hours",
    });
  }
  return rows;
}

/** Кои раздели от долното меню светят с червена точка. */
export function staffDots(rows: PopalniRow[]): StaffTab[] {
  return [...new Set(rows.flatMap((r) => (r.tab ? [r.tab] : [])))];
}

/** Чете сегашните данни (без запис). */
export async function loadPopalniData(): Promise<PopalniData> {
  const [resources, adminUserIds, consent, categories, items, offers, ownHours] = await Promise.all([
    db.query.resources.findMany({
      orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.name)],
      columns: { id: true, name: true, active: true, image: true, userId: true },
    }),
    adminResourceUserIds(),
    getConsentMap(),
    db.query.serviceCategories.findMany({ where: (c, { eq }) => eq(c.active, true), columns: { id: true, sortOrder: true } }),
    db.query.serviceItems.findMany({
      orderBy: (i, { asc }) => [asc(i.sortOrder)],
      columns: { id: true, name: true, categoryId: true, price: true, durationMin: true },
    }),
    db.query.resourceServices.findMany({
      where: (rs, { eq }) => eq(rs.active, true),
      columns: { resourceId: true, serviceItemId: true, price: true, durationMin: true },
    }),
    db.query.resourceWorkingHours.findMany({ columns: { resourceId: true, closed: true, openTime: true, closeTime: true } }),
  ]);
  const activeCats = new Set(categories.map((c) => c.id));
  const itemName = new Map(items.map((i) => [i.id, i.name]));
  return {
    resources,
    adminUserIds,
    consent,
    catalog: items.filter((i) => activeCats.has(i.categoryId)),
    offers: offers.map((o) => ({ resourceId: o.resourceId, serviceName: itemName.get(o.serviceItemId) ?? "Услуга", price: o.price, durationMin: o.durationMin })),
    ownHours,
  };
}

/** Текстът и бутоните за Telegram (адресите са цели, бутонът ги отваря в браузъра). */
export function popalniTelegram(rows: PopalniRow[], siteUrl: string): { text: string; keyboard: { inline_keyboard: { text: string; url: string }[][] } } {
  const text = [
    "<b>Какво да попълниш на сайта</b>",
    "",
    ...rows.map((r) => `• ${r.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}`),
    "",
    "Бутоните отварят мястото, където се попълва. Пиша ти всеки ден в 10:00, докато нещо липсва.",
  ].join("\n");
  const base = siteUrl.replace(/\/$/, "");
  return { text, keyboard: { inline_keyboard: rows.map((r) => [{ text: r.tgLabel, url: `${base}${r.href}` }]) } };
}

/** Часът в София (0–23) за даден момент. */
export function sofiaHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", hourCycle: "h23" }).format(now));
}

/**
 * Дневното съобщение в 10:00 Europe/Sofia. Vercel cron е в UTC: пуска се в 07:00 и в 08:00 UTC
 * (10:00 лятно и зимно време); праща само пускането, при което в София е 10 ч, затова идва
 * веднъж на ден. Без липси или без вързан админ канал не праща нищо (тогава остава камбанката).
 */
export async function runPopalniCron(
  now: Date,
  deps: { load: () => Promise<PopalniData>; send: (text: string, keyboard: ReturnType<typeof popalniTelegram>["keyboard"]) => Promise<boolean>; siteUrl: string },
): Promise<{ sent: boolean; reason: "not-10" | "nothing-missing" | "sent" | "not-linked"; rows: number }> {
  if (sofiaHour(now) !== 10) return { sent: false, reason: "not-10", rows: 0 };
  const rows = adminPopalni(await deps.load());
  if (rows.length === 0) return { sent: false, reason: "nothing-missing", rows: 0 };
  const { text, keyboard } = popalniTelegram(rows, deps.siteUrl);
  const ok = await deps.send(text, keyboard);
  return { sent: ok, reason: ok ? "sent" : "not-linked", rows: rows.length };
}

/** Точките в долното меню на приложението за един специалист. */
export async function loadStaffDots(resourceId: string): Promise<StaffTab[]> {
  return staffDots(staffPopalni(await loadPopalniData(), resourceId));
}
