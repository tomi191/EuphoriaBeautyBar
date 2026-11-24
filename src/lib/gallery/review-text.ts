// Текстовете и датите в одобрението при Снежана (№8 В3): администрацията и Telegram.
// Без сървърни зависимости: ползва се и от клиентските компоненти. Текстовете са на Саиф
// (доклад 2026-11-22-content-снимки-от-приложението.md, част 3).

/** Готовите причини за връщане: хапчето (2–3 думи) и изречението, което вижда специалистът. */
export const REJECT_REASONS = [
  { label: "Размазана или тъмна", text: "Снимката е размазана или тъмна. Снимай я пак на светло." },
  { label: "Вижда се лице", text: "Вижда се лице на клиент. Снимай така, че лицето да не влиза в кадър." },
  { label: "Работата не личи", text: "Работата не се вижда добре. Снимай по-отблизо." },
  { label: "Неподреден фон", text: "Фонът пречи. Подреди го или смени ъгъла и снимай пак." },
] as const;

export const REVIEW_TEXT = {
  approved: "Одобрена. Вече е в галерията на сайта.",
  rejected: "Върната. Специалистът ще види причината.",
  noFace: "Лицето не се вижда",
  noNote: "Няма думи за снимката. Добави какво се вижда.",
  altSaved: "Описанието е запазено.",
  altEmpty: "Описанието не може да е празно. Върнахме предложеното.",
  bellTitle: "Нова снимка чака одобрение",
  tgNew: "Нова снимка за галерията",
  tgApproved: "Одобрена. Излиза в галерията.",
  tgWhy: "Защо я връщаш?",
} as const;

const dayMonth = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "numeric", month: "long" });
const hourMin = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false });
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" });

/** «21 ноември» (без «г.»). */
export function reviewDay(at: Date): string {
  return dayMonth.format(at).replace(/\s*г\.$/, "");
}

/** «днес» / «вчера» / «19 ноември» по часа в София. */
function relDay(at: Date, now: Date): string {
  const d = ymd.format(at);
  if (d === ymd.format(now)) return "днес";
  if (d === ymd.format(new Date(now.getTime() - 86400000))) return "вчера";
  return reviewDay(at);
}

/** «днес, 15:40» · «вчера, 18:25» · «19 ноември, 18:25» (картата в администрацията). */
export function uploadedWhen(at: Date, now: Date = new Date()): string {
  return `${relDay(at, now)}, ${hourMin.format(at)}`;
}

/** «днес в 15:40» (третият ред на съобщението в Telegram). */
export function uploadedWhenTg(at: Date, now: Date = new Date()): string {
  return `${relDay(at, now)} в ${hourMin.format(at)}`;
}

/** «3 чакат» / «1 чака». */
export function pendingCount(n: number): string {
  return n === 1 ? "1 чака" : `${n} чакат`;
}

/** «4 снимки от специалистите» / «1 снимка от специалистите». */
export function approvedCount(n: number): string {
  return n === 1 ? "1 снимка от специалистите" : `${n} снимки от специалистите`;
}

/** Данните в бутоните на Telegram (до 64 байта): gal:<действие>:<id>[:<причина>]. */
export type GalleryCallback =
  | { action: "ok" | "rj" | "bk"; id: string }
  | { action: "rr"; id: string; reason: number };

export function parseGalleryCallback(data: string | undefined): GalleryCallback | null {
  const m = (data ?? "").match(/^gal:(ok|rj|bk|rr):([A-Za-z0-9_-]{1,40})(?::(\d))?$/);
  if (!m) return null;
  const [, action, id, r] = m;
  if (action === "rr") {
    const reason = Number(r);
    if (r === undefined || !(reason >= 0 && reason < REJECT_REASONS.length)) return null;
    return { action, id, reason };
  }
  if (r !== undefined) return null;
  return { action: action as "ok" | "rj" | "bk", id };
}
