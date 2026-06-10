export const siteConfig = {
  name: "Euphoria Hair & Beauty Bar",
  shortName: "Euphoria",
  tagline: "Фризьор, маникюр и козметика в кв. Левски, Варна",
  description:
    "Салон за красота в кв. Левски, Варна. Коса, нокти и лице на едно място. Работим с Montibello, Goldwell и GIGI. Запази час онлайн.",
  // Production живее на www (Vercel прави apex → 308 → www). Canonical, sitemap,
  // OG, schema и robots деривират оттук — трябва да сочат НЕ-redirect-ващия host.
  url: "https://www.euphoriabeauty.eu",
  ogImage: "/og-image.png",
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
    coordinates: { lat: 43.215001, lng: 27.913338 },
  },
  contact: {
    phone: "+359898663315",
    phoneFormatted: "+359 898 66 33 15",
    email: "reception@euphoriabeauty.eu",
    supportEmail: "support@euphoriabeauty.eu",
    viber: "+359898663315",
  },
  hours: [
    { day: "Понеделник – Петък", short: "Пон-Пет", open: "09:00", close: "18:00" },
    { day: "Събота", short: "Съб", open: "09:00", close: "17:00" },
    { day: "Неделя", short: "Нед", open: "Почивен", close: "" },
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
