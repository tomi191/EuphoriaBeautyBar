export const siteConfig = {
  name: "Euphoria Hair & Beauty Bar",
  shortName: "Euphoria",
  tagline: "Фризьор, маникюр и козметика в кв. Левски, Варна",
  description:
    "Салон за красота в кв. Левски, Варна. Коса, нокти и лице на едно място. Работим с Montibello, Goldwell и GIGI. Запази час онлайн.",
  // Production живее на www (Vercel прави apex → 308 → www). Canonical, sitemap,
  // OG, schema и robots деривират оттук — трябва да сочат НЕ-redirect-ващия host.
  url: "https://www.euphoriabeauty.eu",
  // OG картите се генерират от opengraph-image.tsx route-овете (per страница).
  // Статичен /og-image.png НЯМА — не го реферирай в metadata.
  locale: "bg_BG",
  founded: 2023,
  founder: "Снежана Саблева",
  address: {
    street: "ул. Петър Райчев 18",
    district: "кв. Левски",
    city: "Варна",
    postalCode: "9000",
    country: "BG",
    countryName: "България",
    full: "гр. Варна, кв. Левски, ул. Петър Райчев 18",
    // GBP pin-ът на салона (съвпада с OSM geocode на адреса) — НЕ приблизителна
    // точка: началната карта и LocalBusiness schema сочат буквално тук.
    coordinates: { lat: 43.2231838, lng: 27.9265649 },
    // Каноничен линк към локацията на салона (Google Maps споделена точка) —
    // ползва се навсякъде, където адресът е кликаем (сайт + имейли).
    mapsUrl: "https://maps.app.goo.gl/zibmA9gPhTDoYjoy5",
  },
  contact: {
    phone: "+359898663315",
    phoneFormatted: "+359 898 66 33 15",
    email: "reception@euphoriabeauty.eu",
    supportEmail: "support@euphoriabeauty.eu",
    viber: "+359898663315",
  },
  // ЕДИНСТВЕНИЯТ източник за работното време: footer, контакти, картата, hero-то,
  // schema.org, llms.txt и ботът четат оттук. `weekdays` е по JS getDay()
  // (0 = неделя) — нужно е, за да смятат hero-то и schema-та машинно, вместо да
  // преписват часовете (одит №7: сайтът обявяваше понеделник 09:00, а Снежана
  // не работи в понеделник и започва в 10:00 — 0 записа за три месеца).
  hours: [
    { day: "Вторник – Петък", short: "Вто-Пет", weekdays: [2, 3, 4, 5], open: "10:00", close: "19:00" },
    { day: "Събота", short: "Съб", weekdays: [6], open: "10:00", close: "17:00" },
    { day: "Неделя и понеделник", short: "Нед, Пон", weekdays: [0, 1], open: "Почивен", close: "" },
  ],
  social: {
    facebook: "https://facebook.com/EuphoriaHairBeautyBar",
    instagram: "https://instagram.com/euphoria.beauty.bar.bg",
    instagramHandle: "@euphoria.beauty.bar.bg",
    viber: "viber://chat?number=%2B359898663315",
  },
  brands: ["Montibello", "Goldwell Kerasilk", "Nashi Argan", "GIGI", "Esthemax", "SAN MARINE", "MESOESTETIC", "GENOSYS"],
} as const;

export type SiteConfig = typeof siteConfig;

export interface NavChild {
  label: string;
  href: string;
  description?: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavChild[];
}

export const navigation: NavItem[] = [
  {
    label: "Услуги",
    href: "/uslugi",
    children: [
      { label: "Фризьорски услуги", href: "/uslugi/frizorski-uslugi", description: "Подстригване, боядисване, балаяж" },
      { label: "Фризьорски терапии", href: "/uslugi/frizorski-terapii", description: "Кератин, хидратация, минерали" },
      { label: "Маникюр и педикюр", href: "/uslugi/manikyur-i-pedikyur", description: "Класика, гел, нокти под форма" },
      { label: "Козметика", href: "/uslugi/kozmetika", description: "Лицеви терапии и грим" },
    ],
  },
  { label: "Галерия", href: "/galeriya" },
  { label: "Montibello", href: "/montibello" },
  { label: "За нас", href: "/za-nas" },
  { label: "Журнал", href: "/blog" },
  { label: "Контакти", href: "/contacts" },
];

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Работното време за даден ден, изведено от `siteConfig.hours`.
 * Денят се смята в часовата зона на салона, не в тази на посетителя — иначе
 * човек в друг часови пояс вижда грешния ден.
 */
export function hoursForDay(date: Date = new Date()): { open: boolean; label: string } {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Sofia", weekday: "short" }).format(date);
  const day = WEEKDAY_INDEX[short] ?? date.getDay();
  const row = siteConfig.hours.find((h) => (h.weekdays as readonly number[]).includes(day));
  if (!row || !row.close) return { open: false, label: "Почивен ден" };
  return { open: true, label: `${row.open} – ${row.close}` };
}

/**
 * Политиката за отказ живее на ЕДНО място. Одит №7 намери три несъвместими
 * версии (24 ч. в ЧЗВ и контактите, 5 ч. във формата и имейла, „пълната стойност"
 * при неявяване срещу 50%), плюс твърдение „само по телефон" при работещ онлайн
 * линк за отказ. Всяко копи чете оттук, вместо да преписва.
 */
export const cancellationPolicy = {
  hours: 5,
  feePercent: 50,
  /** Едно изречение за форма, имейл и ЧЗВ. */
  short: "Отказ или преместване — най-късно 5 часа преди часа, онлайн от линка в имейла или по телефон. При по-късен отказ или неявяване се начисляват 50% от стойността на услугата.",
} as const;
