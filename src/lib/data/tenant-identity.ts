/**
 * Специалист под наем = самостоятелна фирма под марката на салона (думата на собственика,
 * 22.11.2026). Пред клиенти излиза с първо име и снимка САМО при отбелязано писмено съгласие
 * в админа; без съгласие картата казва само с какво се занимава. Снежана (изпълнител, вързан
 * към вход на админ) не е наемател: тя си излиза с името, както досега.
 *
 * Чист модул (без база), за да се тества и да се ползва и от клиентски компоненти.
 */

/** Ред с главни букви в «За нас». */
export const TENANT_ROLE: Record<string, string> = {
  hair: "Коса",
  nails: "Маникюр и педикюр",
  cosmetics: "Козметика и грижа за лице",
};

/** Краткото след точката при записването: «Самостоятелен специалист в салона · …». */
export const TENANT_ROLE_SHORT: Record<string, string> = {
  hair: "коса",
  nails: "маникюр и педикюр",
  cosmetics: "козметика",
};

/** С неразделим интервал: «в» не остава само в края на реда (Bulgarian Cyrillic UX, т. 15). */
export const TENANT_LINE = "Самостоятелен специалист в салона";

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

export interface PublicIdentity {
  /** Първо име (наемател със съгласие) или цялото име (не-наемател); null = без съгласие. */
  name: string | null;
  /** Снимката; null = без съгласие или без снимка. */
  image: string | null;
}

export function publicIdentity(
  r: { name: string; image: string | null },
  opts: { tenant: boolean; consent: boolean },
): PublicIdentity {
  if (!opts.tenant) return { name: r.name, image: r.image };
  if (!opts.consent) return { name: null, image: null };
  return { name: firstName(r.name) || null, image: r.image };
}
