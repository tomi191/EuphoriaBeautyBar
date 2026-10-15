/**
 * Детерминистична карта „тема на статия → landing страница". Без LLM, без DB:
 * само ключови думи в slug и заглавие. Ползва се в двете посоки:
 *  - блог статия → „Свързани услуги" (relatedLandings)
 *  - landing страница → „От журнала" (postMatchesLanding)
 *
 * Защо: landing страниците получават линкове само от навигацията/футъра, а статията,
 * която води по „балаяж", сочеше към тях едва 6 пъти (Ahrefs Site Audit 13.10.2026).
 * Slug-овете в блога са латиница, затова всеки модел покрива и кирилица, и транслит.
 */

export interface LandingLink {
  href: string;
  /** Заглавие на landing страницата (като в нейния H1/title, без бранд). */
  title: string;
  /** Една ред причина да кликнеш; само проверими неща. */
  reason: string;
  /** Тествува се върху малки букви на `${slug} ${title}`. */
  pattern: RegExp;
}

export const LANDINGS: LandingLink[] = [
  {
    href: "/uslugi/balayazh-varna",
    title: "Балаяж във Варна",
    reason: "Мек преход при Снежана, с реални цени и онлайн записване.",
    pattern: /балеаж|балаяж|baleazh|balayazh|balayage|balage/,
  },
  {
    href: "/uslugi/kichuri-varna",
    title: "Кичури във Варна",
    reason: "Кичури на фолио и ръчно изсветляване, с цени.",
    pattern: /кичур|kichur/,
  },
  {
    href: "/uslugi/boyadisvane-na-kosa-varna",
    title: "Боядисване на коса във Варна",
    reason: "Боядисване и корекция на цвят, цени по дължина на косата.",
    pattern: /боядис|цвят|(^|[^а-я])боя|тонер|boyadis|cvyat|tsvyat|toner|(^|-)boya(-|$)/,
  },
  {
    href: "/uslugi/frizorski-terapii",
    title: "Фризьорски терапии",
    reason: "Кератин Kerasilk, Nashi Argan и ботокс за коса.",
    pattern: /кератин|изправяне|терапи|keratin|izpravyane|terapi|botoks/,
  },
  {
    href: "/uslugi/frizorski-uslugi",
    title: "Фризьорски услуги във Варна",
    reason: "Подстригване, цвят и прически, ценоразпис с цени „от“.",
    pattern: /подстриг|прическ|podstrig|prichesk/,
  },
  {
    href: "/uslugi/manikyur-i-pedikyur",
    title: "Маникюр и педикюр във Варна",
    reason: "Маникюр с гел лак и педикюр, с цени.",
    pattern: /маникюр|гел лак|педикюр|manikyur|gel-lak|pedikyur/,
  },
  {
    href: "/uslugi/pochistvane-na-litse-varna",
    title: "Почистване на лице във Варна",
    reason: "Козметични терапии за лице според типа кожа.",
    pattern: /лице|почистване|кожа|(^|-)lice(-|$)|pochistvane|kozha/,
  },
];

const DEFAULT_LANDING = LANDINGS.find((l) => l.href === "/uslugi/frizorski-uslugi")!;

interface PostLike {
  slug: string;
  title: string;
}

const haystack = (p: PostLike) => `${p.slug} ${p.title}`.toLowerCase();

/** 1–3 landing страници за статията; ако нищо не съвпадне, хъбът на фризьорските услуги. */
export function relatedLandings(post: PostLike, max = 3): LandingLink[] {
  const h = haystack(post);
  const hits = LANDINGS.filter((l) => l.pattern.test(h)).slice(0, max);
  return hits.length > 0 ? hits : [DEFAULT_LANDING];
}

/** Дали статията е по темата на дадена landing страница (по href). */
export function postMatchesLanding(post: PostLike, href: string): boolean {
  const landing = LANDINGS.find((l) => l.href === href);
  return landing ? landing.pattern.test(haystack(post)) : false;
}
