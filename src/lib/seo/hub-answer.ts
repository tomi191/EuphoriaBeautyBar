import type { ServiceCategory, ServiceItem } from "@/lib/data/services";

/**
 * AEO за хъба /uslugi/frizorski-uslugi: answer-first абзац и FAQ „Колко струва
 * подстригване във Варна?". Цените се четат от каталога при рендер (идват от БД),
 * никога не се пишат на ръка: промяна в админа се отразява веднага.
 */

const fmt = (i: ServiceItem) => `${i.priceFrom ? "от " : ""}${i.price} ${i.currency}`;

/** Всички позиции „подстригване" в категорията, най-евтината първа. */
export function haircutItems(category: ServiceCategory): ServiceItem[] {
  return category.groups
    .flatMap((g) => g.items)
    .filter((i) => /подстригване/i.test(i.name))
    .sort((a, b) => a.price - b.price);
}

/** Answer-first абзац (~50 думи): какво, къде, кой, цена „от", записване. */
export function hubAnswer(category: ServiceCategory): string {
  const cheapest = haircutItems(category)[0];
  const price = cheapest ? ` Подстригване от ${cheapest.price} ${cheapest.currency}.` : "";
  return (
    "Фризьорски салон Euphoria е в кв. Левски, Варна, на ул. Петър Райчев 18. Косата поема Снежана, с над 25 години опит: " +
    "подстригване, боядисване, кичури, балаяж и официални прически." +
    price +
    " Час запазваш онлайн, по телефон или във Viber."
  );
}

/** FAQ с жива цена; null, ако в каталога няма позиция „подстригване" (не измисляме цена). */
export function haircutPriceFaq(category: ServiceCategory): { question: string; answer: string } | null {
  const items = haircutItems(category);
  if (items.length === 0) return null;
  const list = items.map((i) => `${i.name.toLowerCase()}: ${fmt(i)}`).join("; ");
  return {
    question: "Колко струва подстригване във Варна?",
    answer: `В Euphoria подстригването започва от ${items[0].price} ${items[0].currency}. Според вида и дължината на косата: ${list}. Целият ценоразпис е на тази страница, а час запазваш онлайн.`,
  };
}

/** Позициите с кератин в „Фризьорски терапии", най-евтината първа (заявка „кератинова терапия цена"). */
export function keratinItems(category: ServiceCategory): ServiceItem[] {
  return category.groups
    .flatMap((g) => g.items)
    .filter((i) => /кератин/i.test(i.name))
    .sort((a, b) => a.price - b.price);
}

/** FAQ с жива цена за кератин; null без позиция (не измисляме цена). */
export function keratinPriceFaq(category: ServiceCategory): { question: string; answer: string } | null {
  const items = keratinItems(category);
  if (items.length === 0) return null;
  const list = items.map((i) => `${i.name}: ${fmt(i)}`).join("; ");
  return {
    question: "Колко струва кератинова терапия във Варна?",
    answer: `В Euphoria кератиновата терапия започва от ${items[0].price} ${items[0].currency}. Процедурите и цените: ${list}. Кое подхожда на твоята коса, Снежана преценява на консултацията, а час запазваш онлайн.`,
  };
}
