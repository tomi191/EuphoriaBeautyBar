/**
 * Готовите предимства на обявата за място под наем («ляво · дясно»), дословно от доклада на Саиф
 * (22.11.2026, част 1). Формата ги показва за избор с отметки; в базата се пазят само ключовете
 * (rental_positions.benefits), затова поправка на текста тук важи и за вече пуснатите обяви.
 * Условията зад всеки ред са в доклада (напр. №11: числото да идва от google_reviews_summary).
 */
export const RENTAL_BENEFITS = [
  { key: "online-booking", left: "Онлайн записване по избор", right: "в сайта" },
  { key: "own-schedule", left: "Личен график", right: "в приложението" },
  { key: "telegram-alerts", left: "Известия за нови часове", right: "в Telegram" },
  { key: "evening-digest", left: "Преглед на утрешния ден", right: "вечер, в Telegram" },
  { key: "own-prices", left: "Свои услуги и цени", right: "в ценоразписа" },
  { key: "own-hours", left: "Свои часове и почивки", right: "в приложението" },
  { key: "client-notes", left: "Клиенти и бележки за тях", right: "в приложението" },
  { key: "revenue", left: "Оборот: ден, седмица, месец", right: "в приложението" },
  { key: "email-reminder", left: "Напомняне до клиента", right: "по имейл" },
  { key: "portfolio", left: "Профил с твои работи", right: "при записването" },
  { key: "google-rating", left: "Салон с оценка 4,8", right: "в Google" },
  { key: "location", left: "Салон в кв. Левски", right: "Варна" },
] as const;

export type RentalBenefit = (typeof RENTAL_BENEFITS)[number];
export type RentalBenefitKey = RentalBenefit["key"];

export const RENTAL_BENEFIT_KEYS = RENTAL_BENEFITS.map((b) => b.key) as [RentalBenefitKey, ...RentalBenefitKey[]];

/** Ключовете от базата → редовете, в реда на списъка горе; непознат ключ отпада. */
export function benefitsFromKeys(keys: readonly string[]): RentalBenefit[] {
  const set = new Set(keys);
  return RENTAL_BENEFITS.filter((b) => set.has(b.key));
}
