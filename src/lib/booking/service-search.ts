/**
 * Търсачката на /zapazi-chas: дума по дума и със синоними (правилата и
 * таблицата са в доклада на Саиф от 22.11.2026, част 5.3 и 5.4).
 *
 * 1. Малки букви, думи без препинателни знаци.
 * 2. Думи и фрази, за които няма услуга (5.4) → нула резултата.
 * 3. Синоними (най-дългата фраза първа) → услугите с това точно име или вид.
 *    Синоним мълчи, ако такава услуга в момента няма.
 * 4. Останалите думи без свързващите и „коса, варна, цена…“; дума, която не се
 *    среща в никоя услуга, се пропуска. Намерена е услугата, чието име, вид или
 *    категория съдържа всяка останала дума.
 */

export interface SearchableService {
  name: string;
  groupTitle: string;
  category: string;
}

const STOP_WORDS = new Set(["на", "за", "с", "и", "в", "от", "коса", "варна", "цена", "цени", "услуга"]);

/** [как го пишат, към кои услуги (точно име или вид)]. Без редовете „потвърди“ и без омбре и шатуш. */
const SYNONYMS: [string[], string[]][] = [
  [["балеаж", "балеяж", "балайаж", "балаж", "баляж", "балиаж", "balayazh", "balayaj", "balayage", "baleazh"], ["Балаяж"]],
  [["боя за коса", "оцветяване"], ["Боядисване"]],
  [["корекция на цвета", "корекция на цвят", "поправяне на цвят"], ["Корекция на цветовете"]],
  [["мелиране", "мелирана коса"], ["Кичури на фолио"]],
  [["ретро преса"], ["Ретро вълни", "Навиване с преса/букли"]],
  [["подстрижка", "стрижка"], ["Дамско подстригване (къса коса)", "Дамско подстригване (дълга коса)", "Мъжко подстригване"]],
  [["дамска подстрижка", "дамска прическа"], ["Дамско подстригване (къса коса)", "Дамско подстригване (дълга коса)"]],
  [["мъжка подстрижка", "мъжка прическа", "прическа за мъже"], ["Мъжко подстригване"]],
  [["брашинг", "изсушаване", "изсушаване с четка"], ["Сешоар (къса коса)", "Сешоар (дълга коса)"]],
  [["сватбена прическа", "абитуриентска прическа", "бална прическа", "вечерна прическа"], ["Официална прическа"]],
  [["плитки", "плетене на коса"], ["Рибена кост плитка", "Обикновена плитка"]],
  [["гримиране", "мейкъп", "мейк ъп", "визаж"], ["Грим"]],
  [["маска за коса", "реконструкция", "възстановяване на коса"], ["Терапии за коса"]],
  [["ламелярна вода", "ламинарна вода"], ["Ламеларна вода"]],
  [["гелак", "гел-лак", "гелаков маникюр"], ["Маникюр с гел лак", "Педикюр с гел лак"]],
  [["маникур", "маникурист"], ["Маникюр"]],
  [["педикур"], ["Педикюр"]],
  [["врастнали нокти", "унибрейс"], ["Скоба за врастнал нокът (Unibrace)"]],
  [["чистка на лице", "чистене на лице", "чисто лице"], ["Почистване на лице"]],
  [["хидрафейшъл", "хидрафейс", "хидро фейшъл"], ["Hydrafacial почистване", "Hydrafacial + карбокси терапия GiGi"]],
  [["микро нидлинг", "микронедлинг"], ["Микронидлинг"]],
  [["депилация", "восъчна депилация", "восък"], ["Кола маска и оформяне на вежди"]],
  [["ламинация на мигли"], ["Ламиниране мигли"]],
  [["ламинация на вежди"], ["Ламиниране вежди"]],
  [["анти ейдж", "антиейджинг", "anti age"], ["Тотален антиейдж GiGi"]],
];

/** Търсят се, но такава услуга няма: показва се текстът за нула резултата. Омбре и шатуш чакат Снежана. */
const NO_SERVICE = [
  "екстеншъни", "удължаване на коса",
  "шатуш", "омбре",
  "тониране", "обливка", "матиране",
  "френски маникюр", "изграждане на нокти", "нарастване на нокти",
  "лазерна епилация",
  "микроблейдинг", "поставяне на мигли",
  "ботокс на лице", "филъри",
];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s,.;:!?"'„“”()/\-–—+]+/)
    .filter(Boolean);
}

const SYNONYM_FORMS = SYNONYMS.flatMap(([forms, targets]) =>
  forms.map((f) => ({ tokens: tokenize(f), targets: targets.map((t) => t.toLowerCase()) })),
).sort((a, b) => b.tokens.length - a.tokens.length);

const NO_SERVICE_FORMS = NO_SERVICE.map(tokenize);

/** Начало на съвпадение на фразата в думите (без вече използваните), иначе -1. */
function findPhrase(tokens: string[], used: boolean[], phrase: string[]): number {
  for (let i = 0; i + phrase.length <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < phrase.length; j++) {
      if (used[i + j] || tokens[i + j] !== phrase[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

export function searchServices<T extends SearchableService>(services: T[], query: string, limit = 8): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  const used = tokens.map(() => false);

  if (NO_SERVICE_FORMS.some((p) => findPhrase(tokens, used, p) >= 0)) return [];

  const hay = (s: T) => `${s.name} ${s.groupTitle} ${s.category}`.toLowerCase();

  // Синоними: най-дългата фраза първа; думите ѝ не минават после през търсенето по думи.
  const synonymTargets = new Set<string>();
  for (const f of SYNONYM_FORMS) {
    const at = findPhrase(tokens, used, f.tokens);
    if (at < 0) continue;
    for (let j = 0; j < f.tokens.length; j++) used[at + j] = true;
    f.targets.forEach((t) => synonymTargets.add(t));
  }
  const synonymHits = services.filter(
    (s) => synonymTargets.has(s.name.toLowerCase()) || synonymTargets.has(s.groupTitle.toLowerCase()),
  );

  const rest = tokens.filter((t, i) => !used[i]);
  const content = rest.filter((t) => !STOP_WORDS.has(t));
  // Дума, която не се среща в никоя услуга (напр. „тъмна“), се пропуска.
  const words = content.filter((w) => services.some((s) => hay(s).includes(w)));
  const matchesWords = (s: T) => words.every((w) => hay(s).includes(w));

  let hits: T[];
  if (synonymHits.length) {
    const narrowed = words.length ? synonymHits.filter(matchesWords) : [];
    hits = narrowed.length ? narrowed : synonymHits;
  } else if (words.length) {
    hits = services.filter(matchesWords);
  } else if (!content.length && !synonymTargets.size && rest.length) {
    // Заявка само от общи думи („коса“): търси цялото написано, както преди.
    hits = services.filter((s) => hay(s).includes(q));
  } else {
    hits = [];
  }

  // Точното име първо, после останалите в реда на каталога.
  const exact = hits.filter((s) => s.name.toLowerCase() === q);
  const others = hits.filter((s) => s.name.toLowerCase() !== q);
  return [...exact, ...others].slice(0, limit);
}
