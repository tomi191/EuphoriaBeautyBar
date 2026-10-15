/**
 * Общи правила за времена и цени на услуга (админ каталог + staff PWA). Една точка,
 * за да не дивергират двете форми. Чист модул — без DB/React, лесен за тестване.
 */

export interface ServiceTiming {
  durationMin: number;
  bufferMin: number;
  activeMin: number;
  processingMin: number;
}

/**
 * Връща българско съобщение или null. Защо праговете: windowFor връща null при
 * processingMin <= 10 (PARALLEL_SAFETY_MIN=5 от двете страни), т.е. престой 1..10
 * мълчаливо не прави нищо — по-добре да се откаже на входа.
 */
export function validateServiceTiming(t: ServiceTiming): string | null {
  const { durationMin, bufferMin, activeMin, processingMin } = t;
  const all = [durationMin, bufferMin, activeMin, processingMin];
  if (all.some((n) => !Number.isFinite(n) || !Number.isInteger(n))) return "Минутите се въвеждат на стъпки от 5.";
  // Изчистено поле (Number("") = 0) → ясна подкана, не общо „грешка".
  if (durationMin < 5) return "Въведи минути на стъпки от 5.";
  if (all.some((n) => n % 5 !== 0)) return "Минутите се въвеждат на стъпки от 5.";
  if (durationMin > 600) return "Времетраенето е най-много 600 минути.";
  if (bufferMin < 0 || bufferMin > 120) return "Буферът е между 0 и 120 минути.";
  if (activeMin < 0 || activeMin > 600 || processingMin < 0 || processingMin > 600) {
    return "Активните минути и престоят са между 0 и 600.";
  }
  if (processingMin >= 1 && processingMin <= 10) {
    return "Престой до 10 минути не отваря паралелен час. Сложи 0 или повече от 10.";
  }
  if (activeMin > 0 && processingMin === 0) return "Активни минути се ползват само заедно с престой.";
  if (activeMin + processingMin > durationMin) {
    return `Активни + престой (${activeMin + processingMin} мин) трябва да са най-много колкото времетраенето (${durationMin} мин); остатъкът е за измиване и оформяне.`;
  }
  return null;
}

export const MAX_PRICE = 5000;

export function validatePrice(price: number, priceMax?: number | null): string | null {
  if (!Number.isFinite(price) || price <= 0) return "Въведи цена по-голяма от 0.";
  if (price > MAX_PRICE) return `Цената е най-много ${MAX_PRICE}.`;
  if (priceMax != null) {
    if (!Number.isFinite(priceMax) || priceMax < price) return "Максималната цена не може да е по-малка от цената.";
    if (priceMax > MAX_PRICE) return `Максималната цена е най-много ${MAX_PRICE}.`;
  }
  return null;
}
