/**
 * Детерминистичен бот-engine (БЕЗ LLM) — виж docs/superpowers/specs/2026-08-30-site-bot-design.md.
 * Чиста функция: никаква I/O, целият контекст идва отвън → 100% тестваема.
 * Принцип: отговаря САМО от живите данни (каталог/FAQ/наем) + siteConfig факти;
 * при непокрит въпрос ескалира честно към телефон/Viber, никога не импровизира.
 */
import { siteConfig } from "@/lib/site";

export interface BotService {
  name: string;
  price: number;
  priceMax?: number;
  priceFrom: boolean;
  currency: string;
  group: string;
  categorySlug: string;
  categoryTitle: string;
}

export interface BotContext {
  services: BotService[];
  faq: { question: string; answer: string }[];
  rentalOpen: boolean;
  positions: { title: string }[];
}

export interface BotLink {
  label: string;
  href: string;
}

export interface BotReply {
  intent: string;
  text: string;
  links?: BotLink[];
  suggestions?: string[];
}

/** Стандартните chips след повечето отговори. */
const MENU: string[] = ["Цени и услуги", "Запази час", "Работно време", "Къде се намирате?", "Работа при вас"];

const BOOK_LINK: BotLink = { label: "Запази час онлайн", href: "/zapazi-chas" };
const PHONE_LINK: BotLink = { label: siteConfig.contact.phoneFormatted, href: `tel:${siteConfig.contact.phone}` };
const VIBER_LINK: BotLink = { label: "Пиши във Viber", href: siteConfig.social.viber };

/** Латиница → кирилица за често изписвани на латиница заявки („manikur", „gel lak"). */
const TRANSLIT: [string, string][] = [
  ["sht", "щ"], ["zh", "ж"], ["ch", "ч"], ["sh", "ш"], ["ts", "ц"], ["yu", "ю"], ["ya", "я"], ["ju", "ю"], ["ja", "я"],
  ["a", "а"], ["b", "б"], ["v", "в"], ["g", "г"], ["d", "д"], ["e", "е"], ["z", "з"], ["i", "и"], ["y", "й"],
  ["k", "к"], ["l", "л"], ["m", "м"], ["n", "н"], ["o", "о"], ["p", "п"], ["r", "р"], ["s", "с"], ["t", "т"],
  ["u", "у"], ["f", "ф"], ["h", "х"], ["c", "ц"], ["w", "в"], ["q", "к"], ["x", "кс"], ["j", "й"],
];

/** Синоними/правописи → каноничната дума от каталога. */
const SYNONYMS: [RegExp, string][] = [
  [/балеаж|балюаж|баляж/g, "балаяж"],
  [/маникюри|маникур/g, "маникюр"],
  [/педикур/g, "педикюр"],
  [/фризи[ое]р|фризйор|фризьорка/g, "фризьор"],
  [/депилация|восъчна епилация/g, "кола маска"],
  [/лице почистване/g, "почистване на лице"],
  [/подстрижка/g, "подстригване"],
];

