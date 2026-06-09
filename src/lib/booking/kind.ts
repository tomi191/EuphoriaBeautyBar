/** Категория (slug) → тип изпълнител (kind). Споделя се между booking и staff. */
export const KIND_BY_SLUG: Record<string, string> = {
  "frizorski-uslugi": "hair",
  "frizorski-terapii": "hair",
  "manikyur-i-pedikyur": "nails",
  kozmetika: "cosmetics",
};

export const KIND_LABEL: Record<string, string> = {
  hair: "Коса",
  nails: "Нокти",
  cosmetics: "Лице / Козметика",
};
