/**
 * Описанието (alt) на снимка от специалист, по правилото на Саиф
 * (доклад 2026-11-22-content-снимки-от-приложението, част 4.1). Чиста функция.
 * 1. Услугата: без скобите и текста в тях; над 55 знака се реже на последната цяла дума.
 * 2. Думите на специалиста: без линкове, @ и # с думата след тях, числа от 6 цифри нагоре, емоджи;
 *    свити интервали, без точка, запетая и тире в края, първата буква малка (освен при съкращение).
 * 3. «{услуга}: {думи}»; без думи «{услуга}: готова работа от {ден} {месец}» (годината само ако не е текущата).
 * 4. Същото описание вече е в галерията → «, кадър 2», «, кадър 3»…
 * 5. Таван 125 знака: режат се думите (никога услугата и «, кадър N»), на цяла дума, без многоточие.
 * Без «Euphoria» и «Варна» (част 4.1, т. 7) и без имена: пише се само каквото е известно.
 */
export const ALT_MAX = 125;
const SERVICE_MAX = 55;
const MONTHS = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];

const len = (s: string) => [...s].length;

/** Реже на последната цяла дума, така че да е до max знака. */
function cutToWord(s: string, max: number): string {
  if (len(s) <= max) return s;
  const chars = [...s].slice(0, max + 1).join("");
  const at = chars.lastIndexOf(" ");
  const cut = at > 0 ? chars.slice(0, at) : [...s].slice(0, max).join("");
  return cut.replace(/[\s,.;:–—-]+$/u, "");
}

export function cleanServiceName(name: string): string {
  const s = name.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  return cutToWord(s, SERVICE_MAX);
}

export function cleanStaffNote(note: string | null | undefined): string {
  let s = (note ?? "")
    .replace(/(?:https?:\/\/|www\.)\S+/giu, " ")
    .replace(/[@#]\S+/gu, " ")
    .replace(/\+?\d(?:[\s\-.()/]*\d){5,}/gu, " ")
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s.,;:–—-]+$/u, "")
    .replace(/^[\s.,;:–—-]+/u, "");
  const first = s.split(" ")[0] ?? "";
  const isAbbr = len(first) >= 2 && first === first.toUpperCase() && first !== first.toLowerCase();
  if (s && !isAbbr) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

/** «21 ноември» (с годината, ако не е текущата), по часа в София. */
export function altDate(at: Date, now: Date = new Date()): string {
  const part = (d: Date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "numeric", day: "numeric" })
        .formatToParts(d)
        .map((x) => [x.type, x.value]),
    ) as Record<string, string>;
  const p = part(at);
  const year = p.year === part(now).year ? "" : ` ${p.year}`;
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]}${year}`;
}

export function buildGalleryAlt(input: {
  serviceName: string;
  note?: string | null;
  /** Датата на часа (или на качването, ако няма час). */
  date: Date;
  /** Описанията, които вече са в галерията (за «, кадър N»). */
  existingAlts?: Iterable<string>;
  now?: Date;
}): string {
  const S = cleanServiceName(input.serviceName);
  const W = cleanStaffNote(input.note);
  const taken = new Set(input.existingAlts ?? []);
  const fit = (suffix: string) => {
    if (!W) return `${S}: готова работа от ${altDate(input.date, input.now)}${suffix}`;
    const room = ALT_MAX - len(`${S}: `) - len(suffix);
    return `${S}: ${cutToWord(W, room)}${suffix}`;
  };
  for (let n = 1; ; n++) {
    const alt = fit(n === 1 ? "" : `, кадър ${n}`);
    if (!taken.has(alt)) return alt;
  }
}
