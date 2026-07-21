/**
 * Парсва потребителски десетичен вход към число. Приема и запетая, и точка
 * („25,50" / „25.50" / „ 25 ") — БГ клавиатурите пишат запетая, която
 * `<input type="number">` мълчаливо изхвърля (badInput → value = ""), затова
 * ценовите полета са text + inputMode="decimal" и минават през този парсер.
 * Връща null при празно/нечислово, за да може формата да покаже грешка на полето.
 */
export function parseDecimalInput(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
