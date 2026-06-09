/**
 * Часова зона helpers за Europe/Sofia — без външни зависимости, DST-safe
 * (базирани на Intl). Всички записи в базата са UTC (timestamptz); тук
 * конвертираме към/от локалното стенно време на салона.
 */
const TZ = "Europe/Sofia";

/** Отместване (минути) на Europe/Sofia спрямо UTC в даден момент. +120 (EET) / +180 (EEST). */
export function sofiaOffsetMinutes(at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(at).map((x) => [x.type, x.value])) as Record<string, string>;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** Локално стенно време (Sofia) → UTC Date. dateStr=YYYY-MM-DD, timeStr=HH:MM */
export function sofiaWallToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const off = sofiaOffsetMinutes(guess);
  return new Date(guess.getTime() - off * 60000);
}

/** weekday в Sofia (0=неделя .. 6=събота) за дата YYYY-MM-DD */
export function sofiaWeekday(dateStr: string): number {
  const noon = sofiaWallToUtc(dateStr, "12:00");
  const short = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}

/** UTC Date → "HH:MM" в Sofia */
export function sofiaTimeLabel(at: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/** UTC Date → "YYYY-MM-DD" в Sofia */
export function sofiaDateStr(at: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return `${p.year}-${p.month}-${p.day}`;
}