function normalize(raw: string): string {
  let s = raw.toLowerCase().trim();
  // Транслитерация само ако няма кирилица (иначе не пипаме).
  if (!/[а-я]/.test(s)) {
    for (const [lat, cyr] of TRANSLIT) s = s.replaceAll(lat, cyr);
  }
  s = s.replace(/[^а-яa-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  for (const [re, canon] of SYNONYMS) s = s.replace(re, canon);
  return s;
}

function tokens(s: string): string[] {
  return s.split(" ").filter((t) => t.length > 2);
}

function formatPrice(s: BotService): string {
  const range = s.priceMax && s.priceMax > s.price ? `${s.price}–${s.priceMax} ${s.currency}` : `${s.price} ${s.currency}`;
  return s.priceFrom ? `от ${range}` : range;
}

/** Специализирани страници — при съвпадение линкваме тях, не само хъба. */
const LANDINGS: { re: RegExp; link: BotLink }[] = [
  { re: /балаяж/, link: { label: "Балаяж във Варна: детайли и цени", href: "/uslugi/balayazh-varna" } },
  { re: /боядисван|боя за коса|цвят на коса|корекция/, link: { label: "Боядисване на коса: цени", href: "/uslugi/boyadisvane-na-kosa-varna" } },
  { re: /кичури/, link: { label: "Кичури: цени по дължина", href: "/uslugi/kichuri-varna" } },
  { re: /почистване на лице|хидрафейш|hydrafacial|акне/, link: { label: "Почистване на лице: видове и цени", href: "/uslugi/pochistvane-na-litse-varna" } },
  { re: /кола маска/, link: { label: "Кола маска: цени по зони", href: "/uslugi/kola-maska-varna" } },
  { re: /вежди|мигли|ламиниране/, link: { label: "Вежди и мигли: цени", href: "/uslugi/vezhdi-i-migli-varna" } },
  { re: /медицински педикюр|врастнал/, link: { label: "Медицински педикюр: детайли", href: "/uslugi/manikyur-i-pedikyur/meditsinski-pedikyur" } },
];

function searchServices(q: string, ctx: BotContext): { list: BotService[]; score: number } {
  const qTokens = tokens(q);
  if (qTokens.length === 0) return { list: [], score: 0 };
  const scored = ctx.services.map((s) => {
    const hay = tokens(normalize(`${s.name} ${s.group} ${s.categoryTitle}`));
    let score = 0;
    for (const qt of qTokens) {
      if (hay.includes(qt)) score += 2;
      else if (hay.some((h) => h.startsWith(qt) || qt.startsWith(h))) score += 1;
    }
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.score ?? 0;
  return { list: scored.filter((x) => x.score >= Math.max(2, top - 1)).slice(0, 4).map((x) => x.s), score: top };
}

function matchFaq(q: string, ctx: BotContext): { question: string; answer: string } | null {
  const qTokens = tokens(q);
  let best: { f: { question: string; answer: string }; score: number } | null = null;
  for (const f of ctx.faq) {
    const hay = tokens(normalize(f.question));
    let score = 0;
    for (const qt of qTokens) if (hay.includes(qt)) score += 1;
    if (!best || score > best.score) best = { f, score };
  }
  return best && best.score >= 2 ? best.f : null;
}

const ESCALATION: BotReply = {
  intent: "fallback",
  text: "Не съм сигурен, че разбрах точно. Най-бързо ще ти помогнат на телефона или във Viber. Ако търсиш услуга и цена, напиши я с една-две думи (например „балаяж“ или „педикюр“).",
  links: [PHONE_LINK, VIBER_LINK],
  suggestions: MENU,
};

export function answerQuestion(raw: string, ctx: BotContext): BotReply {
  const q = normalize(raw);
  if (q.length === 0) return ESCALATION;

  // 1. Поздрав (само кратки съобщения — „добър ден, колко струва X" пада надолу).
  if (q.length <= 25 && /(здравей|здрасти|добър ден|добро утро|добър вечер|привет|ало|хей)/.test(q)) {
    return {
      intent: "greeting",
      text: "Здравей! Аз съм асистентът на Euphoria. Мога да ти покажа услуги и цени, да те насоча към записване на час или да отговоря за работно време, адрес и свободни места под наем. Какво те интересува?",
      suggestions: MENU,
    };
  }

  // 2. Работно време (преди „работа", за да не се засичат).
  if (/(работно време|отворен|затворен|кога работ|до колко|от колко часа|неделя|събота|почивен)/.test(q)) {
    const hours = siteConfig.hours
      .map((h) => {
        const day = h.day.replace(" – ", " до ");
        return h.close ? `${day}: ${h.open}–${h.close}` : `${day}: ${h.open.toLowerCase()} ден`;
      })
      .join(" · ");
    return {
      intent: "hours",
      text: `Работното ни време е: ${hours}. Ако искаш конкретен час, най-лесно е да провериш свободните в реално време.`,
      links: [BOOK_LINK],
      suggestions: MENU,
    };
  }

  // 3. Локация / паркинг.
  if (/(къде|адрес|локация|паркинг|паркирам|намира|как да стигна|квартал)/.test(q)) {
    return {
      intent: "location",
      text: `Намираме се на ${siteConfig.address.full}, близо до центъра. В района има улично паркиране; в натоварените часове ела няколко минути по-рано.`,
      links: [
        { label: "Отвори в Google Maps", href: siteConfig.address.mapsUrl },
        BOOK_LINK,
      ],
      suggestions: MENU,
    };
  }

  // 4. Плащане.
  if (/(плаща|плащане|карта|в брой|кеш|револют|revolut|депозит|капаро)/.test(q)) {
    return {
      intent: "payment",
      text: "Плаща се на място в салона: в брой, с карта или през Revolut. Онлайн записването е без депозит, нищо не дължиш предварително.",
      links: [BOOK_LINK],
      suggestions: MENU,
    };
  }

  // 5. Работа / места под наем.
  if (/(работа|кариер|под наем|назнач|свободно място|свободни места|стол под|кабинет|присъединя|екипа ви|търсите ли)/.test(q)) {
    if (ctx.rentalOpen && ctx.positions.length > 0) {
      const list = ctx.positions.map((p) => p.title).join(", ");
      return {
        intent: "careers",
        text: `Работим на модел „място под наем“, със свой график и готова клиентска база. В момента свободни са: ${list}. Детайлите и условията са на страницата за кариери.`,
        links: [{ label: "Виж свободните места", href: "/karieri" }, PHONE_LINK],
        suggestions: MENU,
      };
    }
    return {
      intent: "careers",
      text: "Работим на модел „място под наем“. В момента няма обявени свободни места, но условията и формата за контакт са на страницата за кариери; обявите се появяват първо там.",
      links: [{ label: "Страница Кариери", href: "/karieri" }, PHONE_LINK],
      suggestions: MENU,
    };
  }

  // 6. Човек / контакт.
  if (/(телефон|обади|обаждане|говоря с|човек|вайбер|viber|контакт|имейл|мейл|email)/.test(q)) {
    return {
      intent: "contact",
      text: `На телефона и във Viber отговаря човек от салона: ${siteConfig.contact.phoneFormatted}. Имейлът ни е ${siteConfig.contact.email}.`,
      links: [PHONE_LINK, VIBER_LINK],
      suggestions: MENU,
    };
  }

  // 6б. Menu chip „Цени и услуги" / общ въпрос за услугите → преглед по категории.
  if (/^(цени( и услуги)?|услуги|какво предлагате|всички услуги|ценоразпис)$/.test(q)) {
    return {
      intent: "overview",
      text: "Работим в три направления под един покрив: коса (подстригване, боядисване, кичури, балаяж, терапии), нокти (маникюр, педикюр, медицински педикюр) и козметика (почистване на лице, терапии, кола маска, вежди и мигли). Избери направление за пълния ценоразпис:",
      links: [
        { label: "Фризьорски услуги", href: "/uslugi/frizorski-uslugi" },
        { label: "Маникюр и педикюр", href: "/uslugi/manikyur-i-pedikyur" },
        { label: "Козметика", href: "/uslugi/kozmetika" },
        BOOK_LINK,
      ],
      suggestions: MENU,
    };
  }

  // 7. Търсене на услуга/цена в живия каталог.
  const { list, score } = searchServices(q, ctx);
  const landing = LANDINGS.find((l) => l.re.test(q));
  if (list.length > 0 && score >= 2) {
    // Имената в каталога ползват „—" като разделител; в чат реплика го сменяме с „·".
    const lines = list.map((s) => `• ${s.name.replace(/\s+—\s+/g, " · ")}: ${formatPrice(s)}`).join("\n");
    const links: BotLink[] = [];
    if (landing) links.push(landing.link);
    links.push({ label: "Пълен ценоразпис", href: `/uslugi/${list[0].categorySlug}` }, BOOK_LINK);
    return {
      intent: "service",
      text: `Ето какво намерих в ценоразписа:\n${lines}\nЦените „от" зависят от дължина/обем и се потвърждават на място.`,
      links,
      suggestions: MENU,
    };
  }

  // 8. Booking (след услугите — „запази ми час за маникюр" вече е хванато горе).
  if (/(запаз|запиш|резервац|искам час|свободни час)/.test(q)) {
    return {
      intent: "booking",
      text: "Най-бързо е онлайн: виждаш свободните часове в реално време, избираш услуга и получаваш потвърждение по имейл. Работят и телефонът, и Viber.",
      links: [BOOK_LINK, PHONE_LINK],
      suggestions: MENU,
    };
  }

  // 9. FAQ от базата (админът го поддържа).
  const faqHit = matchFaq(q, ctx);
  if (faqHit) {
    return { intent: "faq", text: faqHit.answer, links: [BOOK_LINK], suggestions: MENU };
  }

  // 10. Ако има landing съвпадение без ценови редове — прати към страницата.
  if (landing) {
    return {
      intent: "landing",
      text: "За това имаме отделна страница с детайли, цени и често задавани въпроси:",
      links: [landing.link, BOOK_LINK],
      suggestions: MENU,
    };
  }

  return ESCALATION;
}
